import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    admin_secret_configured: Boolean(
      process.env.ADMIN_DASHBOARD_SECRET ?? process.env.CRON_SECRET
    ),
    using_fallback_cron_secret: Boolean(
      !process.env.ADMIN_DASHBOARD_SECRET && process.env.CRON_SECRET
    ),
  });
}