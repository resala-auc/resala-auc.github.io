const SHEET_ID = Deno.env.get("SHEET_ID") ?? "";
const SHEET_NAME = Deno.env.get("SHEET_NAME") ?? "Applications";
const SLOT_SHEET_NAME = Deno.env.get("SLOT_SHEET_NAME") ?? "Interview Slots";
const RESERVATION_SHEET_NAME = Deno.env.get("RESERVATION_SHEET_NAME") ?? "Interview Reservations";
const GOOGLE_SERVICE_ACCOUNT_KEY = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY") ?? "";
const GOOGLE_CLIENT_EMAIL = Deno.env.get("GOOGLE_CLIENT_EMAIL") ?? "";
const GOOGLE_PRIVATE_KEY = Deno.env.get("GOOGLE_PRIVATE_KEY") ?? "";
const GMAIL_CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID") ?? "";
const GMAIL_CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET") ?? "";
const GMAIL_REFRESH_TOKEN = Deno.env.get("GMAIL_REFRESH_TOKEN") ?? "";
const GMAIL_SENDER_EMAIL = Deno.env.get("GMAIL_SENDER_EMAIL") ?? "";
const GMAIL_SENDER_NAME = Deno.env.get("GMAIL_SENDER_NAME") ?? "Resala AUC";
const EMAIL_LOGO_URL =
  Deno.env.get("EMAIL_LOGO_URL") ?? "https://upnmxdgqdkvgzfwqaicb.supabase.co/storage/v1/object/public/resala-logo/Resala%20Logo%20-%20source.png";
const CALENDAR_ID = Deno.env.get("CALENDAR_ID") ?? GMAIL_SENDER_EMAIL;
const CALENDAR_TIME_ZONE = Deno.env.get("CALENDAR_TIME_ZONE") ?? "Africa/Cairo";

const HEADERS = [
  "Timestamp",
  "Full Name",
  "AUC Email",
  "Student ID",
  "Major",
  "Year / Level",
  "Phone",
  "Role Applied For",
  "Role Step Title",
  "Role Description",
  "Why This Role",
  "Why Choose Yourself",
  "Hope To Learn",
  "Previous Resala Experience",
  "Interview Slot",
  "Created At",
  "Status"
];

const SLOT_HEADERS = [
  "Slot ID",
  "Date",
  "Start Time",
  "End Time",
  "Slot Label",
  "Capacity",
  "Active",
  "Calendar Event ID",
  "Meet Link"
];
const RESERVATION_HEADERS = [
  "Timestamp",
  "Slot ID",
  "Slot Label",
  "Full Name",
  "AUC Email",
  "Student ID",
  "Calendar Event ID",
  "Meet Link",
  "Interview Status",
  "Reminder Send At",
  "Reminder Sent At",
  "Reminder Status"
];
const RECRUITMENT_START_DATE = "2026-06-22";
const RECRUITMENT_END_DATE = "2026-07-15";
const DAILY_SLOT_TIMES = [
  { code: "1500", startTime: "3:00 PM", endTime: "3:30 PM" },
  { code: "1530", startTime: "3:30 PM", endTime: "4:00 PM" },
  { code: "1900", startTime: "7:00 PM", endTime: "7:30 PM" },
  { code: "1930", startTime: "7:30 PM", endTime: "8:00 PM" },
  { code: "2000", startTime: "8:00 PM", endTime: "8:30 PM" },
  { code: "2030", startTime: "8:30 PM", endTime: "9:00 PM" }
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400"
};

type ApplicationPayload = {
  timestamp: string;
  fullName: string;
  aucEmail: string;
  studentId: string;
  major: string;
  yearLevel: string;
  phone: string;
  roleAppliedFor: string;
  roleStepTitle: string;
  roleDescription: string;
  whyThisRole: string;
  whyChooseYourself: string;
  hopeToLearn?: string;
  previousResalaExperience?: string;
  interviewSlot: string;
  interviewSlotId?: string;
  interviewSlotLabel?: string;
  createdAt: string;
};

