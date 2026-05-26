import { calendar } from "./google";

interface CreateEventProps {
  customerEmail: string;
  bookingDate: string;
  bookingTime: string;
  timezone: string;
}

export async function createCalendarEvent({
  customerEmail,
  bookingDate,
  bookingTime,
  timezone,
}: CreateEventProps) {
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
      await calendar.events.insert({
        calendarId:
          "primary",

        conferenceDataVersion: 1,

        requestBody: {
          summary:
            "New Client Booking",

          description: `Booking for ${customerEmail}`,

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

          conferenceData: {
            createRequest: {
              requestId:
                Math.random()
                  .toString(36)
                  .substring(2),
            },
          },
        },
      });

    const meetingLink =
      event.data
        .hangoutLink ??
      null;

    const calendarEventId =
      event.data.id ??
      null;

    console.log(
      "GOOGLE MEET LINK:",
      meetingLink
    );

    console.log(
      "GOOGLE EVENT ID:",
      calendarEventId
    );

    return {
      meetingLink,
      calendarEventId,
    };
  } catch (error) {
    console.error(
      "GOOGLE CALENDAR ERROR:",
      error
    );

    return {
      meetingLink: null,
      calendarEventId: null,
    };
  }
}