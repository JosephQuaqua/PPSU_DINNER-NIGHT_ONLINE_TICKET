
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "./_cors.ts";
import {
  bookingSubmittedAdminHtml,
  bookingSubmittedCustomerHtml,
  paymentApprovedHtml,
  paymentRejectedHtml,
} from "./_templates.ts";
import { generateTicketPdf, type TicketPdfData } from "./_pdf.ts";

// --- Types ---

interface BookingDetail {
  booking_id: string;
  booking_number: string;
  total_amount: number;
  status: string;
  customer_name: string;
  customer_email: string;
  student_id: string;
  event_title: string;
  event_date: string;
  event_time: string;
  event_venue: string;
  ticket_number: string | null;
  qr_token: string | null;
  transaction_reference: string | null;
  admin_note: string | null;
}

interface RequestBody {
  type: "booking_submitted" | "payment_approved" | "payment_rejected";
  booking_id: string;
  rejection_reason?: string;
}

// --- Helpers ---

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "events@ppsu.ac.in";
const ADMIN_ROLE_NAMES = ["super_admin", "event_admin"] as const;
const APP_URL = Deno.env.get("APP_URL") || "https://ppsu-events.app";
const ORG_NAME = "PPSU Events";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL is not configured");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);

async function fetchBookingDetail(bookingId: string): Promise<BookingDetail | null> {
  const { data: booking, error: bErr } = await supabase
    .from("bookings")
    .select("id, booking_number, total_amount, status, user_id, event_id")
    .eq("id", bookingId)
    .single();
  if (bErr) {
  console.error("[email] booking lookup failed:", {
    bookingId,
    code: bErr.code,
    message: bErr.message,
    details: bErr.details,
    hint: bErr.hint,
  });

  throw new Error(`Booking lookup failed: ${bErr.message}`);
}

if (!booking) {
  console.error("[email] booking lookup returned no data:", bookingId);
  throw new Error("Booking lookup returned no data");
}

  const { data: event } = await supabase
    .from("events")
    .select("title, event_date, start_time, venue")
    .eq("id", booking.event_id)
    .single();

  const { data: attendee } = await supabase
    .from("attendees")
    .select("full_name, email, student_id")
    .eq("booking_id", bookingId)
    .eq("is_self", true)
    .single();

  const { data: payment } = await supabase
    .from("payments")
    .select("transaction_reference, admin_note")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const { data: ticket } = await supabase
    .from("tickets")
    .select("ticket_number, qr_token")
    .eq("booking_id", bookingId)
    .limit(1)
    .single();

  return {
    booking_id: booking.id,
    booking_number: booking.booking_number,
    total_amount: Number(booking.total_amount),
    status: booking.status,
    customer_name: attendee?.full_name || "Student",
    customer_email: attendee?.email || "",
    student_id: attendee?.student_id || "",
    event_title: event?.title || "PPSU Event",
    event_date: event?.event_date || "",
    event_time: event?.start_time || "",
    event_venue: event?.venue || "",
    ticket_number: ticket?.ticket_number || null,
    qr_token: ticket?.qr_token || null,
    transaction_reference: payment?.transaction_reference || null,
    admin_note: payment?.admin_note || null,
  };
}

async function getAdminEmails(): Promise<string[]> {
  const { data: staffRoles, error } = await supabase
    .from("staff_roles")
    .select("user_id")
    .in("role", ADMIN_ROLE_NAMES);

  if (error) {
    console.error("[email] failed to fetch admin roles:", error);
    return [];
  }

  const emails: string[] = [];

  for (const staff of staffRoles ?? []) {
    const { data, error: userError } =
      await supabase.auth.admin.getUserById(staff.user_id);

    if (userError) {
      console.error(
        `[email] failed to fetch admin email for ${staff.user_id}:`,
        userError,
      );
      continue;
    }

    if (data.user?.email) {
      emails.push(data.user.email);
    }
  }

  return [...new Set(emails)];
}

async function hasEmailBeenSent(bookingId: string, emailType: string): Promise<boolean> {
  const { data } = await supabase
    .from("email_logs")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("email_type", emailType)
    .eq("status", "sent")
    .maybeSingle();
  return !!data;
}

async function logEmail(
  bookingId: string, emailType: string, recipient: string,
  resendId: string | null, error: string | null,
): Promise<void> {
  try {
    await supabase.from("email_logs").insert({
      booking_id: bookingId,
      email_type: emailType,
      recipient_email: recipient,
      status: error ? "failed" : "sent",
      resend_id: resendId,
      error,
    });
  } catch {
    // Suppress — don't break the flow on log failure
  }
}

