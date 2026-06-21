"use client";

import {
  useEffect,
  useState,
} from "react";

import Container from "@/components/Container";
import { supabase } from "@/lib/supabase";

interface ProcessStep {
  id: number;
  step_label: string | null;
  title: string;
  description: string;
  sort_order: number;
  is_visible: boolean;
}

export default function Process() {
  const [steps, setSteps] =
    useState<ProcessStep[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function fetchSteps() {
      const { data, error } =
        await supabase
          .from("process_steps")
          .select(
            `
              id,
              step_label,
              title,
              description,
              sort_order,
              is_visible
            `
          )
          .eq("is_visible", true)
          .order("sort_order", {
            ascending: true,
          })
          .order("created_at", {
            ascending: true,
          });

      if (error) {
        console.error(
          "PUBLIC PROCESS ERROR:",
          error
        );

        setLoading(false);
        return;
      }

      setSteps(
        (data ?? []) as ProcessStep[]
      );

      setLoading(false);
    }

    fetchSteps();
  }, []);

  if (!loading && steps.length === 0) {
    return null;
  }

  return (
    <section
      id="process"
      className="relative py-24"
    >
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm uppercase tracking-[0.35em] text-zinc-500">
            Process
          </p>

          <h2 className="text-4xl font-bold md:text-6xl">
            How It Works
          </h2>

          <p className="mt-6 text-lg leading-relaxed text-zinc-400">
            Give clients a clear path from interest to booking. Each step can be
            managed from the dashboard.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-zinc-500 md:col-span-3">
              Loading process...
            </div>
          ) : (
            steps.map((step) => (
              <div
                key={step.id}
                className="rounded-3xl border border-white/10 bg-white/5 p-8"
              >
                <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                  {step.step_label ||
                    `Step ${step.sort_order}`}
                </p>

                <h3 className="mt-5 text-2xl font-bold">
                  {step.title}
                </h3>

                <p className="mt-4 leading-relaxed text-zinc-400">
                  {step.description}
                </p>
              </div>
            ))
          )}
        </div>
      </Container>
    </section>
  );
}