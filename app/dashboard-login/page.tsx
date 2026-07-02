"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function DashboardLoginPage() {
  const searchParams = useSearchParams();

  const nextPath = searchParams.get("next") || "/dashboard";
  const reason = searchParams.get("reason");

  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login() {
    const trimmedSecret = secret.trim();

    if (!trimmedSecret) {
      setError("Enter the admin dashboard secret.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/dashboard/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret: trimmedSecret,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.authorized) {
        throw new Error(data.error ?? "Admin login failed.");
      }

      window.location.href = nextPath;
    } catch (error) {
      console.error("DASHBOARD LOGIN ERROR:", error);

      setError(
        error instanceof Error ? error.message : "Admin login failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <section className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
          Million Dollar Admin
        </p>

        <h1 className="mt-3 text-3xl font-bold">
          Dashboard Login
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Enter your admin dashboard secret to access protected dashboard pages.
        </p>

        {reason === "missing_config" && (
          <div className="mt-5 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
            Admin session is not configured. Add ADMIN_SESSION_TOKEN and
            ADMIN_DASHBOARD_SECRET in Vercel.
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mt-6">
          <label className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Admin Secret
          </label>

          <input
            type="password"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                login();
              }
            }}
            className="mt-3 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/40"
            placeholder="Enter dashboard secret"
          />
        </div>

        <button
          onClick={login}
          disabled={loading}
          className="mt-5 w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Enter Dashboard"}
        </button>
      </section>
    </main>
  );
}