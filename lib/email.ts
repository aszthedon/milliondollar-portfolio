import { Resend } from "resend";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

export async function sendBookingEmail(
  customerEmail: string,
  serviceName: string
) {
  try {
    await resend.emails.send({
      from:
        "Million Dollar Ticket Productions <onboarding@resend.dev>",

      to: customerEmail,

      subject:
        "Booking Confirmation",

      html: `
        <div style="font-family: sans-serif; padding: 40px;">
          <h1>Booking Confirmed</h1>

          <p>
            Your booking for
            <strong>${serviceName}</strong>
            has been received.
          </p>

          <p>
            We look forward to working with you.
          </p>
        </div>
      `,
    });

    console.log(
      "BOOKING EMAIL SENT"
    );
  } catch (error) {
    console.error(
      "EMAIL ERROR:",
      error
    );
  }
}