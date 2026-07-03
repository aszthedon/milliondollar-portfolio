import { getServerSiteSlug } from "@/lib/site/siteConfig";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function logCronRun({
  cronName,
  triggerSource = "unknown",
  status,
  message,
  resultSummary = {},
  siteSlug = getServerSiteSlug(),
}: {
  cronName: string;
  triggerSource?: string;
  status: "success" | "error" | "warning" | "skipped";
  message: string;
  resultSummary?: Record<string, unknown>;
  siteSlug?: string;
}) {
  try {
    const { data, error } = await supabaseAdmin
      .from("cron_run_logs")
      .insert({
        site_slug: siteSlug,
        cron_name: cronName,
        trigger_source: triggerSource,
        status,
        message,
        result_summary: resultSummary,
        created_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      console.error("LOG CRON RUN ERROR:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("LOG CRON RUN UNEXPECTED ERROR:", error);
    return null;
  }
}