async function sendViaResend(
  to: string, subject: string, html: string, attachment?: { filename: string; content: Uint8Array },
): Promise<{ id: string | null; error: string | null }> {
  const payload: Record<string, unknown> = {
    from: RESEND_FROM_EMAIL,
    to: [to],
    subject,
    html,
  };
  if (attachment) {
    payload.attachments = [{
      filename: attachment.filename,
      content: Array.from(attachment.content),
    }];
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await res.json();
  if (!res.ok) {
    return { id: null, error: result.message || result.error || `HTTP ${res.status}` };
  }
  return { id: result.id || null, error: null };
}

function formatAmount(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatTime(t: string): string {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 || 12;
  return `${display}:${m || "00"} ${period}`;
}

// --- Email handlers ---

async function handleBookingSubmitted(bookingId: string): Promise<Response> {
  const detail = await fetchBookingDetail(bookingId);
  if (!detail) return json({ error: "Booking not found" }, 404);
  if (!detail.customer_email) return json({ error: "Customer email not found" }, 400);

  // Admin email
  // Admin emails
const adminEmails = await getAdminEmails();
console.log("[email] admin emails found:", adminEmails);
for (const adminEmail of adminEmails) {
  const alreadySent = await hasEmailBeenSent(
    bookingId,
    `booking_submitted_admin_${adminEmail}`,
  );

  if (alreadySent) continue;

  const html = bookingSubmittedAdminHtml({
    bookingId: detail.booking_number,
    customerName: detail.customer_name,
    email: detail.customer_email,
    amount: formatAmount(detail.total_amount),
    paymentReference: detail.transaction_reference || "Not yet provided",
    adminUrl: `${APP_URL}/admin/payments`,
  });

  const { id, error } = await sendViaResend(
    adminEmail,
    "New Booking Payment Awaiting Approval",
    html,
  );

  await logEmail(
    bookingId,
    `booking_submitted_admin_${adminEmail}`,
    adminEmail,
    id,
    error,
  );

  if (error) {
    console.error(
      `[email] admin booking email failed for ${adminEmail}:`,
      error,
    );
  }
}

  // Customer email
  const alreadySentC = await hasEmailBeenSent(bookingId, "booking_submitted_customer");
  if (!alreadySentC) {
    const html = bookingSubmittedCustomerHtml({
      customerName: detail.customer_name,
      bookingId: detail.booking_number,
    });
    const { id, error } = await sendViaResend(detail.customer_email, "Booking & Payment Request Received", html);
    await logEmail(bookingId, "booking_submitted_customer", detail.customer_email, id, error);
    if (error) console.error("[email] customer booking email failed:", error);
  }

  return json({ success: true });
}

async function handlePaymentApproved(bookingId: string): Promise<Response> {
  const detail = await fetchBookingDetail(bookingId);
  if (!detail) return json({ error: "Booking not found" }, 404);
  if (!detail.customer_email) return json({ error: "Customer email not found" }, 400);
  if (!detail.ticket_number || !detail.qr_token) return json({ error: "Ticket not generated yet" }, 400);

  const alreadySent = await hasEmailBeenSent(bookingId, "payment_approved");
  if (alreadySent) return json({ success: true, message: "Already sent" });

  const pdfData: TicketPdfData = {
    ticketNumber: detail.ticket_number,
    bookingNumber: detail.booking_number,
    eventTitle: detail.event_title,
    eventDate: formatDate(detail.event_date),
    eventTime: formatTime(detail.event_time),
    venue: detail.event_venue,
    attendeeName: detail.customer_name,
    studentId: detail.student_id || "",
    qrToken: detail.qr_token,
  };

  const pdfBytes = generateTicketPdf(pdfData);
  const filename = `Ticket-${detail.booking_number}.pdf`;

  const html = paymentApprovedHtml({
    customerName: detail.customer_name,
    bookingId: detail.booking_number,
    orgName: ORG_NAME,
  });

  const { id, error } = await sendViaResend(
    detail.customer_email,
    "Booking Confirmed — Payment Approved",
    html,
    { filename, content: pdfBytes },
  );

  await logEmail(bookingId, "payment_approved", detail.customer_email, id, error);
  if (error) {
    console.error("[email] approval email failed:", error);
    return json({ error: "Failed to send approval email" }, 500);
  }

  return json({ success: true });
}

async function handlePaymentRejected(bookingId: string, rejectionReason: string): Promise<Response> {
  const detail = await fetchBookingDetail(bookingId);
  if (!detail) return json({ error: "Booking not found" }, 404);
  if (!detail.customer_email) return json({ error: "Customer email not found" }, 400);

  const alreadySent = await hasEmailBeenSent(bookingId, "payment_rejected");
  if (alreadySent) return json({ success: true, message: "Already sent" });

  const html = paymentRejectedHtml({
    customerName: detail.customer_name,
    bookingId: detail.booking_number,
    rejectionReason,
  });

  const { id, error } = await sendViaResend(
    detail.customer_email,
    "Booking Payment Request — Rejected",
    html,
  );

  await logEmail(bookingId, "payment_rejected", detail.customer_email, id, error);
  if (error) {
    console.error("[email] rejection email failed:", error);
    return json({ error: "Failed to send rejection email" }, 500);
  }

  return json({ success: true });
}

// --- Main ---

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const rawBody = await req.text();
console.log("[email] raw request body:", rawBody);

const body: RequestBody = JSON.parse(rawBody);

    if (!body.type || !body.booking_id) {
      return json({ error: "Missing required fields: type, booking_id" }, 400);
    }

    switch (body.type) {
      case "booking_submitted":
        return await handleBookingSubmitted(body.booking_id);
      case "payment_approved":
        return await handlePaymentApproved(body.booking_id);
      case "payment_rejected":
        if (!body.rejection_reason) {
          return json({ error: "Missing rejection_reason" }, 400);
        }
        return await handlePaymentRejected(body.booking_id, body.rejection_reason);
      default:
        return json({ error: `Unknown email type: ${body.type}` }, 400);
    }
  } catch (err) {
  console.error("[email] unexpected error:", err);

  return json(
    {
      error: "Internal server error",
      details: err instanceof Error ? err.message : String(err),
    },
    500,
  );
}
});
