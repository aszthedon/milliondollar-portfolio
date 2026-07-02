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
      `${new URL(request.url).origin}/api/dashboard/system-health-snapshots/clear`,
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
          error: data.error ?? "System health snapshot cleanup could not run.",
        },
        {
          status: response.status,
        }
      );
    }

    return NextResponse.json({
      result: data,
      message: data.message ?? "System health snapshot cleanup ran.",
    });
  } catch (error) {
    console.error("RUN SYSTEM HEALTH SNAPSHOT CLEANUP ERROR:", error);

    return NextResponse.json(
      {
        error: "Unexpected error running system health snapshot cleanup.",
      },
      {
        status: 500,
      }
    );
  }
}