import { Resend } from "resend";

const resend =
  new Resend(
    process.env.RESEND_API_KEY
  );

interface SendCancellationEmailProps {
  customerEmail: string;
  bookingDate: string;
  bookingTime: string;
  timezone: string;
}

export async function sendCancellationEmail({
  customerEmail,
  bookingDate,
  bookingTime,
  timezone,
}: SendCancellationEmailProps) {
  try {
    const response =
      await resend.emails.send({
        from:
          "Million Dollar Ticket Productions <onboarding@resend.dev>",

        to:
          customerEmail,

        subject:
          "Booking Cancelled",

        html: `
          <div style="
            font-family:sans-serif;
            padding:24px;
            background:black;
            color:white;
          ">
            <h1 style="
              font-size:32px;
              margin-bottom:24px;
            ">
              Booking Cancelled
            </h1>

            <p>
              Your booking has been cancelled.
            </p>

            <div style="
              margin-top:32px;
            ">
              <p>
                <strong>Date:</strong>
                ${bookingDate}
              </p>

              <p>
                <strong>Time:</strong>
                ${bookingTime}
              </p>

              <p>
                <strong>Timezone:</strong>
                ${timezone}
              </p>
            </div>

            <p style="
              margin-top:40px;
            ">
              If this was a mistake,
              you can schedule a new
              booking anytime.
            </p>

            <p style="
              margin-top:48px;
              color:#999;
            ">
              Million Dollar Ticket Productions
            </p>
          </div>
        `,
      });

    console.log(
      "CANCELLATION EMAIL RESPONSE:",
      response
    );

    console.log(
      "CANCELLATION EMAIL SENT"
    );
  } catch (error) {
    console.error(
      "CANCELLATION EMAIL ERROR:",
      error
    );
  }
}