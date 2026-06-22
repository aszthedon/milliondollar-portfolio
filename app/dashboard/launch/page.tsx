"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { supabase } from "@/lib/supabase";

interface LaunchChecklistItem {
  id: number;
  title: string;
  description: string | null;
  sort_order: number;
  is_complete: boolean;
  created_at: string;
  updated_at: string | null;
}

export default function LaunchChecklistPage() {
  const [items, setItems] = useState<LaunchChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchItems() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("launch_checklist_items")
        .select("*")
        .order("sort_order", {
          ascending: true,
        })
        .order("created_at", {
          ascending: true,
        });

      if (error) throw error;

      setItems((data ?? []) as LaunchChecklistItem[]);
    } catch (error) {
      console.error("LAUNCH CHECKLIST FETCH ERROR:", error);
      setError("Launch checklist could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems();
  }, []);

  async function toggleItem(item: LaunchChecklistItem) {
    try {
      const { error } = await supabase
        .from("launch_checklist_items")
        .update({
          is_complete: !item.is_complete,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) throw error;

      await fetchItems();
    } catch (error) {
      console.error("LAUNCH CHECKLIST UPDATE ERROR:", error);
      setError("Checklist item could not be updated.");
    }
  }

  const completedCount = items.filter((item) => item.is_complete).length;

  const completionPercent = useMemo(() => {
    if (items.length === 0) return 0;
    return Math.round((completedCount / items.length) * 100);
  }, [completedCount, items.length]);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white md:px-10">
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
            Dashboard
          </p>

          <h1 className="text-5xl font-bold">
            Launch Checklist
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            Track final tasks before launching the booking website template.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white hover:text-black"
          >
            Dashboard Home
          </Link>

          <Link
            href="/"
            className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
          >
            View Website
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-3xl border border-red-500 bg-red-500/10 p-5 text-red-300">
          {error}
        </div>
      )}

      <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">
              Progress
            </p>

            <h2 className="mt-3 text-4xl font-bold">
              {completionPercent}% Complete
            </h2>

            <p className="mt-3 text-zinc-400">
              {completedCount} of {items.length} launch tasks completed.
            </p>
          </div>

          <button
            onClick={fetchItems}
            className="rounded-full border border-white/10 px-5 py-3 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
          >
            Refresh
          </button>
        </div>

        <div className="mt-8 h-3 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-white"
            style={{
              width: `${completionPercent}%`,
            }}
          />
        </div>
      </section>

      <section className="mt-8 grid gap-4">
        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-zinc-500">
            Loading checklist...
          </div>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              onClick={() => toggleItem(item)}
              className={`rounded-3xl border p-6 text-left transition ${
                item.is_complete
                  ? "border-green-500 bg-green-500/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">
                    Task {item.sort_order}
                  </p>

                  <h3 className="mt-2 text-2xl font-bold">
                    {item.title}
                  </h3>

                  {item.description && (
                    <p className="mt-3 text-zinc-400">
                      {item.description}
                    </p>
                  )}
                </div>

                <span
                  className={`rounded-full border px-4 py-2 text-sm ${
                    item.is_complete
                      ? "border-green-500 text-green-300"
                      : "border-white/10 text-zinc-300"
                  }`}
                >
                  {item.is_complete ? "Complete" : "Mark Complete"}
                </span>
              </div>
            </button>
          ))
        )}
      </section>

      <section className="mt-10 rounded-3xl border border-yellow-500/30 bg-yellow-500/10 p-8 text-yellow-200">
        <h2 className="text-2xl font-bold">
          Tomorrow Launch Commands
        </h2>

        <pre className="mt-5 overflow-x-auto rounded-2xl bg-black p-5 text-sm text-yellow-100">
{`npm run build
git status
git add .
git commit -m "Prepare booking template launch"
git push origin main`}
        </pre>
      </section>
    </main>
  );
}