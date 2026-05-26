import { NextResponse }
from "next/server";

import { supabaseAdmin }
from "@/lib/supabase-admin";

import { sendReminderEmail }
from "@/lib/sendReminderEmail";

export async function GET() {
  try {
    const now =
      new Date();

    const twentyFourHours =
      new Date(
        now.getTime() +
          24 *
            60 *
            60 *
            1000
      );

    const oneHour =
      new Date(
        now.getTime() +
          60 *
            60 *
            1000
      );

    const { data: bookings }
      = await supabaseAdmin
        .from("bookings")
        .select("*")
        .eq(
          "payment_status",
          "paid"
        )
        .eq(
          "status",
          "confirmed"
        );

    if (!bookings)
      return NextResponse.json({
        success: true,
      });

    for (const booking of bookings) {
      const bookingDateTime =
        new Date(
          `${booking.booking_date}T${booking.booking_time}`
        );

      const diff =
        bookingDateTime
          .getTime() -
        now.getTime();

      const within24h =
        diff <=
          24 *
            60 *
            60 *
            1000 &&
        diff >
          23 *
            60 *
            60 *
            1000;

      const within1h =
        diff <=
          60 *
            60 *
            1000 &&
        diff >
          59 *
            60 *
            1000;

      if (
        within24h &&
        !booking
          .reminder_24h_sent
      ) {
        await sendReminderEmail({
          customerEmail:
            booking.customer_email,

          bookingDate:
            booking.booking_date,

          bookingTime:
            booking.booking_time,

          timezone:
            booking.timezone,

          meetingLink:
            booking.meeting_link,
        });

        await supabaseAdmin
          .from("bookings")
          .update({
            reminder_24h_sent:
              true,
          })
          .eq(
            "id",
            booking.id
          );
      }

      if (
        within1h &&
        !booking
          .reminder_1h_sent
      ) {
        await sendReminderEmail({
          customerEmail:
            booking.customer_email,

          bookingDate:
            booking.booking_date,

          bookingTime:
            booking.booking_time,

          timezone:
            booking.timezone,

          meetingLink:
            booking.meeting_link,
        });

        await supabaseAdmin
          .from("bookings")
          .update({
            reminder_1h_sent:
              true,
          })
          .eq(
            "id",
            booking.id
          );
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "REMINDER CRON ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Reminder job failed",
      },
      {
        status: 500,
      }
    );
  }
}