import { NextResponse } from "next/server";

import Stripe from "stripe";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY as string
);

console.log(
  "STRIPE KEY EXISTS:",
  !!process.env.STRIPE_SECRET_KEY
);

export async function POST(
  request: Request
) {
  try {
    const body = await request.json();

    console.log(
      "CHECKOUT BODY:",
      body
    );

    const baseUrl =
      process.env
        .NEXT_PUBLIC_SITE_URL;

    const session =
      await stripe.checkout.sessions.create({
        payment_method_types: ["card"],

        mode: "payment",

        metadata: {
          bookingId: body.bookingId,
        },

        line_items: [
          {
            price_data: {
              currency: "usd",

              product_data: {
                name:
                  body.serviceName ||
                  "Booking Payment",
              },

              unit_amount:
                body.amount * 100,
            },

            quantity: 1,
          },
        ],

        success_url: `${baseUrl}/success`,

        cancel_url: `${baseUrl}/cancel`,
      });

    console.log(
      "CHECKOUT SESSION:",
      session.url
    );

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error(
      "STRIPE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to create checkout session",
      },
      {
        status: 500,
      }
    );
  }
}