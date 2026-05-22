import { google } from "googleapis";

import { NextResponse } from "next/server";

export async function GET(
  request: Request
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const code =
      searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        {
          error:
            "No code provided",
        },
        {
          status: 400,
        }
      );
    }

    const oauth2Client =
      new google.auth.OAuth2(
        process.env
          .GOOGLE_CLIENT_ID,

        process.env
          .GOOGLE_CLIENT_SECRET,

        "https://orange-rotary-phone-4q647rrgq9wc5jrq-3000.app.github.dev/api/google/callback"
      );

    const {
      tokens,
    } =
      await oauth2Client.getToken(
        code
      );

    console.log(
      "GOOGLE TOKENS:",
      tokens
    );

    return NextResponse.redirect(
      "https://orange-rotary-phone-4q647rrgq9wc5jrq-3000.app.github.dev/dashboard"
    );
  } catch (error) {
    console.error(
      "GOOGLE CALLBACK ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Google authentication failed",
      },
      {
        status: 500,
      }
    );
  }
}