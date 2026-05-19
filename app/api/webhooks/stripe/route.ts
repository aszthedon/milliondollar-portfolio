import Stripe from "stripe";

import { sendBookingEmail } from "@/lib/email";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY as string
);

const endpointSecret =
  process.env
    .STRIPE_WEBHOOK_SECRET as string;

export async function POST(
  request: Request
) {
  const body = await request.text();

  const signature =
    request.headers.get(
      "stripe-signature"
    ) as string;

  let event: Stripe.Event;

  try {
    event =
      stripe.webhooks.constructEvent(
        body,
        signature,
        endpointSecret
      );
  } catch (err) {
    console.error(
      "Webhook signature verification failed.",
      err
    );

    return new Response(
      "Webhook Error",
      {
        status: 400,
      }
    );
  }

  if (
    event.type ===
    "checkout.session.completed"
  ) {
    const session = event.data
      .object as Stripe.Checkout.Session;

    console.log(
      "PAYMENT SUCCESS:",
      session.id
    );

    const bookingId =
      session.metadata?.bookingId;

    if (bookingId) {
      const { createClient } =
        await import(
          "@supabase/supabase-js"
        );

      const supabase = createClient(
        process.env
          .NEXT_PUBLIC_SUPABASE_URL as string,

        process.env
          .SUPABASE_SERVICE_ROLE_KEY as string
      );

      await supabase
        .from("bookings")
        .update({
          payment_status: "paid",
        })
        .eq("id", bookingId);

      console.log(
        "BOOKING MARKED PAID:",
        bookingId
      );

      const booking =
        await supabase
          .from("bookings")
          .select("*")
          .eq("id", bookingId)
          .single();

      if (
        booking.data?.customer_email
      ) {
        await sendBookingEmail(
          booking.data
            .customer_email,

          "Your Booking"
        );
      }
    }
  }

  return new Response("Success", {
    status: 200,
  });
}