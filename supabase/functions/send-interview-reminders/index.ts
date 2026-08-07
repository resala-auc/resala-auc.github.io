const SHEET_ID = Deno.env.get("SHEET_ID") ?? "";
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
const CALENDAR_TIME_ZONE = Deno.env.get("CALENDAR_TIME_ZONE") ?? "Africa/Cairo";
const REMINDER_STALE_MINUTES = Number(Deno.env.get("REMINDER_STALE_MINUTES") ?? 90);
const REMINDER_JOB_SECRET = Deno.env.get("REMINDER_JOB_SECRET") ?? "";

/* Cosmetic committee renames: the stored name still ends in "Director", which
   is a position somebody holds, never the committee's name. */
const COMMITTEE_DISPLAY_NAMES: Record<string, string> = {
  "tech director": "Tech Team",
  "initiatives director": "Initiatives",
  "children day director": "Children’s Day"
};

function displayCommitteeName(name: unknown): string {
  const raw = String(name ?? "").trim();
  return COMMITTEE_DISPLAY_NAMES[normalizeRole(raw)] ?? raw;
}

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
  "Reminder Status",
  "Role Applied For",
  "Second Preference"
];

const HEADS_APPLICATION_SHEET_NAME =
  Deno.env.get("HEADS_APPLICATION_SHEET_NAME") ?? "Heads Applications";
const TASK_SUBMISSION_URL = (
  Deno.env.get("TASK_SUBMISSION_URL") ?? "https://resala-auc.github.io/tasks/"
).replace(/\/*$/, "/");

/*
 * Committees that collect work through the submission page before the
 * interview. Mirrors `task.submissionUrl` in src/interview-config.mjs — this
 * function cannot import it, so the two move together by hand, the same way
 * HEADS_TASKS does in the submit function.
 *
 * The reminder lands at the deadline itself, which makes it the last useful
 * moment to tell somebody their task is still missing.
 */
const TASK_SUBMISSION_COMMITTEES = new Set(["children day director", "visits"]);

/** Task Link is the second-to-last column on the heads applications sheet. */
type TaskState = { expected: boolean; submitted: boolean };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-reminder-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400"
};

type SlotRow = {
  id: string;
  label: string;
  startDateTime: string;
};

type ReservationRow = {
  rowIndex: number;
  timestamp: string;
  slotId: string;
  slotLabel: string;
  fullName: string;
  aucEmail: string;
  studentId: string;
  calendarEventId: string;
  meetLink: string;
  interviewStatus: string;
  reminderSendAt: string;
  reminderSentAt: string;
  reminderStatus: string;
  roleAppliedFor: string;
  secondPreference: string;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
  }

  try {
    if (!REMINDER_JOB_SECRET || request.headers.get("x-reminder-secret") !== REMINDER_JOB_SECRET) {
      return jsonResponse({ ok: false, error: "Unauthorized." }, 401);
    }

    if (!SHEET_ID) {
      throw new Error("SHEET_ID is not configured.");
    }

    if (!gmailConfigured()) {
      throw new Error("Gmail reminder sending is not configured.");
    }

    const token = await getGoogleAccessToken();
    await ensureSheetHeaders(token, RESERVATION_SHEET_NAME, RESERVATION_HEADERS);

    const slots = await getSlotMap(token);
    const reservations = await getReservations(token);
    const taskStates = await getTaskStates(token);
    const now = getCurrentLocalDateTime(CALENDAR_TIME_ZONE);
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const reservation of reservations) {
      if (!shouldProcessReservation(reservation)) {
        continue;
      }

      const reminderSendAt =
        reservation.reminderSendAt || getReminderSendAtFromSlot(slots.get(normalize(reservation.slotId)));

      if (!reminderSendAt) {
        continue;
      }

      if (now < reminderSendAt) {
        continue;
      }

      if (now > addMinutesToLocalDateTime(reminderSendAt, REMINDER_STALE_MINUTES)) {
        await updateReminderState(token, reservation.rowIndex, reminderSendAt, "", "Skipped");
        skipped += 1;
        continue;
      }

      try {
        await sendReminderEmail(
          { ...reservation, reminderSendAt },
          taskStates.get(normalize(reservation.aucEmail))
        );
        await updateReminderState(token, reservation.rowIndex, reminderSendAt, now, "Sent");
        sent += 1;
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : "Reminder send failed.";
        await updateReminderState(token, reservation.rowIndex, reminderSendAt, "", `Error: ${message.slice(0, 120)}`);
      }
    }

    return jsonResponse({ ok: true, checked: reservations.length, sent, skipped, failed, now });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Reminder job failed."
      },
      400
    );
  }
});

