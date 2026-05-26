import { Resend } from "resend";

const resend =
  new Resend(
    process.env.RESEND_API_KEY
  );

interface SendRescheduleEmailProps {
  customerEmail: string;
  bookingDate: string;
  bookingTime: string;
  timezone: string;
  meetingLink?: string | null;
}

export async function sendRescheduleEmail({
  customerEmail,
  bookingDate,
  bookingTime,
  timezone,
  meetingLink,
}: SendRescheduleEmailProps) {
  try {
    const response =
      await resend.emails.send({
        from:
          "Million Dollar Ticket Productions <onboarding@resend.dev>",

        to:
          customerEmail,

        subject:
          "Booking Rescheduled",

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
              Booking Rescheduled
            </h1>

            <p>
              Your booking has been successfully rescheduled.
            </p>

            <div style="
              margin-top:32px;
            ">
              <p>
                <strong>New Date:</strong>
                ${bookingDate}
              </p>

              <p>
                <strong>New Time:</strong>
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
                <div style="
                  margin-top:32px;
                ">
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
                    Join Meeting
                  </a>
                </div>
              `
                : ""
            }

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
      "RESCHEDULE EMAIL RESPONSE:",
      response
    );

    console.log(
      "RESCHEDULE EMAIL SENT"
    );
  } catch (error) {
    console.error(
      "RESCHEDULE EMAIL ERROR:",
      error
    );
  }
}