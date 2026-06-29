import { NextResponse } from "next/server";
import Stripe from "stripe";

import { supabaseAdmin } from "@/lib/supabase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

function getSiteUrl(request: Request) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    request.headers.get("origin") ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const bookingId = Number(body.bookingId);

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
      .single();

    if (bookingError || !booking) {
      console.error("BALANCE CHECKOUT BOOKING LOOKUP ERROR:", bookingError);

      return NextResponse.json(
        {
          error: "Booking could not be found.",
        },
        {
          status: 404,
        }
      );
    }

    const remainingBalance = roundMoney(Number(booking.remaining_balance ?? 0));

    if (remainingBalance <= 0) {
      return NextResponse.json(
        {
          error: "This booking does not have a remaining balance.",
        },
        {
          status: 400,
        }
      );
    }

    if (booking.balance_status === "balance_paid") {
      return NextResponse.json(
        {
          error: "This booking balance is already marked paid.",
        },
        {
          status: 400,
        }
      );
    }

    if (!booking.customer_email) {
      return NextResponse.json(
        {
          error: "This booking does not have a customer email.",
        },
        {
          status: 400,
        }
      );
    }

    const siteUrl = getSiteUrl(request);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: booking.customer_email,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Remaining Balance — Booking #${booking.id}`,
              description:
                "Final balance payment after deposit was already collected.",
            },
            unit_amount: Math.round(remainingBalance * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        paymentType: "balance_payment",
        bookingId: String(booking.id),
        clientEmail: booking.customer_email,
        balanceAmount: remainingBalance.toFixed(2),
        totalAmount: remainingBalance.toFixed(2),
      },
      success_url: `${siteUrl}/dashboard/bookings?balancePaid=${booking.id}`,
      cancel_url: `${siteUrl}/dashboard/bookings?balanceCancelled=${booking.id}`,
    });

    const { error: updateError } = await supabaseAdmin
      .from("bookings")
      .update({
        balance_payment_link: session.url,
        balance_stripe_session_id: session.id,
        balance_status: "balance_link_sent",
      })
      .eq("id", booking.id);

    if (updateError) {
      console.error("BALANCE CHECKOUT UPDATE ERROR:", updateError);
    }

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error("BALANCE CHECKOUT ERROR:", error);

    return NextResponse.json(
      {
        error: "Balance checkout could not be created.",
      },
      {
        status: 500,
      }
    );
  }
}