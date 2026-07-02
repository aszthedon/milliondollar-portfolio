import { supabaseAdmin } from "@/lib/supabase-admin";

export function getRequestIpAddress(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function logAdminLoginAttempt({
  request,
  status,
  reason,
}: {
  request: Request;
  status: "success" | "failed" | "locked";
  reason?: string;
}) {
  try {
    const { error } = await supabaseAdmin.from("admin_login_attempts").insert({
      status,
      reason: reason ?? null,
      ip_address: getRequestIpAddress(request),
      user_agent: request.headers.get("user-agent") ?? null,
    });

    if (error) {
      console.error("ADMIN LOGIN ATTEMPT LOG ERROR:", error);
    }
  } catch (error) {
    console.error("ADMIN LOGIN ATTEMPT LOG UNEXPECTED ERROR:", error);
  }
}