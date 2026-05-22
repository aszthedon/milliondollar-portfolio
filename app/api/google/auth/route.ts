import { google } from "googleapis";

export async function GET() {
  const oauth2Client =
    new google.auth.OAuth2(
      process.env
        .GOOGLE_CLIENT_ID,

      process.env
        .GOOGLE_CLIENT_SECRET,

      "https://orange-rotary-phone-4q647rrgq9wc5jrq-3000.app.github.dev/api/google/callback"
    );

  const scopes = [
    "https://www.googleapis.com/auth/calendar",
  ];

  const url =
    oauth2Client.generateAuthUrl({
      access_type: "offline",

      scope: scopes,
    });

  return Response.redirect(url);
}