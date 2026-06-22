import Stripe from "stripe";

import { createClient } from "@supabase/supabase-js";

import { sendBookingEmail } from "@/lib/sendBookingEmail";
import { createCalendarEvent } from "@/lib/createCalendarEvent";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY as string
);

const endpointSecret =
  process.env.STRIPE_WEBHOOK_SECRET as string;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

function timeToMinutes(time: string) {
  const [hourString, minuteString] = time.split(":");

  return Number(hourString) * 60 + Number(minuteString ?? "0");
}

function minutesToTime(minutes: number) {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function addMinutesToTime(time: string, minutesToAdd: number) {
  return minutesToTime(timeToMinutes(time) + minutesToAdd);
}

function getBookingEndTime({
  bookingTime,
  bookingEndTime,
  metadataEndTime,
}: {
  bookingTime: string;
  bookingEndTime: string | null;
  metadataEndTime: string | undefined;
}) {
  if (bookingEndTime) {
    return bookingEndTime;
  }

  if (metadataEndTime) {
    return metadataEndTime;
  }

  return addMinutesToTime(bookingTime, 60);
}

function parseMoney(value: string | undefined) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.round(parsed * 100) / 100;
}

async function incrementDiscountUsage(
  bookingId: number,
  discountCode: string
) {
  if (!discountCode) {
    return;
  }

  try {
    const cleanCode = discountCode.trim().toUpperCase();

    const { error } = await supabase.rpc(
      "increment_discount_usage_once",
      {
        p_booking_id: bookingId,
        p_discount_code: cleanCode,
      }
    );

    if (error) {
      console.error("DISCOUNT USAGE RPC ERROR:", error);
      return;
    }

    console.log(
      "DISCOUNT USAGE COUNTED:",
      cleanCode,
      "BOOKING:",
      bookingId
    );
  } catch (error) {
    console.error("DISCOUNT USAGE ERROR:", error);
  }
}

