"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";

import {
  clearDashboardToken,
  loginDashboard,
  verifyDashboardSession,
} from "@/lib/security/dashboardClientAuth";

interface AdminUnlockGateProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export default function AdminUnlockGate({
  children,
  title = "Admin Dashboard",
  description = "Unlock the dashboard to manage bookings, clients, invoices, contracts, projects, launch operations, and production tools.",
}: AdminUnlockGateProps) {
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function checkSession() {
    try {
      setIsChecking(true);

      const valid = await verifyDashboardSession();

      setIsUnlocked(valid);
    } catch {
      clearDashboardToken();
      setIsUnlocked(false);
    } finally {
      setIsChecking(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!password.trim()) {
      setError("Enter the dashboard password.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      await loginDashboard(password);

      setPassword("");
      setIsUnlocked(true);
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Dashboard login failed."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    checkSession();

    function handleExpiredSession() {
      setIsUnlocked(false);
      setError("Dashboard session expired. Please unlock again.");
    }

    window.addEventListener("dashboard-auth-expired", handleExpiredSession);

    return () => {
      window.removeEventListener("dashboard-auth-expired", handleExpiredSession);
    };
  }, []);

  if (isChecking) {
    return (
      <main className="min-h-screen bg-black px-6 py-20 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            Dashboard
          </p>

          <h1 className="mt-4 text-3xl font-black">Checking access...</h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Verifying your dashboard session.
          </p>
        </div>
      </main>
    );
  }

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <main className="min-h-screen bg-black px-6 py-20 text-white">
      <div className="mx-auto grid max-w-xl gap-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            Million Dollar Ticket Productions
          </p>

          <h1 className="mt-4 text-4xl font-black">{title}</h1>

          <p className="mt-4 text-sm leading-6 text-zinc-400">{description}</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-white/5 p-6"
        >
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Dashboard Password
            </span>

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter dashboard password"
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-white/30"
              autoComplete="current-password"
            />
          </label>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-5 w-full rounded-full bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Unlocking..." : "Unlock Dashboard"}
          </button>
        </form>
      </div>
    </main>
  );
}