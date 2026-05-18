import Stripe from "stripe";

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

    // future:
    // update booking
    // send email
    // generate invoice
  }

  return new Response("Success", {
    status: 200,
  });
}