import { NextResponse } from "next/server";
import Stripe from "stripe";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

function getStripe() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  return new Stripe(stripeSecretKey);
}

function getSiteUrl(request: Request) {
  const fallbackUrl = new URL(request.url);

  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${fallbackUrl.protocol}//${fallbackUrl.host}`
  ).replace(/\/$/, "");
}

function getBookingId(body: Record<string, unknown>) {
  return Number(body.booking_id ?? body.bookingId ?? body.id);
}

function getAmountInDollars(booking: Record<string, unknown>) {
  const possibleValues = [
    booking.remaining_balance,
    booking.balance_due,
    booking.balance_amount,
    booking.amount_remaining,
  ];

  for (const value of possibleValues) {
    const numberValue = Number(value);

    if (Number.isFinite(numberValue) && numberValue > 0) {
      return numberValue;
    }
  }

  const total = Number(
    booking.total_amount ?? booking.total_price ?? booking.price ?? 0
  );

  const paid = Number(
    booking.amount_paid ?? booking.deposit_paid ?? booking.amount_due_now ?? 0
  );

  const computedBalance = total - paid;

  return computedBalance > 0 ? computedBalance : total;
}

function getBookingLabel(booking: Record<string, unknown>) {
  return String(
    booking.service_name ||
      booking.service_title ||
      booking.title ||
      booking.event_title ||
      `Booking #${booking.id}`
  );
}

function getCustomerEmail(booking: Record<string, unknown>) {
  const email = String(
    booking.customer_email ||
      booking.client_email ||
      booking.email ||
      ""
  ).trim();

  return email || undefined;
}

async function updateBookingAfterCheckout({
  bookingId,
  sessionId,
  url,
}: {
  bookingId: number;
  sessionId: string;
  url: string | null;
}) {
  const richUpdate = {
    stripe_balance_session_id: sessionId,
    balance_checkout_url: url,
    balance_status: "checkout_created",
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
      stripe_session_id: sessionId,
    })
    .eq("id", bookingId);
}

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const bookingId = getBookingId(body);

    if (!Number.isFinite(bookingId)) {
      return NextResponse.json(
        {
          error: "A valid booking ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError) {
      throw bookingError;
    }

    if (!booking) {
      return NextResponse.json(
        {
          error: "Booking was not found.",
        },
        {
          status: 404,
        }
      );
    }

    const amountInDollars = getAmountInDollars(booking);

    if (!Number.isFinite(amountInDollars) || amountInDollars <= 0) {
      return NextResponse.json(
        {
          error: "This booking does not have a valid remaining balance.",
        },
        {
          status: 400,
        }
      );
    }

    const stripe = getStripe();
    const siteUrl = getSiteUrl(request);
    const amountInCents = Math.round(amountInDollars * 100);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: getCustomerEmail(booking),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountInCents,
            product_data: {
              name: `${getBookingLabel(booking)} - Remaining Balance`,
              description: `Remaining balance for booking #${bookingId}`,
            },
          },
        },
      ],
      success_url: `${siteUrl}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/#booking`,
      metadata: {
        type: "booking_balance",
        booking_id: String(bookingId),
      },
      payment_intent_data: {
        metadata: {
          type: "booking_balance",
          booking_id: String(bookingId),
        },
      },
    });

    await updateBookingAfterCheckout({
      bookingId,
      sessionId: session.id,
      url: session.url,
    });

    return NextResponse.json({
      session_id: session.id,
      url: session.url,
      message: "Balance checkout created.",
    });
  } catch (error) {
    console.error("CREATE BOOKING BALANCE CHECKOUT ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Balance checkout could not be created.",
      },
      {
        status: 500,
      }
    );
  }
}