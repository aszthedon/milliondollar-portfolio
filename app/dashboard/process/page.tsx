"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import { supabase } from "@/lib/supabase";

interface ProcessStep {
  id: number;
  step_label: string | null;
  title: string;
  description: string;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string | null;
}

const emptyForm = {
  step_label: "",
  title: "",
  description: "",
  sort_order: 0,
  is_visible: true,
};

export default function ProcessDashboardPage() {
  const [steps, setSteps] =
    useState<ProcessStep[]>([]);

  const [form, setForm] =
    useState(emptyForm);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  async function fetchSteps() {
    try {
      setLoading(true);
      setError("");

      const { data, error } =
        await supabase
          .from("process_steps")
          .select("*")
          .order("sort_order", {
            ascending: true,
          })
          .order("created_at", {
            ascending: true,
          });

      if (error) {
        throw error;
      }

      setSteps(
        (data ?? []) as ProcessStep[]
      );
    } catch (error) {
      console.error(
        "PROCESS STEPS FETCH ERROR:",
        error
      );

      setError(
        "Process steps could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSteps();
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setSuccess("");
  }

  function startEdit(step: ProcessStep) {
    setEditingId(step.id);

    setForm({
      step_label:
        step.step_label || "",
      title: step.title || "",
      description:
        step.description || "",
      sort_order:
        step.sort_order ?? 0,
      is_visible:
        step.is_visible ?? true,
    });

    setError("");
    setSuccess("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const title =
        form.title.trim();

      const description =
        form.description.trim();

      if (!title || !description) {
        setError(
          "Title and description are required."
        );
        return;
      }

      const payload = {
        step_label:
          form.step_label.trim(),
        title,
        description,
        sort_order:
          Number(form.sort_order) || 0,
        is_visible: form.is_visible,
        updated_at:
          new Date().toISOString(),
      };

      if (editingId) {
        const { error } =
          await supabase
            .from("process_steps")
            .update(payload)
            .eq("id", editingId);

        if (error) {
          throw error;
        }

        setSuccess(
          "Process step updated."
        );
      } else {
        const { error } =
          await supabase
            .from("process_steps")
            .insert(payload);

        if (error) {
          throw error;
        }

        setSuccess(
          "Process step added."
        );
      }

      resetForm();
      await fetchSteps();
    } catch (error) {
      console.error(
        "PROCESS STEP SAVE ERROR:",
        error
      );

      setError(
        "Process step could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisibility(
    step: ProcessStep
  ) {
    try {
      setError("");
      setSuccess("");

      const { error } =
        await supabase
          .from("process_steps")
          .update({
            is_visible:
              !step.is_visible,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", step.id);

      if (error) {
        throw error;
      }

      await fetchSteps();
    } catch (error) {
      console.error(
        "PROCESS STEP VISIBILITY ERROR:",
        error
      );

      setError(
        "Process step visibility could not be updated."
      );
    }
  }

  async function deleteStep(
    step: ProcessStep
  ) {
    const confirmed =
      window.confirm(
        `Delete this process step?\n\n${step.title}`
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      const { error } =
        await supabase
          .from("process_steps")
          .delete()
          .eq("id", step.id);

      if (error) {
        throw error;
      }

      if (editingId === step.id) {
        resetForm();
      }

      setSuccess(
        "Process step deleted."
      );

      await fetchSteps();
    } catch (error) {
      console.error(
        "PROCESS STEP DELETE ERROR:",
        error
      );

      setError(
        "Process step could not be deleted."
      );
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white md:px-10">
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
            Dashboard
          </p>

          <h1 className="text-5xl font-bold">
            Process
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            Add, edit, hide, reorder, and delete the public “How It Works”
            steps shown on the website.
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
            href="/#process"
            className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
          >
            View Process
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-3xl border border-red-500 bg-red-500/10 p-5 text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-3xl border border-green-500 bg-green-500/10 p-5 text-green-300">
          {success}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="mb-3 text-sm uppercase tracking-[0.25em] text-zinc-500">
            {editingId
              ? "Edit Step"
              : "Add Step"}
          </p>

          <h2 className="text-3xl font-bold">
            Process Step
          </h2>

          <form
            onSubmit={handleSubmit}
            className="mt-8 grid gap-5"
          >
            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">
                Step Label
              </span>

              <input
                value={form.step_label}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    step_label:
                      event.target.value,
                  }))
                }
                placeholder="Step 01"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">
                Title
              </span>

              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title:
                      event.target.value,
                  }))
                }
                placeholder="Choose Your Service"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">
                Description
              </span>

              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description:
                      event.target.value,
                  }))
                }
                rows={7}
                placeholder="Explain this step for website visitors."
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">
                Sort Order
              </span>

              <input
                type="number"
                value={form.sort_order}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sort_order:
                      Number(
                        event.target.value
                      ),
                  }))
                }
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black px-4 py-4">
              <span>
                <span className="block font-medium">
                  Show on public website
                </span>

                <span className="text-sm text-zinc-500">
                  Hide steps without deleting them.
                </span>
              </span>

              <input
                type="checkbox"
                checked={form.is_visible}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    is_visible:
                      event.target.checked,
                  }))
                }
                className="h-5 w-5"
              />
            </label>

            <div className="flex flex-wrap gap-3 pt-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-white px-6 py-3 font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "Add Step"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-white/10 px-6 py-3 font-medium text-zinc-300 transition hover:bg-white hover:text-black"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-sm uppercase tracking-[0.25em] text-zinc-500">
                Public Process
              </p>

              <h2 className="text-3xl font-bold">
                Step List
              </h2>
            </div>

            <button
              onClick={fetchSteps}
              disabled={loading}
              className="rounded-full border border-white/10 px-5 py-3 text-sm text-zinc-300 transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-zinc-500">
              Loading process steps...
            </div>
          ) : steps.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-black/40 p-8 text-center text-zinc-500">
              No process steps yet. Add your first step.
            </div>
          ) : (
            <div className="grid gap-4">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className="rounded-3xl border border-white/10 bg-black/50 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        {step.step_label && (
                          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
                            {step.step_label}
                          </span>
                        )}

                        <h3 className="text-2xl font-bold">
                          {step.title}
                        </h3>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs ${
                            step.is_visible
                              ? "border-green-500 bg-green-500/10 text-green-300"
                              : "border-zinc-500 bg-zinc-500/10 text-zinc-300"
                          }`}
                        >
                          {step.is_visible
                            ? "Visible"
                            : "Hidden"}
                        </span>
                      </div>

                      <p className="mt-3 whitespace-pre-line text-zinc-400">
                        {step.description}
                      </p>

                      <p className="mt-3 text-sm text-zinc-500">
                        Sort Order: {step.sort_order}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() =>
                          startEdit(step)
                        }
                        className="rounded-full border border-white/10 px-5 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          toggleVisibility(step)
                        }
                        className="rounded-full border border-white/10 px-5 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
                      >
                        {step.is_visible
                          ? "Hide"
                          : "Show"}
                      </button>

                      <button
                        onClick={() =>
                          deleteStep(step)
                        }
                        className="rounded-full border border-red-500/40 px-5 py-2 text-sm text-red-300 transition hover:bg-red-500 hover:text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}