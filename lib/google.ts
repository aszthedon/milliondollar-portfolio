import { google } from "googleapis";

const oauth2Client =
  new google.auth.OAuth2(
    process.env
      .GOOGLE_CLIENT_ID,

    process.env
      .GOOGLE_CLIENT_SECRET,

    "https://orange-rotary-phone-4q647rrgq9wc5jrq-3000.app.github.dev/api/google/callback"
  );

oauth2Client.setCredentials({
  refresh_token:
    process.env
      .GOOGLE_REFRESH_TOKEN,
});

export const calendar =
  google.calendar({
    version: "v3",
    auth: oauth2Client,
  });