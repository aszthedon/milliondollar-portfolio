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
      `${getSiteUrl(request)}/api/cron/admin-security-snapshot`,
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
          error: data.error ?? "Admin security snapshot could not be run.",
        },
        {
          status: response.status,
        }
      );
    }

    return NextResponse.json({
      result: data,
      message: data.message ?? "Admin security snapshot ran successfully.",
    });
  } catch (error) {
    console.error("RUN ADMIN SECURITY SNAPSHOT ERROR:", error);

    return NextResponse.json(
      {
        error: "Unexpected error running admin security snapshot.",
      },
      {
        status: 500,
      }
    );
  }
}