type ConfirmationEmailTemplate = {
  subject: string;
  body: string;
  html: string;
};

type InterviewSlotOption = {
  id: string;
  label: string;
  date: string;
  startTime: string;
  endTime: string;
  startDateTime: string;
  endDateTime: string;
  capacity: number;
  active: boolean;
  reservedCount: number;
  remaining: number;
  full: boolean;
  calendarEventId?: string;
  meetLink?: string;
  rowIndex?: number;
};

type ReservationDetails = {
  slot: InterviewSlotOption;
  calendarEventId: string;
  meetLink: string;
};

let resolvedSheetName: string | null = null;
let resolvedSheetTitles: Set<string> | null = null;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method === "GET") {
    try {
      if (!SHEET_ID) {
        throw new Error("SHEET_ID is not configured.");
      }

      const token = await getGoogleAccessToken();
      const slots = await getInterviewSlots(token);
      return jsonResponse({ ok: true, slots });
    } catch (error) {
      return jsonResponse(
        {
          ok: false,
          error: error instanceof Error ? error.message : "Could not load interview slots."
        },
        400
      );
    }
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
  }

  try {
    const payload = await parsePayload(request);
    validateApplication(payload);

    if (!SHEET_ID) {
      throw new Error("SHEET_ID is not configured.");
    }

    const token = await getGoogleAccessToken();
    const sheetName = await getSheetName(token);
    await ensureSlotSheets(token);
    await ensureHeaders(token, sheetName);
    await ensureNotDuplicate(token, payload, sheetName);
    const reservation = await reserveInterviewSlot(token, payload);
    payload.interviewSlot = reservation.slot.label;
    payload.interviewSlotLabel = reservation.slot.label;
    await appendApplication(token, payload, sheetName);
    const emailSent = await trySendConfirmationEmail(payload, reservation);

    return jsonResponse({ ok: true, emailSent });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Submission failed."
      },
      400
    );
  }
});

async function parsePayload(request: Request): Promise<ApplicationPayload> {
  const text = await request.text();
  if (!text.trim()) {
    throw new Error("Missing submission body.");
  }

  return JSON.parse(text) as ApplicationPayload;
}

function validateApplication(payload: ApplicationPayload): void {
  const requiredFields: Array<keyof ApplicationPayload> = [
    "timestamp",
    "fullName",
    "aucEmail",
    "studentId",
    "major",
    "yearLevel",
    "phone",
    "roleAppliedFor",
    "roleStepTitle",
    "roleDescription",
    "whyThisRole",
    "whyChooseYourself",
    "interviewSlot",
    "createdAt"
  ];

  const missing = requiredFields.filter((field) => !String(payload[field] ?? "").trim());
  if (missing.length) {
    throw new Error(`Missing required fields: ${missing.join(", ")}.`);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.aucEmail)) {
    throw new Error("Invalid AUC email.");
  }

  if (!String(payload.interviewSlotId ?? "").trim()) {
    throw new Error("Missing required fields: interviewSlotId.");
  }
}

async function ensureHeaders(token: string, sheetName: string): Promise<void> {
  const response = await sheetsFetch(token, "GET", `${sheetRange(sheetName, "A1:Q1")}`);
  const currentValues = (await response.json()).values?.[0] ?? [];

  if (currentValues.length === 0) {
    await sheetsFetch(token, "PUT", `${sheetRange(sheetName, "A1:Q1")}?valueInputOption=RAW`, {
      values: [HEADERS]
    });
    return;
  }

  const headersMatch = HEADERS.every((header, index) => currentValues[index] === header);
  if (!headersMatch) {
    throw new Error("Applications sheet headers do not match the expected schema.");
  }
}

async function ensureNotDuplicate(token: string, payload: ApplicationPayload, sheetName: string): Promise<void> {
  const response = await sheetsFetch(token, "GET", sheetRange(sheetName, "A2:Q"));
  const rows = (await response.json()).values ?? [];
  const submittedEmail = normalize(payload.aucEmail);
  const submittedStudentId = normalize(payload.studentId);

  const duplicate = rows.some((row: string[]) => {
    const email = normalize(row[2]);
    const studentId = normalize(row[3]);
    return email === submittedEmail || studentId === submittedStudentId;
  });

  if (duplicate) {
    throw new Error("An application with this AUC email or Student ID already exists.");
  }
}

