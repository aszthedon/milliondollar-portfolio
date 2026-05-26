import { calendar }
from "./google";

interface UpdateEventProps {
  calendarEventId: string;
  customerEmail: string;
  bookingDate: string;
  bookingTime: string;
  timezone: string;
}

export async function
updateCalendarEvent({
  calendarEventId,
  customerEmail,
  bookingDate,
  bookingTime,
  timezone,
}: UpdateEventProps) {
  try {
    const [hour, minute] =
      bookingTime.split(":");

    const startDate =
      new Date(
        Number(
          bookingDate.split("-")[0]
        ),
        Number(
          bookingDate.split("-")[1]
        ) - 1,
        Number(
          bookingDate.split("-")[2]
        ),
        Number(hour),
        Number(minute)
      );

    const endDate =
      new Date(
        startDate.getTime() +
          60 * 60 * 1000
      );

    const event =
      await calendar.events.patch({
        calendarId:
          "primary",

        eventId:
          calendarEventId,

        requestBody: {
          summary:
            "Rescheduled Client Booking",

          description:
            `Booking for ${customerEmail}`,

          start: {
            dateTime:
              startDate
                .toLocaleString(
                  "sv-SE"
                )
                .replace(
                  " ",
                  "T"
                ),

            timeZone:
              timezone,
          },

          end: {
            dateTime:
              endDate
                .toLocaleString(
                  "sv-SE"
                )
                .replace(
                  " ",
                  "T"
                ),

            timeZone:
              timezone,
          },

          attendees: [
            {
              email:
                customerEmail,
            },
          ],
        },
      });

    console.log(
      "GOOGLE EVENT UPDATED:",
      event.data.id
    );

    return true;
  } catch (error) {
    console.error(
      "UPDATE CALENDAR EVENT ERROR:",
      error
    );

    return false;
  }
}