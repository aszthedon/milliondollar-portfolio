import { google } from "googleapis";

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function htmlResponse(content: string, status = 200) {
  return new Response(
    `<!DOCTYPE html>
<html>
  <head>
    <title>Google Calendar Auth</title>
    <style>
      body {
        background: #000;
        color: #fff;
        font-family: Arial, sans-serif;
        padding: 40px;
      }

      .card {
        max-width: 900px;
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 24px;
        padding: 32px;
        background: rgba(255,255,255,0.06);
      }

      code, pre {
        display: block;
        white-space: pre-wrap;
        word-break: break-all;
        background: rgba(0,0,0,0.5);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 16px;
        padding: 18px;
        color: #86efac;
      }

      a {
        color: #93c5fd;
      }
    </style>
  </head>
  <body>
    <div class="card">
      ${content}
    </div>
  </body>
</html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html",
      },
    }
  );
}

export async function GET(request: Request) {
  try {
    const siteUrl = getSiteUrl();

    const { searchParams } =
      new URL(request.url);

    const code =
      searchParams.get("code");

    const error =
      searchParams.get("error");

    if (error) {
      return htmlResponse(
        `
          <h1>Google Auth Failed</h1>
          <p>Google returned this error:</p>
          <pre>${error}</pre>
          <p><a href="/api/google/auth">Try again</a></p>
        `,
        400
      );
    }

    if (!code) {
      return htmlResponse(
        `
          <h1>No Code Provided</h1>
          <p>Google did not send an authorization code back.</p>
          <p><a href="/api/google/auth">Try again</a></p>
        `,
        400
      );
    }

    const oauth2Client =
      new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${siteUrl}/api/google/callback`
      );

    const { tokens } =
      await oauth2Client.getToken(code);

    const refreshToken =
      tokens.refresh_token;

    if (!refreshToken) {
      return htmlResponse(
        `
          <h1>No Refresh Token Returned</h1>
          <p>Google authenticated successfully, but did not return a new refresh token.</p>
          <p>This usually means you already approved this app before. Go to your Google Account permissions, remove this app, then try again.</p>
          <p><a href="/api/google/auth">Try again</a></p>
        `,
        200
      );
    }

    return htmlResponse(
      `
        <h1>Google Calendar Connected</h1>
        <p>Copy this refresh token into your <strong>.env.local</strong> file:</p>
        <pre>GOOGLE_REFRESH_TOKEN=${refreshToken}</pre>

        <p>Then restart your dev server:</p>
        <code>CTRL + C
npm run dev</code>

        <p>After restarting, test checkout again. The booking should save a meeting link and calendar event ID.</p>

        <p><a href="/dashboard">Go to dashboard</a></p>
      `
    );
  } catch (error) {
    console.error(
      "GOOGLE CALLBACK ERROR:",
      error
    );

    return htmlResponse(
      `
        <h1>Google Authentication Failed</h1>
        <p>Check your terminal for the full <strong>GOOGLE CALLBACK ERROR</strong>.</p>
        <pre>${String(error)}</pre>
        <p><a href="/api/google/auth">Try again</a></p>
      `,
      500
    );
  }
}