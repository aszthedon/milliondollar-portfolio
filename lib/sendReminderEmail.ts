import { Resend } from "resend";

const resend =
  new Resend(
    process.env.RESEND_API_KEY
  );

interface ReminderProps {
  customerEmail: string;
  bookingDate: string;
  bookingTime: string;
  timezone: string;
  meetingLink?: string | null;
}

export async function sendReminderEmail({
  customerEmail,
  bookingDate,
  bookingTime,
  timezone,
  meetingLink,
}: ReminderProps) {
  return resend.emails.send({
    from:
      "Million Dollar Ticket Productions <onboarding@resend.dev>",

    to: customerEmail,

    subject:
      "Booking Reminder",

    html: `
      <div style="font-family:sans-serif;padding:24px;background:#000;color:#fff;">
        <h1>
          Upcoming Booking Reminder
        </h1>

        <p>
          Your booking is approaching.
        </p>

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

        ${
          meetingLink
            ? `
        <a
          href="${meetingLink}"
          style="
            display:inline-block;
            margin-top:20px;
            padding:12px 20px;
            background:white;
            color:black;
            text-decoration:none;
            border-radius:999px;
          "
        >
          Join Meeting
        </a>
        `
            : ""
        }
      </div>
    `,
  });
}