import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { getServerSiteSlug } from "@/lib/site/siteConfig";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Row = Record<string, any>;

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(days: number) {
  const date = new Date();

  date.setDate(date.getDate() + days);

  return dateOnly(date);
}

function getBookingDate(booking: Row) {
  return String(
    booking.booking_date ||
      booking.event_date ||
      booking.scheduled_date ||
      booking.date ||
      ""
  ).slice(0, 10);
}

function getBookingEmail(booking: Row) {
  return String(
    booking.customer_email ||
      booking.client_email ||
      booking.email ||
      ""
  ).trim();
}

function getBookingName(booking: Row) {
  return String(
    booking.customer_name ||
      booking.client_name ||
      booking.name ||
      getBookingEmail(booking) ||
      "Client"
  );
}

function getBookingTitle(booking: Row) {
  return String(
    booking.service_name ||
      booking.service_title ||
      booking.title ||
      booking.event_title ||
      `Booking #${booking.id}`
  );
}

function getBookingStatus(booking: Row) {
  return String(booking.status || booking.booking_status || "").toLowerCase();
}

async function getUpcomingBookings({
  startDate,
  endDate,
  siteSlug,
}: {
  startDate: string;
  endDate: string;
  siteSlug: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("site_slug", siteSlug)
    .gte("booking_date", startDate)
    .lte("booking_date", endDate)
    .order("booking_date", {
      ascending: true,
    })
    .limit(500);

  if (!error) {
    return data ?? [];
  }

  const fallback = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("site_slug", siteSlug)
    .limit(500);

  if (fallback.error) {
    throw fallback.error;
  }

  return (fallback.data ?? []).filter((booking) => {
    const bookingDate = getBookingDate(booking);

    return bookingDate >= startDate && bookingDate <= endDate;
  });
}

async function getRecentEmailAuditLogs(days: number, siteSlug: string) {
  const cutoff = new Date();

  cutoff.setDate(cutoff.getDate() - days);

  const { data, error } = await supabaseAdmin
    .from("email_audit_logs")
    .select("*")
    .eq("site_slug", siteSlug)
    .gte("created_at", cutoff.toISOString())
    .order("created_at", {
      ascending: false,
    })
    .limit(250);

  if (error) {
    return [];
  }

  return data ?? [];
}

export async function GET(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const url = new URL(request.url);
    const siteSlug = getServerSiteSlug();

    const rawDaysAhead = Number(url.searchParams.get("days") ?? 14);

    const daysAhead =
      Number.isFinite(rawDaysAhead) && rawDaysAhead >= 0
        ? Math.min(rawDaysAhead, 60)
        : 14;

    const startDate = dateOnly(new Date());
    const endDate = addDays(daysAhead);
    const tomorrow = addDays(1);

    const [bookings, auditLogs] = await Promise.all([
      getUpcomingBookings({
        startDate,
        endDate,
        siteSlug,
      }),
      getRecentEmailAuditLogs(30, siteSlug),
    ]);

    const activeBookings = bookings.filter(
      (booking) => getBookingStatus(booking) !== "cancelled"
    );

    const dueToday = activeBookings.filter(
      (booking) => getBookingDate(booking) === startDate
    );

    const dueTomorrow = activeBookings.filter(
      (booking) => getBookingDate(booking) === tomorrow
    );

    const missingEmailBookings = activeBookings.filter(
      (booking) => !getBookingEmail(booking)
    );

    const sentAuditLogs = auditLogs.filter(
      (log) => String(log.status).toLowerCase() === "sent"
    );

    const skippedAuditLogs = auditLogs.filter(
      (log) => String(log.status).toLowerCase() === "skipped"
    );

    const failedAuditLogs = auditLogs.filter(
      (log) => String(log.status).toLowerCase() === "failed"
    );

    return NextResponse.json({
      summary: {
        site_slug: siteSlug,
        range_start: startDate,
        range_end: endDate,
        days_ahead: daysAhead,
        upcoming_booking_count: activeBookings.length,
        due_today_count: dueToday.length,
        due_tomorrow_count: dueTomorrow.length,
        missing_email_count: missingEmailBookings.length,
        email_audit_loaded_count: auditLogs.length,
        reminders_sent_last_30_days: sentAuditLogs.length,
        reminders_skipped_last_30_days: skippedAuditLogs.length,
        reminders_failed_last_30_days: failedAuditLogs.length,
      },
      upcoming_bookings: activeBookings.slice(0, 50).map((booking) => ({
        id: booking.id,
        title: getBookingTitle(booking),
        client_name: getBookingName(booking),
        email: getBookingEmail(booking),
        booking_date: getBookingDate(booking),
        booking_time:
          booking.booking_time ||
          booking.event_time ||
          booking.scheduled_time ||
          booking.time ||
          null,
        status: booking.status || booking.booking_status || null,
        payment_status: booking.payment_status || null,
      })),
      recent_email_audit_logs: auditLogs.slice(0, 50),
      message: "Reminders summary loaded.",
    });
  } catch (error) {
    console.error("REMINDERS SUMMARY ERROR:", error);

    return NextResponse.json(
      {
        error: "Reminders summary could not be loaded.",
      },
      {
        status: 500,
      }
    );
  }
}
