import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY!,
  {
    apiVersion:
      "2026-04-22.dahlia",
  }
);

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const {
      service_name,
      price,
      customer_email,
      booking_date,
      booking_time,
      notes,
      timezone,
      client_id,
    } = body;

    const {
      data: existingBooking,
    } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq(
        "booking_date",
        booking_date
      )
      .eq(
        "booking_time",
        booking_time
      )
      .neq(
        "status",
        "cancelled"
      )
      .maybeSingle();

    if (existingBooking) {
      return NextResponse.json(
        {
          error:
            "This slot is already booked.",
        },
        {
          status: 409,
        }
      );
    }

    const {
      data: booking,
      error,
    } =
      await supabaseAdmin
        .from("bookings")
        .insert({
          customer_email,
          booking_date,
          booking_time,
          payment_status:
            "pending",
          status: "pending",
          notes,
          timezone,
          client_id,
        })
        .select()
        .single();

    if (error || !booking) {
      console.error(error);

      return NextResponse.json(
        {
          error:
            "Booking creation failed.",
        },
        {
          status: 500,
        }
      );
    }

    await supabaseAdmin
      .from("availability")
      .delete()
      .eq(
        "available_date",
        booking_date
      )
      .eq(
        "available_time",
        booking_time
      );

    const session =
      await stripe.checkout.sessions.create(
        {
          mode: "payment",

          customer_email,

          payment_method_types:
            ["card"],

          line_items: [
            {
              price_data: {
                currency:
                  "usd",

                product_data:
                  {
                    name:
                      service_name,
                  },

                unit_amount:
                  Math.round(
                    price * 100
                  ),
              },

              quantity: 1,
            },
          ],

          metadata: {
            bookingId:
              booking.id.toString(),
          },

          success_url:
            "https://orange-rotary-phone-4q647rrgq9wc5jrq-3000.app.github.dev/success",

          cancel_url:
            "https://orange-rotary-phone-4q647rrgq9wc5jrq-3000.app.github.dev/cancel",
        }
      );

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Checkout failed.",
      },
      {
        status: 500,
      }
    );
  }
}