async function appendApplication(token: string, payload: ApplicationPayload, sheetName: string): Promise<void> {
  await sheetsFetch(token, "POST", `${sheetRange(sheetName, "A:Q")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    values: [
      [
        payload.timestamp,
        payload.fullName,
        payload.aucEmail,
        payload.studentId,
        payload.major,
        payload.yearLevel,
        payload.phone,
        payload.roleAppliedFor,
        payload.roleStepTitle,
        payload.roleDescription,
        payload.whyThisRole,
        payload.whyChooseYourself,
        payload.hopeToLearn ?? "",
        payload.previousResalaExperience ?? "",
        payload.interviewSlot,
        payload.createdAt,
        "Pending"
      ]
    ]
  });
}

async function sendConfirmationEmail(payload: ApplicationPayload, reservation: ReservationDetails): Promise<void> {
  if (!gmailConfigured()) {
    return;
  }

  const template = buildConfirmationEmailTemplate(payload, reservation);
  const accessToken = await getGmailAccessToken();
  const rawMessage = buildRawEmailMessage({
    from: `${GMAIL_SENDER_NAME} <${GMAIL_SENDER_EMAIL}>`,
    to: payload.aucEmail,
    subject: template.subject,
    text: template.body,
    html: template.html
  });

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      raw: rawMessage
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail send failed: ${errorText}`);
  }
}

async function trySendConfirmationEmail(payload: ApplicationPayload, reservation: ReservationDetails): Promise<boolean> {
  try {
    await sendConfirmationEmail(payload, reservation);
    return gmailConfigured();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Confirmation email failed.");
    return false;
  }
}

function gmailConfigured(): boolean {
  return Boolean(GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN && GMAIL_SENDER_EMAIL);
}

function buildConfirmationEmailTemplate(payload: ApplicationPayload, reservation: ReservationDetails): ConfirmationEmailTemplate {
  const rolePrep = getRolePrepLines(payload.roleAppliedFor);
  const slot = payload.interviewSlotLabel ?? payload.interviewSlot;
  const prepLine = rolePrep[0]?.replace(/^- /, "") ?? "One practical idea for how you would help the team move the work forward.";
  const subject = `Resala AUC: your ${payload.roleAppliedFor} application was received`;
  const body = [
    `Hi ${payload.fullName},`,
    "",
    `Thanks for applying to Resala AUC for ${payload.roleAppliedFor}.`,
    "",
    `Your interview slot is: ${slot}.`,
    `Google Meet link: ${reservation.meetLink}`,
    "You will receive a Google Calendar invitation and a reminder email before the interview.",
    "",
    "Please prepare one simple idea for the role:",
    "",
    ...rolePrep,
    "",
    "Keep it simple. We are not looking for a polished pitch.",
    "If anything feels unclear, just reply to this email and we will help.",
    "",
    "Best,",
    "Resala AUC"
  ].join("\n");

  return {
    subject,
    body,
    html: buildConfirmationEmailHtml({
      fullName: payload.fullName,
      roleAppliedFor: payload.roleAppliedFor,
      slot,
      prepLine,
      meetLink: reservation.meetLink
    })
  };
}

