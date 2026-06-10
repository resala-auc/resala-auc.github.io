import { SignJWT, importPKCS8 } from 'https://esm.sh/jose@4.17.0';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS
    }
  });
}

function textResponse(message: string, status = 200) {
  return new Response(message, {
    status,
    headers: CORS_HEADERS
  });
}

function getEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

function parseServiceAccountKey() {
  let raw = getEnv('GOOGLE_SERVICE_ACCOUNT_KEY').trim();
  if (!raw.startsWith('{')) {
    try {
      raw = atob(raw);
    } catch (_err) {
      throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_KEY: must be JSON or base64-encoded JSON');
    }
  }
  try {
    return JSON.parse(raw);
  } catch (_err) {
    throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_KEY JSON');
  }
}

function validatePayload(body: any) {
  const errors: string[] = [];
  const required = ['fullName', 'aucId', 'email', 'phone', 'major', 'year', 'position', 'whyJoin', 'roleFit', 'commitment', 'hours'];

  for (const field of required) {
    if (!body[field] || (typeof body[field] === 'string' && body[field].trim() === '')) {
      errors.push(`${field} is required`);
    }
  }

  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    errors.push('Invalid email format');
  }
  if (body.phone && !/^01\d{9}$/.test(body.phone)) {
    errors.push('Invalid phone format. Use 01xxxxxxxxx');
  }
  if (body.aucId && !/^9\d{6,9}$/.test(body.aucId)) {
    errors.push('Invalid AUC ID. Should start with 9 and be 7-10 digits');
  }
  if (body.fullName && body.fullName.length > 100) {
    errors.push('Full Name too long');
  }
  if (body.whyJoin && body.whyJoin.length > 2000) {
    errors.push('Why Join text too long');
  }
  if (body.experience && body.experience.length > 2000) {
    errors.push('Previous Experience text too long');
  }

  return errors;
}

async function getAccessToken(credentials: { client_email: string; private_key: string; }) {
  const key = await importPKCS8(credentials.private_key, 'RS256');
  const jwt = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/spreadsheets',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(credentials.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);

  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!tokenResp.ok) {
    const text = await tokenResp.text();
    throw new Error(`Google token error: ${tokenResp.status} ${text}`);
  }

  const json = await tokenResp.json();
  if (!json.access_token) {
    throw new Error('Missing Google access_token in token response');
  }

  return json.access_token;
}

async function sheetsRequest(spreadsheetId: string, token: string, path: string, method = 'GET', body?: any) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/${path}`;
  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  if (body !== undefined) options.body = JSON.stringify(body);

  const resp = await fetch(url, options);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Sheets API error ${resp.status}: ${text}`);
  }
  return resp.json();
}

async function getSheetValues(spreadsheetId: string, token: string, range: string) {
  const params = new URLSearchParams({ valueRenderOption: 'FORMATTED_VALUE' });
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?${params}`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Sheets API error ${resp.status}: ${text}`);
  }
  return resp.json();
}

async function ensureHeaders(spreadsheetId: string, token: string, headers: string[]) {
  const result = await getSheetValues(spreadsheetId, token, 'A1:1').catch(() => ({ values: [] }));
  const existing = (result.values && result.values[0]) || [];
  if (existing.length === 0) {
    await sheetsRequest(spreadsheetId, token, 'values/A1:1?valueInputOption=RAW', 'PUT', { values: [headers] });
  }
}

async function findDuplicate(spreadsheetId: string, token: string, columnName: string, value: string) {
  const result = await getSheetValues(spreadsheetId, token, 'A1:Z1000').catch(() => ({ values: [] }));
  const rows: string[][] = result.values || [];
  if (!rows.length) return false;
  const headers = rows[0].map((h: string) => h.toString().trim().toLowerCase());
  const index = headers.indexOf(columnName.toLowerCase());
  if (index === -1) return false;

  const normalizedSearch = value.toString().trim().toLowerCase();
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][index] || '').toString().trim().toLowerCase() === normalizedSearch) return true;
  }
  return false;
}

async function appendRow(spreadsheetId: string, token: string, values: Array<string | number>) {
  await sheetsRequest(spreadsheetId, token, 'values/A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS', 'POST', {
    values: [values]
  });
}

export default async function handler(request: Request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== 'POST') {
    return textResponse('Method Not Allowed', 405);
  }

  let body: any;
  try {
    body = await request.json();
  } catch (_err) {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  if (!body || Object.keys(body).length === 0) {
    return jsonResponse({ error: 'Empty submission' }, 400);
  }

  const validationErrors = validatePayload(body);
  if (validationErrors.length > 0) {
    return jsonResponse({ error: validationErrors.join('; ') }, 400);
  }

  const sheetId = getEnv('SHEET_ID');
  const credentials = parseServiceAccountKey();
  const token = await getAccessToken(credentials);

  const headers = [
    'Timestamp',
    'Full Name',
    'AUC ID',
    'Email',
    'Phone Number',
    'Academic Year',
    'Major',
    'Selected Position',
    'Why Join Resala',
    'Previous Experience',
    'Availability',
    'Submission Status'
  ];

  await ensureHeaders(sheetId, token, headers);

  const duplicateByAuc = await findDuplicate(sheetId, token, 'AUC ID', body.aucId || '');
  const duplicateByEmail = await findDuplicate(sheetId, token, 'Email', body.email || '');
  if (duplicateByAuc || duplicateByEmail) {
    return jsonResponse({ error: 'You have already submitted an application.' }, 409);
  }

  const availability = `Hours/week: ${body.hours || ''}${body.interviewTime ? `; Interview: ${body.interviewTime}` : ''}`;
  const previousExperience = [body.roleFit, body.experience].filter(Boolean).join('\n\n');

  const row = [
    new Date().toISOString(),
    body.fullName || '',
    body.aucId || '',
    body.email || '',
    body.phone || '',
    body.year || '',
    body.major || '',
    body.position || '',
    body.whyJoin || '',
    previousExperience,
    availability,
    'Pending'
  ];

  await appendRow(sheetId, token, row);
  return jsonResponse({ status: 'success' }, 200);
}
