import { calendar }
from "./google";

export async function
deleteCalendarEvent(
  calendarEventId:
    string
) {
  try {
    if (
      !calendarEventId
    ) {
      return;
    }

    await calendar.events.delete({
      calendarId:
        "primary",

      eventId:
        calendarEventId,
    });

    console.log(
      "GOOGLE EVENT DELETED:",
      calendarEventId
    );
  } catch (error) {
    console.error(
      "DELETE CALENDAR EVENT ERROR:",
      error
    );
  }
}