function buildConfirmationEmailHtml({
  fullName,
  roleAppliedFor,
  slot,
  prepLine,
  meetLink
}: {
  fullName: string;
  roleAppliedFor: string;
  slot: string;
  prepLine: string;
  meetLink: string;
}): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f3ea;color:#172033;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your Resala AUC interview slot is reserved.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f7f3ea;margin:0;padding:24px 0;">
      <tr>
        <td align="center" style="padding:0 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border:1px solid #eadfca;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="background:#0d2b45;padding:24px 28px 30px;text-align:center;color:#ffffff;">
                <img src="${escapeHtml(EMAIL_LOGO_URL)}" alt="Resala AUC" width="128" style="display:block;width:128px;max-width:128px;height:auto;border:0;outline:none;text-decoration:none;margin:0 auto;">
                <div style="font-size:25px;line-height:1.15;color:#ffffff;font-weight:bold;margin-top:14px;">Beyond Ana Maly</div>
                <div style="font-size:14px;line-height:1.5;color:#f5c46b;margin-top:6px;font-weight:bold;letter-spacing:0.5px;">Build the First Step</div>
                <div style="font-size:28px;line-height:1.15;color:#ffffff;font-weight:bold;margin-top:22px;">Your Interview Slot Is Reserved</div>
                <div style="font-size:15px;line-height:1.5;color:#dbe7ef;margin-top:10px;">Thanks for applying. Here is everything you need before the interview.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 28px 8px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi ${escapeHtml(fullName)},</p>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Thanks for applying to <strong>Resala AUC</strong> for <strong>${escapeHtml(roleAppliedFor)}</strong>. We received your application and reserved your interview slot.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;">
                  <tr>
                    <td style="background:#fff7e8;border:1px solid #f0d7a5;border-left:5px solid #f5a623;border-radius:14px;padding:18px;">
                      <div style="font-size:13px;color:#8a4706;text-transform:uppercase;letter-spacing:1px;font-weight:bold;margin-bottom:7px;">Your interview slot</div>
                      <div style="font-size:22px;line-height:1.3;font-weight:bold;color:#0d2b45;">${escapeHtml(slot)}</div>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;">
                  <tr>
                    <td style="background:#f8fafc;border:1px solid #e6edf2;border-radius:14px;padding:16px;">
                      <div style="font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:bold;margin-bottom:8px;">Google Meet</div>
                      <a href="${escapeHtml(meetLink)}" style="color:#0d2b45;font-size:16px;font-weight:bold;text-decoration:underline;">Join the interview meeting</a>
                      <div style="font-size:14px;line-height:1.55;color:#4b5563;margin-top:8px;">You will receive a Google Calendar invitation and a reminder email before the interview.</div>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:4px 0 22px;">
                  <tr>
                    <td style="background:#0d2b45;border-radius:14px;padding:16px 18px;color:#ffffff;">
                      <div style="font-size:14px;color:#f5c46b;font-weight:bold;letter-spacing:.8px;text-transform:uppercase;">Before the interview</div>
                      <div style="font-size:15px;line-height:1.7;color:#ffffff;margin-top:8px;">${escapeHtml(prepLine)}</div>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#4b5563;">Keep it simple. We are not looking for a polished pitch.</p>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#4b5563;">If anything feels unclear, just reply to this email and we will help.</p>
                <p style="margin:0 0 4px;font-size:16px;line-height:1.6;color:#172033;font-weight:bold;">Be the first step toward someone's better life.</p>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Best,<br>Resala AUC</p>
              </td>
            </tr>
            <tr>
              <td style="background:#f3efe5;padding:16px 28px;text-align:center;border-top:1px solid #eadfca;">
                <div style="font-size:12px;line-height:1.5;color:#667085;">Resala AUC · Build the First Step</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function getRolePrepLines(roleName: string): string[] {
  const role = normalizeRole(roleName);

  switch (role) {
    case "treasurer":
      return [
        "- A simple way you would keep track of bills, reimbursements, and communication with the team."
      ];
    case "tech director":
      return [
        "- One small system idea that could make a club process easier, and how you would implement it."
      ];
    case "branding media":
      return [
        "- A short plan for reaching 5k followers through consistent content."
      ];
    case "pr fundraising":
      return [
        "- A short plan for reaching sponsors for Ramadan packs."
      ];
    case "hr":
      return [
        "- A simple plan for keeping people engaged through events, retreats, or check-ins."
      ];
    case "operations":
      return [
        "- A simple plan for managing logistics, setup, and tracking during an event."
      ];
    case "visits":
      return [
        "- A proposal for a one-day program that can be implemented in different orphanages or Dar Mosneen."
      ];
    case "children day director":
      return [
        "- A proposal for the outcome underprivileged children need based on what you know about them."
      ];
    case "mothers day director":
      return [
        "- A plan for keeping mothers aware of what children learn and helping them believe children can change."
      ];
    case "initiatives director":
      return [
        "- An initiative that supports visually impaired people across campus and makes daily life easier."
      ];
    default:
      return [
        "- One practical idea for how you would help the team move the work forward."
      ];
  }
}

