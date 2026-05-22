import { Resend } from "resend";

const resend =
  new Resend(
    process.env.RESEND_API_KEY
  );

interface SendBookingEmailProps {
  customerEmail: string;
  bookingDate: string;
  bookingTime: string;
  timezone: string;
  meetingLink?: string | null;
}

export async function sendBookingEmail({
  customerEmail,
  bookingDate,
  bookingTime,
  timezone,
  meetingLink,
}: SendBookingEmailProps) {
  try {
    const response =
      await resend.emails.send({
        from:
          "Million Dollar Ticket Productions <onboarding@resend.dev>",

        to: customerEmail,

        subject:
          "Booking Confirmation",

        html: `
          <div style="font-family:sans-serif;padding:24px;background:black;color:white;">
            <h1 style="font-size:32px;margin-bottom:24px;">
              Booking Confirmed
            </h1>

            <p>
              Your booking has been successfully confirmed.
            </p>

            <div style="margin-top:32px;">
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

            ${
              meetingLink
                ? `
              <div style="margin-top:32px;">
                <a
                  href="${meetingLink}"
                  style="
                    display:inline-block;
                    padding:12px 20px;
                    background:white;
                    color:black;
                    border-radius:999px;
                    text-decoration:none;
                    font-weight:bold;
                  "
                >
                  Join Google Meet
                </a>
              </div>
            `
                : ""
            }

            <p style="margin-top:48px;color:#999;">
              Million Dollar Ticket Productions
            </p>
          </div>
        `,
      });

    console.log(
      "RESEND RESPONSE:",
      response
    );

    console.log(
      "BOOKING EMAIL SENT"
    );
  } catch (error) {
    console.error(
      "EMAIL ERROR:",
      error
    );

    console.error(error);
  }
}