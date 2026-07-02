import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const body = await request.json().catch(() => ({}));

    const days = Number(body.days ?? 365);

    const safeDays =
      Number.isFinite(days) && days >= 1 ? Math.min(days, 3650) : 365;

    const response = await fetch(
      `${new URL(request.url).origin}/api/dashboard/cron-run-logs/clear`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          ...Object.fromEntries(request.headers.entries()),
        },
        body: JSON.stringify({
          days: safeDays,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data.error ?? "Cron log cleanup could not run.",
        },
        {
          status: response.status,
        }
      );
    }

    return NextResponse.json({
      result: data,
      message: data.message ?? "Cron log cleanup ran.",
    });
  } catch (error) {
    console.error("RUN CRON LOG CLEANUP ERROR:", error);

    return NextResponse.json(
      {
        error: "Unexpected error running cron log cleanup.",
      },
      {
        status: 500,
      }
    );
  }
}