async function getGmailAccessToken(): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: GMAIL_REFRESH_TOKEN,
      grant_type: "refresh_token"
    })
  });

  const body = await response.json();
  if (!response.ok || !body.access_token) {
    throw new Error(`Gmail token refresh failed: ${JSON.stringify(body)}`);
  }

  return body.access_token;
}

function buildRawEmailMessage({
  from,
  to,
  subject,
  text,
  html
}: {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}): string {
  const boundary = `resala-${crypto.randomUUID()}`;
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "MIME-Version: 1.0",
    `Subject: ${subject}`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    text,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "",
    html,
    "",
    `--${boundary}--`
  ].join("\r\n");

  return base64UrlEncode(message);
}

async function getSheetName(token: string): Promise<string> {
  if (resolvedSheetName) return resolvedSheetName;

  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=sheets.properties.title`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Sheets metadata request failed: ${errorText}`);
  }

  const body = await response.json();
  const title = body?.sheets?.[0]?.properties?.title;

  if (typeof title !== "string" || !title.trim()) {
    throw new Error("Could not determine the active sheet tab name.");
  }

  resolvedSheetName = title.trim();
  return resolvedSheetName;
}

async function getSpreadsheetSheetTitles(token: string): Promise<Set<string>> {
  if (resolvedSheetTitles) return resolvedSheetTitles;

  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=sheets.properties.title`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Sheets metadata request failed: ${errorText}`);
  }

  const body = await response.json();
  const titles = new Set<string>();

  for (const sheet of body?.sheets ?? []) {
    const title = sheet?.properties?.title;
    if (typeof title === "string" && title.trim()) {
      titles.add(title.trim());
    }
  }

  resolvedSheetTitles = titles;
  return resolvedSheetTitles;
}

async function ensureSlotSheets(token: string): Promise<void> {
  await ensureSheetTab(token, SLOT_SHEET_NAME);
  await ensureSheetTab(token, RESERVATION_SHEET_NAME);
  await ensureSheetSeed(
    token,
    SLOT_SHEET_NAME,
    SLOT_HEADERS,
    buildRecruitmentSlotRows()
  );
  await ensureSheetHeaders(token, RESERVATION_SHEET_NAME, RESERVATION_HEADERS);
}

async function ensureSheetTab(token: string, tabName: string): Promise<void> {
  const titles = await getSpreadsheetSheetTitles(token);
  if (titles.has(tabName)) return;

  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: {
              title: tabName
            }
          }
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (!String(errorText).includes("already exists")) {
      throw new Error(`Could not create sheet tab ${tabName}: ${errorText}`);
    }
  }

  titles.add(tabName);
}

async function ensureSheetHeaders(token: string, sheetName: string, headers: string[]): Promise<void> {
  const width = headers.length;
  const range = `${sheetRange(sheetName, `A1:${columnLetter(width)}1`)}`;
  const response = await sheetsFetch(token, "GET", range);
  const currentValues = (await response.json()).values?.[0] ?? [];

  if (currentValues.length === 0) {
    await sheetsFetch(token, "PUT", `${sheetRange(sheetName, `A1:${columnLetter(width)}1`)}?valueInputOption=RAW`, {
      values: [headers]
    });
    return;
  }

  const headersMatch = headers.every((header, index) => currentValues[index] === header);
  if (!headersMatch) {
    await sheetsFetch(token, "PUT", `${sheetRange(sheetName, `A1:${columnLetter(width)}1`)}?valueInputOption=RAW`, {
      values: [headers]
    });
  }
}