function shouldProcessReservation(reservation: ReservationRow): boolean {
  if (!reservation.aucEmail || !reservation.fullName) return false;
  if (normalize(reservation.interviewStatus) === "done") return false;
  if (normalize(reservation.reminderStatus) === "sent") return false;
  return true;
}

function getReminderSendAtFromSlot(slot?: SlotRow): string {
  if (!slot?.startDateTime) return "";
  return addMinutesToLocalDateTime(slot.startDateTime, -30);
}

async function getSlotMap(token: string): Promise<Map<string, SlotRow>> {
  const response = await sheetsFetch(token, "GET", `${sheetRange(SLOT_SHEET_NAME, "A2:I")}`);
  const rows = (await response.json()).values ?? [];
  const slots = new Map<string, SlotRow>();

  for (const row of rows) {
    const id = String(row[0] ?? "").trim();
    const date = String(row[1] ?? "").trim();
    const startTime = String(row[2] ?? "").trim();
    const label = String(row[4] ?? "").trim() || buildSlotLabel(date, startTime);

    if (!id) continue;

    slots.set(normalize(id), {
      id,
      label,
      startDateTime: buildLocalDateTime(date, startTime)
    });
  }

  return slots;
}

async function getReservations(token: string): Promise<ReservationRow[]> {
  const response = await sheetsFetch(token, "GET", `${sheetRange(RESERVATION_SHEET_NAME, "A2:N")}`);
  const rows = (await response.json()).values ?? [];

  return rows.map((row: string[], index: number) => ({
    rowIndex: index + 2,
    timestamp: String(row[0] ?? "").trim(),
    slotId: String(row[1] ?? "").trim(),
    slotLabel: String(row[2] ?? "").trim(),
    fullName: String(row[3] ?? "").trim(),
    aucEmail: String(row[4] ?? "").trim(),
    studentId: String(row[5] ?? "").trim(),
    calendarEventId: String(row[6] ?? "").trim(),
    meetLink: String(row[7] ?? "").trim(),
    interviewStatus: String(row[8] ?? "").trim(),
    reminderSendAt: String(row[9] ?? "").trim(),
    reminderSentAt: String(row[10] ?? "").trim(),
    reminderStatus: String(row[11] ?? "").trim(),
    roleAppliedFor: String(row[12] ?? "").trim(),
    secondPreference: String(row[13] ?? "").trim()
  }));
}

/**
 * Who still owes a task, keyed by AUC email. Read once per run rather than per
 * reminder: the sheet is small and the job walks every reservation.
 *
 * A committee not in TASK_SUBMISSION_COMMITTEES gets `expected: false`, and
 * the reminder says nothing about tasks at all.
 */
