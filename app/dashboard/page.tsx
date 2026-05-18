"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setLoading(false);
    }

    checkUser();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();

    router.push("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        Loading...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-bold">
            Dashboard
          </h1>

          <p className="mt-4 text-zinc-400">
            Admin and client tools will live here.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-full bg-white px-6 py-3 text-black"
        >
          Logout
        </button>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        <a
          href="/dashboard/services"
          className="rounded-3xl border border-white/10 bg-white/5 p-8 transition hover:bg-white/10"
        >
          <h2 className="text-2xl font-semibold">
            Services
          </h2>

          <p className="mt-4 text-zinc-400">
            Manage services and pricing.
          </p>
        </a>

        <a
          href="/dashboard/gallery"
          className="rounded-3xl border border-white/10 bg-white/5 p-8 transition hover:bg-white/10"
        >
          <h2 className="text-2xl font-semibold">
            Gallery
          </h2>

          <p className="mt-4 text-zinc-400">
            Upload and manage gallery images.
          </p>
        </a>

        <a
          href="/dashboard/settings"
          className="rounded-3xl border border-white/10 bg-white/5 p-8 transition hover:bg-white/10"
        >
          <h2 className="text-2xl font-semibold">
            Site Settings
          </h2>

          <p className="mt-4 text-zinc-400">
            Edit homepage and branding content.
          </p>
        </a>
      </div>
    </main>
  );
}