async function ensureSheetSeed(
  token: string,
  sheetName: string,
  headers: string[],
  rows: Array<Array<string | number | boolean>>
): Promise<void> {
  await ensureSheetHeaders(token, sheetName, headers);
  const response = await sheetsFetch(token, "GET", `${sheetRange(sheetName, "A2:Z")}`);
  const existingRows = (await response.json()).values ?? [];

  if (existingRows.length === 0 || shouldResetSlotRows(sheetName, existingRows)) {
    if (existingRows.length > 0) {
      await sheetsFetch(token, "POST", `${sheetRange(sheetName, "A2:Z")}:clear`, {});
    }

    await sheetsFetch(token, "POST", `${sheetRange(sheetName, "A:Z")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      values: rows
    });
  }
}

function shouldResetSlotRows(sheetName: string, rows: string[][]): boolean {
  if (sheetName !== SLOT_SHEET_NAME) return false;
  if (!rows.length) return false;

  const hasDatedRows = rows.some((row) => /^\d{4}-\d{2}-\d{2}$/.test(String(row[1] ?? "").trim()));

  if (hasDatedRows) {
    return false;
  }

  return rows.every((row) => {
    const date = String(row[1] ?? "").trim();
    const startTime = String(row[2] ?? "").trim();
    return !date && Boolean(startTime);
  });
}

function buildRecruitmentSlotRows(): Array<Array<string | number>> {
  const rows: Array<Array<string | number>> = [];
  const startDate = parseDateOnly(RECRUITMENT_START_DATE);
  const endDate = parseDateOnly(RECRUITMENT_END_DATE);

  if (!startDate || !endDate) {
    throw new Error("Recruitment slot date range is invalid.");
  }

  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    const dateString = formatDateOnly(date);

    for (const slot of DAILY_SLOT_TIMES) {
      rows.push([
        `slot-${dateString}-${slot.code}`,
        dateString,
        slot.startTime,
        slot.endTime,
        `${dateString} at ${slot.startTime}`,
        1,
        "TRUE",
        "",
        ""
      ]);
    }
  }

  return rows;
}

async function getInterviewSlots(token: string): Promise<InterviewSlotOption[]> {
  await ensureSlotSheets(token);

  const slotResponse = await sheetsFetch(token, "GET", `${sheetRange(SLOT_SHEET_NAME, "A2:I")}`);
  const slotRows = (await slotResponse.json()).values ?? [];

  const reservationResponse = await sheetsFetch(token, "GET", `${sheetRange(RESERVATION_SHEET_NAME, "A2:L")}`);
  const reservationRows = (await reservationResponse.json()).values ?? [];
  const reservedCounts = new Map<string, number>();

  for (const row of reservationRows) {
    const slotId = normalize(row[1]);
    if (!slotId) continue;
    reservedCounts.set(slotId, (reservedCounts.get(slotId) ?? 0) + 1);
  }

  return slotRows
    .map((row: string[], index: number) => {
      const id = String(row[0] ?? "").trim();
      const date = String(row[1] ?? "").trim();
      const startTime = String(row[2] ?? "").trim();
      const endTime = String(row[3] ?? "").trim() || addMinutesToTime(startTime, 30);
      const label = String(row[4] ?? "").trim() || buildSlotLabel(date, startTime);
      const capacity = Number(row[5] ?? 1) || 1;
      const active = String(row[6] ?? "TRUE").toLowerCase() !== "false";
      const calendarEventId = String(row[7] ?? "").trim();
      const meetLink = String(row[8] ?? "").trim();
      const reservedCount = reservedCounts.get(normalize(id)) ?? 0;
      const remaining = Math.max(capacity - reservedCount, 0);
      const startDateTime = buildLocalDateTime(date, startTime);
      const endDateTime = buildLocalDateTime(date, endTime);
      const past = isPastLocalDateTime(startDateTime, CALENDAR_TIME_ZONE);

      return {
        id,
        label,
        date,
        startTime,
        endTime,
        startDateTime,
        endDateTime,
        capacity,
        active,
        reservedCount,
        remaining,
        full: !active || !date || !startTime || !startDateTime || !endDateTime || past || remaining <= 0,
        calendarEventId,
        meetLink,
        rowIndex: index + 2
      };
    })
    .filter((slot) => slot.active)
    .sort((a, b) => (a.startDateTime || a.label).localeCompare(b.startDateTime || b.label));
}

async function reserveInterviewSlot(token: string, payload: ApplicationPayload): Promise<ReservationDetails> {
  const slots = await getInterviewSlots(token);
  const selected = slots.find((slot) => slot.id === payload.interviewSlotId);

  if (!selected) {
    throw new Error("Selected interview slot is not available.");
  }

  if (selected.full) {
    throw new Error("That interview slot is already full. Please choose another slot.");
  }

  const calendarToken = await getGmailAccessToken();
  const calendarEvent = await createCalendarEvent(calendarToken, payload, selected);
  await updateSlotCalendarFields(token, selected, calendarEvent);

  await sheetsFetch(token, "POST", `${sheetRange(RESERVATION_SHEET_NAME, "A:L")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    values: [
      [
        payload.timestamp,
        selected.id,
        selected.label,
        payload.fullName,
        payload.aucEmail,
        payload.studentId,
        calendarEvent.calendarEventId,
        calendarEvent.meetLink,
        "Not Done",
        subtractMinutesFromLocalDateTime(selected.startDateTime, 30),
        "",
        "Pending"
      ]
    ]
  });

  return {
    slot: selected,
    calendarEventId: calendarEvent.calendarEventId,
    meetLink: calendarEvent.meetLink
  };
}

async function createCalendarEvent(
  token: string,
  payload: ApplicationPayload,
  slot: InterviewSlotOption
): Promise<{ calendarEventId: string; meetLink: string }> {
  if (!CALENDAR_ID) {
    throw new Error("CALENDAR_ID is not configured.");
  }

  const requestId = `resala-${payload.studentId}-${Date.now()}`.replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 100);
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        summary: `Resala AUC Interview - ${payload.fullName}`,
        description: [
          `Applicant: ${payload.fullName}`,
          `Role: ${payload.roleAppliedFor}`,
          `AUC Email: ${payload.aucEmail}`,
          `Student ID: ${payload.studentId}`
        ].join("\n"),
        start: {
          dateTime: slot.startDateTime,
          timeZone: CALENDAR_TIME_ZONE
        },
        end: {
          dateTime: slot.endDateTime,
          timeZone: CALENDAR_TIME_ZONE
        },
        attendees: [
          {
            email: payload.aucEmail,
            displayName: payload.fullName
          }
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 30 },
            { method: "popup", minutes: 30 }
          ]
        },
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: {
              type: "hangoutsMeet"
            }
          }
        }
      })
    }
  );

  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Google Calendar event creation failed: ${JSON.stringify(body)}`);
  }

  const meetLink =
    body.hangoutLink ??
    body.conferenceData?.entryPoints?.find((entryPoint: { entryPointType?: string; uri?: string }) => entryPoint.entryPointType === "video")
      ?.uri ??
    "";

  if (!body.id || !meetLink) {
    throw new Error("Google Calendar did not return a Meet link.");
  }

  return {
    calendarEventId: body.id,
    meetLink
  };
}

async function updateSlotCalendarFields(
  token: string,
  slot: InterviewSlotOption,
  calendarEvent: { calendarEventId: string; meetLink: string }
): Promise<void> {
  if (!slot.rowIndex) return;

  await sheetsFetch(token, "PUT", `${sheetRange(SLOT_SHEET_NAME, `H${slot.rowIndex}:I${slot.rowIndex}`)}?valueInputOption=RAW`, {
    values: [[calendarEvent.calendarEventId, calendarEvent.meetLink]]
  });
}

async function sheetsFetch(token: string, method: string, path: string, body?: unknown): Promise<Response> {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Sheets request failed: ${errorText}`);
  }

  return response;
}

