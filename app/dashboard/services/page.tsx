import { redirect } from "next/navigation";

export default function OldServicesDashboardRedirect() {
  redirect("/dashboard/service-manager");
}