async function getTaskStates(token: string): Promise<Map<string, TaskState>> {
  const states = new Map<string, TaskState>();
  try {
    // Headers included: the columns are found by name, because an applicant's
    // written answer can contain a URL and a fixed offset would eventually
    // read one of those as somebody's submission.
    const response = await sheetsFetch(token, "GET", `${sheetRange(HEADS_APPLICATION_SHEET_NAME, "A1:AZ")}`);
    const rows = ((await response.json()).values ?? []) as string[][];
    const headers = (rows[0] ?? []).map((h) => String(h ?? "").trim().toLowerCase());
    const emailColumn = headers.indexOf("auc email");
    const committeeColumn = headers.indexOf("committee");
    const linkColumn = headers.indexOf("task link");
    if (emailColumn === -1 || committeeColumn === -1 || linkColumn === -1) {
      throw new Error("Heads applications sheet is missing a column the reminder needs.");
    }

    for (const row of rows.slice(1)) {
      const email = normalize(String(row[emailColumn] ?? ""));
      if (!email) continue;
      states.set(email, {
        expected: TASK_SUBMISSION_COMMITTEES.has(normalizeRole(String(row[committeeColumn] ?? ""))),
        submitted: /^https?:\/\//i.test(String(row[linkColumn] ?? "").trim())
      });
    }
  } catch (error) {
    // A reminder without its task line is still worth sending.
    console.error(
      `Task state lookup failed: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }
  return states;
}

async function updateReminderState(
  token: string,
  rowIndex: number,
  reminderSendAt: string,
  reminderSentAt: string,
  reminderStatus: string
): Promise<void> {
  await sheetsFetch(token, "PUT", `${sheetRange(RESERVATION_SHEET_NAME, `J${rowIndex}:L${rowIndex}`)}?valueInputOption=RAW`, {
    values: [[reminderSendAt, reminderSentAt, reminderStatus]]
  });
}

/**
 * Applicant only. The committee is on the calendar invite and gets reminded by
 * their own calendar; copying them here would be a second reminder for an
 * interview they already have booked.
 */
async function sendReminderEmail(reservation: ReservationRow, taskState?: TaskState): Promise<void> {
  const slot = reservation.slotLabel || reservation.reminderSendAt;
  const template = buildReminderEmailTemplate(
    reservation.fullName,
    slot,
    reservation.meetLink,
    reservation.roleAppliedFor,
    taskState
  );
  await sendEmail(reservation.aucEmail, template.subject, template.body, template.html);
}

async function sendEmail(to: string, subject: string, text: string, html: string, cc = ""): Promise<void> {
  const accessToken = await getGmailAccessToken();
  const rawMessage = buildRawEmailMessage({
    from: `${GMAIL_SENDER_NAME} <${GMAIL_SENDER_EMAIL}>`,
    to,
    cc: cc || undefined,
    subject,
    text,
    html
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

export function buildReminderEmailTemplate(
  fullName: string,
  slot: string,
  meetLink: string,
  roleAppliedFor: string,
  taskState?: TaskState
): { subject: string; body: string; html: string } {
  const committee = displayCommitteeName(roleAppliedFor);
  /*
   * This mail lands an hour before the interview, which for the committees
   * that collect work beforehand is the deadline itself. So it is the last
   * moment worth saying "your task has not arrived" — and the subject line
   * says it too, because a reminder people expect to be routine is one they
   * open late.
   */
  const owesTask = Boolean(taskState?.expected && !taskState.submitted);
  const subject = owesTask
    ? "Resala AUC: your interview starts in 1 hour — we do not have your task yet"
    : "Resala AUC: your interview starts in 1 hour";

  const taskLines = !taskState?.expected
    ? ["If your committee asked you to prepare something, bring it with you."]
    : taskState.submitted
      ? ["We have your task. Nothing else to hand in."]
      : [
          "We do not have your task yet, and it is due now.",
          `Submit it here: ${TASK_SUBMISSION_URL}`,
          "Send what you have — the people interviewing you would rather read something than nothing."
        ];

  const body = [
    `Hi ${fullName},`,
    "",
    `This is a reminder that your Resala AUC interview${committee ? ` with ${committee}` : ""} starts in 1 hour.`,
    "",
    `Interview slot: ${slot}`,
    `Google Meet link: ${meetLink}`,
    "",
    ...taskLines,
    "Please join from a quiet place if possible.",
    "If anything comes up, reply to this email.",
    "",
    "Best,",
    "Resala AUC"
  ].join("\n");

  /* An outstanding task gets its own card, above the Meet link: at this point
     it is the more urgent of the two things they have to do. */
  const taskCard = !taskState?.expected
    ? ""
    : taskState.submitted
      ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;">
          <tr><td style="background:#eef7f1;border:1px solid #cfe7da;border-radius:14px;padding:16px;">
            <div style="font-size:13px;color:#1a7f4b;text-transform:uppercase;letter-spacing:1px;font-weight:bold;margin-bottom:6px;">Task received</div>
            <div style="font-size:15px;line-height:1.6;color:#4b5563;">We have your task. Nothing else to hand in — just join on time.</div>
          </td></tr></table>`
      : `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;">
          <tr><td style="background:#fdecec;border:1px solid #f3c9c9;border-left:5px solid #b3261e;border-radius:14px;padding:18px;">
            <div style="font-size:13px;color:#b3261e;text-transform:uppercase;letter-spacing:1px;font-weight:bold;margin-bottom:7px;">Your task is due now</div>
            <div style="font-size:15px;line-height:1.6;color:#172033;">We do not have your task yet. Send what you have — the people interviewing you would rather read something than nothing.</div>
            <a href="${escapeHtml(TASK_SUBMISSION_URL)}" style="display:inline-block;margin-top:12px;background:#0d2b45;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;border-radius:10px;padding:11px 16px;">Submit your task now</a>
          </td></tr></table>`;

  const html = buildCenteredEmailHtml({
    preheader: owesTask
      ? "Your interview starts in 1 hour, and we do not have your task yet."
      : "Your Resala AUC interview starts in 1 hour.",
    heroTitle: "Your Interview Starts Soon",
    heroSubtitle: owesTask
      ? "One thing is still outstanding — your task."
      : "Join from a quiet place, and bring anything your committee asked you to prepare.",
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi ${escapeHtml(fullName)},</p>
      <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Your <strong>Resala AUC</strong> interview${committee ? ` with <strong>${escapeHtml(committee)}</strong>` : ""} starts in <strong>1 hour</strong>.</p>
      ${taskCard}
      ${infoCard("Interview slot", escapeHtml(slot))}
      ${linkCard("Google Meet", "Join the interview meeting", meetLink, "Please join from a quiet place if possible.")}
      <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#4b5563;">${
        taskState?.expected ? "" : "If your committee asked you to prepare something, bring it with you. "
      }If anything comes up, reply to this email.</p>
      <p style="margin:0 0 4px;font-size:16px;line-height:1.6;color:#172033;font-weight:bold;">Be the first step toward someone's better life.</p>
      <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Best,<br>Resala AUC</p>
    `
  });

  return { subject, body, html };
}

function buildCenteredEmailHtml({
  preheader,
  heroTitle,
  heroSubtitle,
  bodyHtml
}: {
  preheader: string;
  heroTitle: string;
  heroSubtitle: string;
  bodyHtml: string;
}): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f3ea;color:#172033;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f7f3ea;margin:0;padding:24px 0;">
      <tr>
        <td align="center" style="padding:0 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border:1px solid #eadfca;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="background:#0d2b45;padding:24px 28px 30px;text-align:center;color:#ffffff;">
                <img src="${escapeHtml(EMAIL_LOGO_URL)}" alt="Resala AUC" width="128" style="display:block;width:128px;max-width:128px;height:auto;border:0;outline:none;text-decoration:none;margin:0 auto;">
                <div style="font-size:25px;line-height:1.15;color:#ffffff;font-weight:bold;margin-top:14px;">Beyond Ana Maly</div>
                <div style="font-size:14px;line-height:1.5;color:#f5c46b;margin-top:6px;font-weight:bold;letter-spacing:0.5px;">Build the First Step</div>
                <div style="font-size:28px;line-height:1.15;color:#ffffff;font-weight:bold;margin-top:22px;">${escapeHtml(heroTitle)}</div>
                <div style="font-size:15px;line-height:1.5;color:#dbe7ef;margin-top:10px;">${escapeHtml(heroSubtitle)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 28px 8px;">
                ${bodyHtml}
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

function infoCard(label: string, value: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;">
    <tr>
      <td style="background:#fff7e8;border:1px solid #f0d7a5;border-left:5px solid #f5a623;border-radius:14px;padding:18px;">
        <div style="font-size:13px;color:#8a4706;text-transform:uppercase;letter-spacing:1px;font-weight:bold;margin-bottom:7px;">${label}</div>
        <div style="font-size:22px;line-height:1.3;font-weight:bold;color:#0d2b45;">${value}</div>
      </td>
    </tr>
  </table>`;
}

function linkCard(label: string, linkText: string, href: string, note: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;">
    <tr>
      <td style="background:#f8fafc;border:1px solid #e6edf2;border-radius:14px;padding:16px;">
        <div style="font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:bold;margin-bottom:8px;">${label}</div>
        <a href="${escapeHtml(href)}" style="color:#0d2b45;font-size:16px;font-weight:bold;text-decoration:underline;">${linkText}</a>
        <div style="font-size:14px;line-height:1.55;color:#4b5563;margin-top:8px;">${note}</div>
      </td>
    </tr>
  </table>`;
}

function darkCallout(label: string, value: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:4px 0 22px;">
    <tr>
      <td style="background:#0d2b45;border-radius:14px;padding:16px 18px;color:#ffffff;">
        <div style="font-size:14px;color:#f5c46b;font-weight:bold;letter-spacing:.8px;text-transform:uppercase;">${label}</div>
        <div style="font-size:15px;line-height:1.7;color:#ffffff;margin-top:8px;">${value}</div>
      </td>
    </tr>
  </table>`;
}

function gmailConfigured(): boolean {
  return Boolean(GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN && GMAIL_SENDER_EMAIL);
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
  cc,
  subject,
  text,
  html
}: {
  from: string;
  to: string;
  cc?: string;
  subject: string;
  text: string;
  html: string;
}): string {
  const boundary = `resala-${crypto.randomUUID()}`;
  const message = [
    `From: ${encodeAddressHeader(from)}`,
    `To: ${to}`,
    ...(cc ? [`Cc: ${cc}`] : []),
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "MIME-Version: 1.0",
    `Subject: ${encodeEmailHeader(subject)}`,
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

async function ensureSheetHeaders(token: string, sheetName: string, headers: string[]): Promise<void> {
  const width = headers.length;
  const response = await sheetsFetch(token, "GET", `${sheetRange(sheetName, `A1:${columnLetter(width)}1`)}`);
  const currentValues = (await response.json()).values?.[0] ?? [];

  if (currentValues.length === 0 || headers.some((header, index) => currentValues[index] !== header)) {
    await sheetsFetch(token, "PUT", `${sheetRange(sheetName, `A1:${columnLetter(width)}1`)}?valueInputOption=RAW`, {
      values: [headers]
    });
  }
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
      scope: "https://www.googleapis.com/auth/spreadsheets",
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

/**
 * RFC 2047 encoding for a header value. Mail headers are ASCII only; a raw UTF-8
 * character in Subject or a sender name is decoded by the client as Latin-1,
 * turning an em dash into "Ã¢Â€Â”". Chunks split on character boundaries because
 * an encoded-word must hold a whole number of characters.
 */
function encodeEmailHeader(value: string): string {
  const raw = String(value ?? "");
  if (/^[\x20-\x7E]*$/.test(raw)) return raw;

  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let current = "";
  for (const character of raw) {
    const candidate = current + character;
    if (encoder.encode(candidate).length > 45) {
      if (current) chunks.push(current);
      current = character;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);

  return chunks
    .map((chunk) => {
      let binary = "";
      for (const byte of encoder.encode(chunk)) binary += String.fromCharCode(byte);
      return `=?UTF-8?B?${btoa(binary)}?=`;
    })
    .join("\r\n ");
}

/** Encodes the display name of "Name <address>" and leaves the address alone. */
function encodeAddressHeader(value: string): string {
  const match = String(value ?? "").match(/^(.*)<([^>]+)>\s*$/);
  if (!match) return encodeEmailHeader(value);
  const name = match[1].trim().replace(/^"|"$/g, "");
  const address = match[2].trim();
  return name ? `${encodeEmailHeader(name)} <${address}>` : `<${address}>`;
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

function columnLetter(columnNumber: number): string {
  let value = columnNumber;
  let output = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    output = String.fromCharCode(65 + remainder) + output;
    value = Math.floor((value - 1) / 26);
  }

  return output;
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

function buildLocalDateTime(date: string, time: string): string {
  const parsedTime = parseTime(time);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !parsedTime) {
    return "";
  }

  return `${date}T${parsedTime}:00`;
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

function addMinutesToLocalDateTime(value: string, minutesToAdd: number): string {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return "";

  const [, year, month, day, hour, minute, second] = match.map(String);
  const date = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute) + minutesToAdd,
      Number(second)
    )
  );

  const datePart = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
  const timePart = [
    String(date.getUTCHours()).padStart(2, "0"),
    String(date.getUTCMinutes()).padStart(2, "0"),
    String(date.getUTCSeconds()).padStart(2, "0")
  ].join(":");

  return `${datePart}T${timePart}`;
}

function formatLocalDateTimeLabel(value: string): string {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return "";

  const [, year, month, day, hour, minute] = match;
  const numericHour = Number(hour);
  const displayHour = numericHour % 12 || 12;
  const meridiem = numericHour >= 12 ? "PM" : "AM";

  return `${year}-${month}-${day} at ${displayHour}:${minute} ${meridiem}`;
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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