export async function POST(request: Request) {
  const body = await request.text();

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing Stripe signature", {
      status: 400,
    });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      endpointSecret
    );
  } catch (err) {
    console.error("Webhook signature verification failed.", err);

    return new Response("Webhook Error", {
      status: 400,
    });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const bookingId = session.metadata?.bookingId;

    if (!bookingId) {
      return new Response("Missing booking ID", {
        status: 400,
      });
    }

    if (session.payment_status !== "paid") {
      console.log(
        "CHECKOUT COMPLETED BUT PAYMENT NOT PAID:",
        bookingId,
        session.payment_status
      );

      return new Response("Payment not paid yet", {
        status: 200,
      });
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("BOOKING LOOKUP ERROR:", bookingError);

      return new Response("Booking missing", {
        status: 404,
      });
    }

    const wasAlreadyConfirmed =
      booking.payment_status === "paid" &&
      booking.status === "confirmed";

    const alreadyHasCalendarEvent = Boolean(
      booking.meeting_link && booking.calendar_event_id
    );

    if (wasAlreadyConfirmed && alreadyHasCalendarEvent) {
      console.log(
        "DUPLICATE WEBHOOK IGNORED. BOOKING ALREADY CONFIRMED:",
        bookingId
      );

      return new Response("Already processed", {
        status: 200,
      });
    }

    const bookingEndTime = getBookingEndTime({
      bookingTime: booking.booking_time,
      bookingEndTime: booking.booking_end_time,
      metadataEndTime: session.metadata?.bookingEndTime,
    });

    const originalPrice = parseMoney(
      session.metadata?.originalPrice
    );

    const discountCode =
      session.metadata?.discountCode?.trim().toUpperCase() ??
      booking.discount_code ??
      "";

    const discountAmount = parseMoney(
      session.metadata?.discountAmount
    );

    const amountDueNow = parseMoney(
      session.metadata?.amountDueNow
    );

    const remainingBalance = parseMoney(
      session.metadata?.remainingBalance
    );

    const paymentMode =
      session.metadata?.paymentMode ||
      booking.payment_mode ||
      "full";

    const balanceStatus =
      paymentMode === "deposit" && remainingBalance > 0
        ? booking.balance_status || "balance_due"
        : "not_applicable";

    let meetingLink: string | null =
      booking.meeting_link ?? null;

    let calendarEventId: string | null =
      booking.calendar_event_id ?? null;

    if (!meetingLink || !calendarEventId) {
      const calendarResult = await createCalendarEvent({
        customerEmail: booking.customer_email,
        bookingDate: booking.booking_date,
        bookingTime: booking.booking_time,
        bookingEndTime,
        timezone: booking.timezone,
      });

      meetingLink = calendarResult.meetingLink ?? meetingLink;
      calendarEventId =
        calendarResult.calendarEventId ?? calendarEventId;
    } else {
      console.log(
        "CALENDAR EVENT ALREADY EXISTS FOR BOOKING:",
        bookingId
      );
    }

    const updatePayload: Record<string, unknown> = {
      payment_status: "paid",
      status: "confirmed",
      booking_end_time: bookingEndTime,
      meeting_link: meetingLink,
      calendar_event_id: calendarEventId,
      payment_mode: paymentMode,
      balance_status: balanceStatus,
    };

    if (originalPrice > 0) {
      updatePayload.original_price = originalPrice;
    }

    if (discountCode) {
      updatePayload.discount_code = discountCode;
    }

    if (discountAmount > 0) {
      updatePayload.discount_amount = discountAmount;
    }

    if (amountDueNow > 0) {
      updatePayload.amount_due_now = amountDueNow;
      updatePayload.price_paid = amountDueNow;
    }

    if (paymentMode === "deposit") {
      updatePayload.deposit_amount = amountDueNow;
      updatePayload.remaining_balance = remainingBalance;
    } else {
      updatePayload.deposit_amount = 0;
      updatePayload.remaining_balance = 0;
    }

    const { error: updateError } = await supabase
      .from("bookings")
      .update(updatePayload)
      .eq("id", bookingId);

    if (updateError) {
      console.error(
        "BOOKING CONFIRMATION UPDATE ERROR:",
        updateError
      );

      return new Response("Booking update failed", {
        status: 500,
      });
    }

    if (discountCode) {
      await incrementDiscountUsage(Number(bookingId), discountCode);
    }

    if (!wasAlreadyConfirmed) {
      try {
        await sendBookingEmail({
          customerEmail: booking.customer_email,
          bookingDate: booking.booking_date,
          bookingTime: booking.booking_time,
          timezone: booking.timezone,
          meetingLink,
        });
      } catch (emailError) {
        console.error("BOOKING EMAIL ERROR:", emailError);
      }
    } else {
      console.log(
        "EMAIL SKIPPED. BOOKING ALREADY CONFIRMED:",
        bookingId
      );
    }

    console.log("BOOKING CONFIRMED:", bookingId);
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;

    const bookingId = session.metadata?.bookingId;

    if (!bookingId) {
      return new Response("Success", {
        status: 200,
      });
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("EXPIRED BOOKING LOOKUP ERROR:", bookingError);

      return new Response("Success", {
        status: 200,
      });
    }

    if (
      booking.payment_status === "paid" ||
      booking.status === "confirmed"
    ) {
      console.log(
        "EXPIRED SESSION IGNORED. BOOKING ALREADY PAID:",
        bookingId
      );

      return new Response("Success", {
        status: 200,
      });
    }

    if (booking.status === "cancelled") {
      console.log(
        "EXPIRED SESSION IGNORED. BOOKING ALREADY CANCELLED:",
        bookingId
      );

      return new Response("Success", {
        status: 200,
      });
    }

    const bookingEndTime = getBookingEndTime({
      bookingTime: booking.booking_time,
      bookingEndTime: booking.booking_end_time,
      metadataEndTime: session.metadata?.bookingEndTime,
    });

    const { data: existingAvailability } = await supabase
      .from("availability")
      .select("id")
      .eq("available_date", booking.booking_date)
      .eq("start_time", booking.booking_time)
      .eq("end_time", bookingEndTime)
      .maybeSingle();

    if (!existingAvailability) {
      await supabase.from("availability").insert({
        available_date: booking.booking_date,
        available_time: booking.booking_time,
        start_time: booking.booking_time,
        end_time: bookingEndTime,
        timezone: booking.timezone,
      });
    }

    const { error: cancelError } = await supabase
      .from("bookings")
      .update({
        payment_status: "failed",
        status: "cancelled",
        balance_status: "cancelled",
      })
      .eq("id", bookingId);

    if (cancelError) {
      console.error("EXPIRED BOOKING CANCEL ERROR:", cancelError);
    }
  }

  return new Response("Success", {
    status: 200,
  });
}