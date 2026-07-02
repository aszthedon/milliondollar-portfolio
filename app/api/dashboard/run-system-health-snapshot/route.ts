import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

type HealthStatus = "healthy" | "warning" | "error";

async function safeCount(table: string) {
  const { count, error } = await supabaseAdmin.from(table).select("*", {
    count: "exact",
    head: true,
  });

  if (error) {
    return {
      table,
      count: 0,
      ok: false,
      error: error.message,
    };
  }

  return {
    table,
    count: count ?? 0,
    ok: true,
    error: null,
  };
}

async function safeLatestRows(table: string, limit = 5) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select("*")
    .order("created_at", {
      ascending: false,
    })
    .limit(limit);

  if (error) {
    return {
      table,
      rows: [],
      ok: false,
      error: error.message,
    };
  }

  return {
    table,
    rows: data ?? [],
    ok: true,
    error: null,
  };
}

function envStatus(name: string, required = false) {
  const exists = Boolean(process.env[name]);

  return {
    name,
    configured: exists,
    required,
    status: exists ? "configured" : required ? "missing_required" : "missing",
  };
}

function resolveHealthStatus({
  criticalIssues,
  warnings,
}: {
  criticalIssues: unknown[];
  warnings: unknown[];
}): HealthStatus {
  if (criticalIssues.length > 0) {
    return "error";
  }

  if (warnings.length > 0) {
    return "warning";
  }

  return "healthy";
}

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const checkedAt = new Date().toISOString();

    const envChecks = [
      envStatus("NEXT_PUBLIC_SUPABASE_URL", true),
      envStatus("NEXT_PUBLIC_SUPABASE_ANON_KEY", true),
      envStatus("SUPABASE_SERVICE_ROLE_KEY", true),
      envStatus("STRIPE_SECRET_KEY", false),
      envStatus("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", false),
      envStatus("RESEND_API_KEY", false),
      envStatus("RESEND_FROM_EMAIL", false),
      envStatus("CRON_SECRET", false),
      envStatus("GOOGLE_CLIENT_ID", false),
      envStatus("GOOGLE_CLIENT_SECRET", false),
      envStatus("GOOGLE_REFRESH_TOKEN", false),
    ];

    const [
      bookingsCount,
      clientsCount,
      invoicesCount,
      contractsCount,
      projectsCount,
      cronRows,
      snapshotRows,
    ] = await Promise.all([
      safeCount("bookings"),
      safeCount("crm_clients"),
      safeCount("admin_invoices"),
      safeCount("client_contracts"),
      safeCount("media_projects"),
      safeLatestRows("cron_run_logs", 20),
      safeLatestRows("system_health_snapshots", 5),
    ]);

    const tableChecks = [
      bookingsCount,
      clientsCount,
      invoicesCount,
      contractsCount,
      projectsCount,
    ];

    const criticalIssues = [
      ...envChecks
        .filter((check) => check.required && !check.configured)
        .map((check) => ({
          type: "missing_required_env",
          name: check.name,
        })),
      ...tableChecks
        .filter((check) => !check.ok && check.table === "bookings")
        .map((check) => ({
          type: "database_table_error",
          table: check.table,
          error: check.error,
        })),
    ];

    const warnings = [
      ...envChecks
        .filter((check) => !check.required && !check.configured)
        .map((check) => ({
          type: "missing_optional_env",
          name: check.name,
        })),
      ...tableChecks
        .filter((check) => !check.ok && check.table !== "bookings")
        .map((check) => ({
          type: "database_table_warning",
          table: check.table,
          error: check.error,
        })),
      ...(cronRows.ok
        ? []
        : [
            {
              type: "cron_logs_unavailable",
              error: cronRows.error,
            },
          ]),
    ];

    const healthStatus = resolveHealthStatus({
      criticalIssues,
      warnings,
    });

    const recentCronErrors = cronRows.rows.filter(
      (row: Record<string, unknown>) => row.status === "error"
    ).length;

    const metrics = {
      checked_at: checkedAt,
      table_counts: {
        bookings: bookingsCount.count,
        clients: clientsCount.count,
        invoices: invoicesCount.count,
        contracts: contractsCount.count,
        projects: projectsCount.count,
      },
      recent_cron_logs_loaded: cronRows.rows.length,
      recent_cron_errors: recentCronErrors,
      recent_snapshots_loaded: snapshotRows.rows.length,
    };

    const componentStatuses = {
      environment: envChecks,
      database_tables: tableChecks,
      cron_logs: {
        ok: cronRows.ok,
        recent_error_count: recentCronErrors,
        error: cronRows.error,
      },
      health_snapshots: {
        ok: snapshotRows.ok,
        error: snapshotRows.error,
      },
    };

    const allIssues = [...criticalIssues, ...warnings];

    const message =
      healthStatus === "healthy"
        ? "System health snapshot is healthy."
        : healthStatus === "warning"
          ? "System health snapshot completed with warnings."
          : "System health snapshot found critical issues.";

    const { data, error } = await supabaseAdmin
      .from("system_health_snapshots")
      .insert({
        snapshot_type: "manual",
        health_status: healthStatus,
        status: healthStatus,
        message,
        metrics,
        component_statuses: componentStatuses,
        issues: allIssues,
        metadata: {
          source: "dashboard",
        },
        created_at: checkedAt,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      snapshot: data,
      health_status: healthStatus,
      metrics,
      issues: allIssues,
      message,
    });
  } catch (error) {
    console.error("RUN SYSTEM HEALTH SNAPSHOT ERROR:", error);

    return NextResponse.json(
      {
        error: "System health snapshot could not run.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}