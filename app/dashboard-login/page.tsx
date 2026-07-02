import { Suspense } from "react";

import DashboardLoginClient from "./DashboardLoginClient";

export const dynamic = "force-dynamic";

export default function DashboardLoginPage() {
  return (
    <Suspense fallback={<DashboardLoginLoading />}>
      <DashboardLoginClient />
    </Suspense>
  );
}

function DashboardLoginLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Million Dollar Ticket Productions
        </p>

        <h1 className="mt-3 text-3xl font-black">Loading Dashboard Login...</h1>

        <p className="mt-3 text-sm text-zinc-400">
          Preparing secure dashboard access.
        </p>
      </div>
    </main>
  );
}