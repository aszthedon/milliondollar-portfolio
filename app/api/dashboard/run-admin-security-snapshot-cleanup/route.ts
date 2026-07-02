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

    const rawDays = Number(body.days ?? 90);
    const retentionDays =
      Number.isFinite(rawDays) && rawDays >= 1 ? Math.min(rawDays, 365) : 90;

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
      `${getSiteUrl(
        request
      )}/api/cron/cleanup-admin-security-snapshots?days=${retentionDays}`,
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
          error:
            data.error ?? "Admin security snapshot cleanup could not be run.",
        },
        {
          status: response.status,
        }
      );
    }

    return NextResponse.json({
      result: data,
      message:
        data.message ?? "Admin security snapshot cleanup ran successfully.",
    });
  } catch (error) {
    console.error("RUN ADMIN SECURITY SNAPSHOT CLEANUP ERROR:", error);

    return NextResponse.json(
      {
        error: "Unexpected error running admin security snapshot cleanup.",
      },
      {
        status: 500,
      }
    );
  }
}