import { NextResponse } from "next/server";

import { logCronRun } from "@/lib/logCronRun";
import { supabaseAdmin } from "@/lib/supabase-admin";

function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return false;
  }

  const authorization = request.headers.get("authorization");

  if (authorization === `Bearer ${cronSecret}`) {
    return true;
  }

  const url = new URL(request.url);

  return url.searchParams.get("secret") === cronSecret;
}

function getCronTriggerSource(request: Request) {
  const authorization = request.headers.get("authorization");

  if (authorization) {
    return "vercel_scheduled";
  }

  const url = new URL(request.url);

  if (url.searchParams.get("secret")) {
    return "manual_secret_url";
  }

  return "unknown";
}

function addDays(days: number) {
  const date = new Date();

  date.setDate(date.getDate() + days);
  date.setHours(0, 0, 0, 0);

  return date.toISOString().slice(0, 10);
}

function getBookingEmail(booking: Record<string, unknown>) {
  return String(
    booking.customer_email ||
      booking.client_email ||
      booking.email ||
      ""
  ).trim();
}

function getBookingName(booking: Record<string, unknown>) {
  return String(
    booking.customer_name ||
      booking.client_name ||
      booking.name ||
      getBookingEmail(booking) ||
      "Client"
  );
}

function getBookingTitle(booking: Record<string, unknown>) {
  return String(
    booking.service_name ||
      booking.service_title ||
      booking.title ||
      booking.event_title ||
      `Booking #${booking.id}`
  );
}

async function logEmailAudit({
  recipient,
  subject,
  status,
  reason,
  metadata,
}: {
  recipient: string;
  subject: string;
  status: string;
  reason: string;
  metadata: Record<string, unknown>;
}) {
  try {
    await supabaseAdmin.from("email_audit_logs").insert({
      recipient_email: recipient,
      subject,
      status,
      reason,
      metadata,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Do not fail cron if email audit table differs.
  }
}

async function sendReminderEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.RESEND_FROM_EMAIL ||
    process.env.EMAIL_FROM ||
    "Million Dollar Ticket Productions <onboarding@resend.dev>";

  if (!resendApiKey) {
    return {
      sent: false,
      skipped: true,
      reason: "RESEND_API_KEY is not configured.",
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to,
      subject,
      text,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      sent: false,
      skipped: false,
      reason: data.message ?? "Resend email request failed.",
      data,
    };
  }

  return {
    sent: true,
    skipped: false,
    reason: "Email sent.",
    data,
  };
}

async function updateBookingReminderStatus(bookingId: number) {
  const richUpdate = {
    latest_reminder_sent_at: new Date().toISOString(),
    reminder_status: "sent",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from("bookings")
    .update(richUpdate)
    .eq("id", bookingId);

  if (!error) {
    return;
  }

  await supabaseAdmin
    .from("bookings")
    .update({
      reminder_status: "sent",
    })
    .eq("id", bookingId);
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      {
        error: "Unauthorized cron request.",
      },
      {
        status: 401,
      }
    );
  }

  const triggerSource = getCronTriggerSource(request);

  try {
    const url = new URL(request.url);

    const rawDaysAhead = Number(url.searchParams.get("days") ?? 1);

    const daysAhead =
      Number.isFinite(rawDaysAhead) && rawDaysAhead >= 0
        ? Math.min(rawDaysAhead, 14)
        : 1;

    const targetDate = addDays(daysAhead);

    const { data: bookings, error } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("booking_date", targetDate)
      .not("status", "eq", "cancelled")
      .limit(250);

    if (error) {
      const fallback = await supabaseAdmin
        .from("bookings")
        .select("*")
        .eq("booking_date", targetDate)
        .limit(250);

      if (fallback.error) {
        throw fallback.error;
      }

      const fallbackBookings = fallback.data ?? [];

      await logCronRun({
        cronName: "reminders",
        triggerSource,
        status: "warning",
        message: "Reminder scan completed with fallback query.",
        resultSummary: {
          target_date: targetDate,
          scanned_count: fallbackBookings.length,
          sent_count: 0,
          skipped_count: fallbackBookings.length,
          fallback: true,
        },
      });

      return NextResponse.json({
        checked_at: new Date().toISOString(),
        target_date: targetDate,
        scanned_count: fallbackBookings.length,
        sent_count: 0,
        skipped_count: fallbackBookings.length,
        message: "Reminder scan completed with fallback query.",
      });
    }

    const reminderBookings = bookings ?? [];

    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const booking of reminderBookings) {
      const email = getBookingEmail(booking);

      if (!email) {
        skippedCount += 1;

        await logEmailAudit({
          recipient: "",
          subject: "Booking reminder",
          status: "skipped",
          reason: "missing_recipient_email",
          metadata: {
            booking_id: booking.id,
          },
        });

        continue;
      }

      const subject = `Reminder: ${getBookingTitle(booking)}`;
      const text = [
        `Hi ${getBookingName(booking)},`,
        "",
        `This is a reminder for your upcoming booking with Million Dollar Ticket Productions.`,
        "",
        `Booking: ${getBookingTitle(booking)}`,
        `Date: ${booking.booking_date ?? targetDate}`,
        `Time: ${booking.booking_time ?? "Time not listed"}`,
        "",
        `Thank you for booking with us.`,
      ].join("\n");

      const result = await sendReminderEmail({
        to: email,
        subject,
        text,
      });

      await logEmailAudit({
        recipient: email,
        subject,
        status: result.sent ? "sent" : result.skipped ? "skipped" : "failed",
        reason: result.reason,
        metadata: {
          booking_id: booking.id,
          result,
        },
      });

      if (result.sent) {
        sentCount += 1;

        if (booking.id) {
          await updateBookingReminderStatus(Number(booking.id)).catch(() => null);
        }
      } else if (result.skipped) {
        skippedCount += 1;
      } else {
        failedCount += 1;
      }
    }

    const cronStatus = failedCount > 0 ? "warning" : "success";

    const message = `${sentCount} reminder${sentCount === 1 ? "" : "s"} sent.`;

    await logCronRun({
      cronName: "reminders",
      triggerSource,
      status: cronStatus,
      message,
      resultSummary: {
        target_date: targetDate,
        scanned_count: reminderBookings.length,
        sent_count: sentCount,
        skipped_count: skippedCount,
        failed_count: failedCount,
      },
    });

    return NextResponse.json({
      checked_at: new Date().toISOString(),
      target_date: targetDate,
      scanned_count: reminderBookings.length,
      sent_count: sentCount,
      skipped_count: skippedCount,
      failed_count: failedCount,
      message,
    });
  } catch (error) {
    console.error("REMINDERS CRON ERROR:", error);

    await logCronRun({
      cronName: "reminders",
      triggerSource,
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unexpected reminders cron error.",
      resultSummary: {},
    });

    return NextResponse.json(
      {
        error: "Unexpected error running reminders cron.",
      },
      {
        status: 500,
      }
    );
  }
}