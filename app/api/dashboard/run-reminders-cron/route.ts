import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";

function getSiteUrl(request: Request) {
  const url = new URL(request.url);

  return `${url.protocol}//${url.host}`;
}

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const days = Number(body.days ?? 1);

    const safeDays = Number.isFinite(days) && days >= 0 ? Math.min(days, 14) : 1;

    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        {
          error: "CRON_SECRET is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const response = await fetch(
      `${getSiteUrl(request)}/api/cron/reminders?days=${safeDays}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${cronSecret}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data.error ?? "Reminders cron could not run.",
        },
        {
          status: response.status,
        }
      );
    }

    return NextResponse.json({
      result: data,
      message: data.message ?? "Reminders cron ran.",
    });
  } catch (error) {
    console.error("RUN REMINDERS CRON ERROR:", error);

    return NextResponse.json(
      {
        error: "Unexpected error running reminders cron.",
      },
      {
        status: 500,
      }
    );
  }
}