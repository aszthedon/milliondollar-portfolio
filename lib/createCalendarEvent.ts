import { google } from "googleapis";

interface CreateEventProps {
  siteSlug?: string;
  customerEmail: string;
  bookingDate: string;
  bookingTime: string;
  bookingEndTime: string;
  timezone: string;
}

export async function createCalendarEvent({
  siteSlug,
  customerEmail,
  bookingDate,
  bookingTime,
  bookingEndTime,
  timezone,
}: CreateEventProps) {

  try {

    // The named site must use its own refresh token, never the MDT calendar token.
    const refreshToken = siteSlug === "fix-my-crown"
      ? process.env.GOOGLE_FIX_MY_CROWN_REFRESH_TOKEN
      : process.env.GOOGLE_REFRESH_TOKEN;
    if (!refreshToken) {
      console.error("Google Calendar is not connected for site:", siteSlug);
      return { meetingLink: null, calendarEventId: null };
    }
    const oauth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth.setCredentials({ refresh_token: refreshToken });
    const calendar = google.calendar({ version: "v3", auth: oauth });
    // Use local clock times and an explicit IANA timezone. Creating a Date here
    // would silently apply the server's timezone instead of the booking's.
    const startDateTime = `${bookingDate}T${bookingTime.slice(0, 5)}:00`;
    const endDateTime = `${bookingDate}T${bookingEndTime.slice(0, 5)}:00`;

    const event =
      await calendar
        .events
        .insert({

          calendarId:
            "primary",

          conferenceDataVersion:
            1,

          requestBody: {

            summary:
              "New Client Booking",

            description:
`Booking for ${customerEmail}`,

            start: {

              dateTime:
                startDateTime,

              timeZone:
                timezone,
            },

            end: {

              dateTime:
                endDateTime,

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
                    .toString(
                      36
                    )
                    .substring(
                      2
                    ),
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
      meetingLink:
        null,

      calendarEventId:
        null,
    };
  }
}