import { redirect } from "next/navigation";

export default function OldVariationsDashboardRedirect() {
  redirect("/dashboard/service-manager");
}