async function getGoogleAccessToken(): Promise<string> {
  const credentials = getGoogleCredentials();
  const now = Math.floor(Date.now() / 1000);
  const jwtHeader = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const jwtClaim = base64UrlEncode(
    JSON.stringify({
      iss: credentials.clientEmail,
      scope: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/calendar.events",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now
    })
  );
  const unsignedJwt = `${jwtHeader}.${jwtClaim}`;
  const signature = await signJwt(unsignedJwt, credentials.privateKey);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsignedJwt}.${signature}`
    })
  });

  const body = await response.json();
  if (!response.ok || !body.access_token) {
    throw new Error(`Google auth failed: ${JSON.stringify(body)}`);
  }

  return body.access_token;
}

function getGoogleCredentials(): { clientEmail: string; privateKey: string } {
  if (GOOGLE_SERVICE_ACCOUNT_KEY) {
    const decoded = decodeMaybeBase64(GOOGLE_SERVICE_ACCOUNT_KEY);
    const credentials = JSON.parse(decoded);

    if (credentials.client_email && credentials.private_key) {
      return {
        clientEmail: credentials.client_email,
        privateKey: credentials.private_key
      };
    }
  }

  if (GOOGLE_CLIENT_EMAIL && GOOGLE_PRIVATE_KEY) {
    return {
      clientEmail: GOOGLE_CLIENT_EMAIL,
      privateKey: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")
    };
  }

  throw new Error("Google service account credentials are not configured.");
}

async function signJwt(unsignedJwt: string, privateKey: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsignedJwt));
  return base64UrlEncode(signature);
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

function base64UrlEncode(value: string | ArrayBuffer): string {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeMaybeBase64(value: string): string {
  const trimmed = value.trim();

  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  return atob(trimmed);
}

function sheetRange(sheetName: string, range: string): string {
  return `${encodeURIComponent(sheetName)}!${range}`;
}

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeRole(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("/", " ")
    .replace(/\s+/g, " ");
}

function buildSlotLabel(date: string, startTime: string): string {
  if (!date || !startTime) return startTime || date || "";
  return `${date} at ${startTime}`;
}

function parseDateOnly(value: string): Date | null {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function addDays(value: Date, daysToAdd: number): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() + daysToAdd));
}

function formatDateOnly(value: Date): string {
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function buildLocalDateTime(date: string, time: string): string {
  const parsedTime = parseTime(time);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !parsedTime) {
    return "";
  }

  return `${date}T${parsedTime}:00`;
}

function isPastLocalDateTime(value: string, timeZone: string): boolean {
  if (!value) return false;
  return value <= getCurrentLocalDateTime(timeZone);
}

function parseTime(value: string): string {
  const normalizedValue = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
  const match = normalizedValue.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);

  if (!match) {
    return "";
  }

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const meridiem = match[3] ?? "PM";

  if (minute < 0 || minute > 59 || hour < 1 || hour > 12) {
    return "";
  }

  if (meridiem === "PM" && hour !== 12) {
    hour += 12;
  }

  if (meridiem === "AM" && hour === 12) {
    hour = 0;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function addMinutesToTime(value: string, minutesToAdd: number): string {
  const parsedTime = parseTime(value);
  if (!parsedTime) return "";

  const [hours, minutes] = parsedTime.split(":").map(Number);
  const date = new Date(Date.UTC(2000, 0, 1, hours, minutes + minutesToAdd));
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const displayHour = hour % 12 || 12;
  const meridiem = hour >= 12 ? "PM" : "AM";

  return `${displayHour}:${String(minute).padStart(2, "0")} ${meridiem}`;
}

function subtractMinutesFromLocalDateTime(value: string, minutesToSubtract: number): string {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return "";

  const [, year, month, day, hour, minute, second] = match.map(String);
  const date = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute) - minutesToSubtract,
      Number(second)
    )
  );

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-") + `T${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}:${String(date.getUTCSeconds()).padStart(2, "0")}`;
}

function getCurrentLocalDateTime(timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());
  const byType = new Map(parts.map((part) => [part.type, part.value]));

  return `${byType.get("year")}-${byType.get("month")}-${byType.get("day")}T${byType.get("hour")}:${byType.get("minute")}:${byType.get("second")}`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function columnLetter(index: number): string {
  let value = index;
  let result = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }

  return result;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
