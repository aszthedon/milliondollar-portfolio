import { google } from "googleapis";

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

const oauth2Client =
  new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${getSiteUrl()}/api/google/callback`
  );

oauth2Client.setCredentials({
  refresh_token:
    process.env.GOOGLE_REFRESH_TOKEN,
});

export const calendar =
  google.calendar({
    version: "v3",
    auth: oauth2Client,
  });