"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { loginDashboard } from "@/lib/security/dashboardClientAuth";

function getSafeNextPath(value: string | null) {
  if (!value) {
    return "/dashboard";
  }

  if (!value.startsWith("/")) {
    return "/dashboard";
  }

  if (value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export default function DashboardLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = getSafeNextPath(searchParams.get("next"));

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!password.trim()) {
      setError("Enter the dashboard password.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await loginDashboard(password);

      router.push(nextPath);
      router.refresh();
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Dashboard login failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 py-10 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Million Dollar Ticket Productions
        </p>

        <h1 className="mt-3 text-4xl font-black">Dashboard Login</h1>

        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Enter your dashboard password to unlock admin tools, bookings,
          clients, invoices, contracts, projects, reminders, and analytics.
        </p>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
              Password
            </span>

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter dashboard password"
              autoComplete="current-password"
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none focus:border-white/40"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-white px-5 py-3 text-sm font-black text-black disabled:opacity-60"
          >
            {loading ? "Unlocking..." : "Unlock Dashboard"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm text-zinc-500">
          <Link href="/" className="hover:text-white">
            ← Back Home
          </Link>

          <span>Secure Admin Access</span>
        </div>
      </section>
    </main>
  );
}