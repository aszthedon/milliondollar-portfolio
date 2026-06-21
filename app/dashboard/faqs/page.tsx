"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import { supabase } from "@/lib/supabase";

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string | null;
}

const emptyForm = {
  question: "",
  answer: "",
  sort_order: 0,
  is_visible: true,
};

export default function FAQDashboardPage() {
  const [faqs, setFaqs] =
    useState<FAQItem[]>([]);

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

  async function fetchFaqs() {
    try {
      setLoading(true);
      setError("");

      const { data, error } =
        await supabase
          .from("faq_items")
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

      setFaqs(
        (data ?? []) as FAQItem[]
      );
    } catch (error) {
      console.error(
        "FAQ FETCH ERROR:",
        error
      );

      setError(
        "FAQs could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFaqs();
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setSuccess("");
  }

  function startEdit(faq: FAQItem) {
    setEditingId(faq.id);

    setForm({
      question: faq.question,
      answer: faq.answer,
      sort_order: faq.sort_order,
      is_visible: faq.is_visible,
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

      const question =
        form.question.trim();

      const answer =
        form.answer.trim();

      if (!question || !answer) {
        setError(
          "Question and answer are required."
        );
        return;
      }

      const payload = {
        question,
        answer,
        sort_order:
          Number(form.sort_order) || 0,
        is_visible: form.is_visible,
        updated_at:
          new Date().toISOString(),
      };

      if (editingId) {
        const { error } =
          await supabase
            .from("faq_items")
            .update(payload)
            .eq("id", editingId);

        if (error) {
          throw error;
        }

        setSuccess("FAQ updated.");
      } else {
        const { error } =
          await supabase
            .from("faq_items")
            .insert(payload);

        if (error) {
          throw error;
        }

        setSuccess("FAQ added.");
      }

      resetForm();
      await fetchFaqs();
    } catch (error) {
      console.error(
        "FAQ SAVE ERROR:",
        error
      );

      setError(
        "FAQ could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisibility(
    faq: FAQItem
  ) {
    try {
      setError("");
      setSuccess("");

      const { error } =
        await supabase
          .from("faq_items")
          .update({
            is_visible:
              !faq.is_visible,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", faq.id);

      if (error) {
        throw error;
      }

      await fetchFaqs();
    } catch (error) {
      console.error(
        "FAQ VISIBILITY ERROR:",
        error
      );

      setError(
        "FAQ visibility could not be updated."
      );
    }
  }

  async function deleteFaq(faq: FAQItem) {
    const confirmed =
      window.confirm(
        `Delete this FAQ?\n\n${faq.question}`
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      const { error } =
        await supabase
          .from("faq_items")
          .delete()
          .eq("id", faq.id);

      if (error) {
        throw error;
      }

      if (editingId === faq.id) {
        resetForm();
      }

      setSuccess("FAQ deleted.");

      await fetchFaqs();
    } catch (error) {
      console.error(
        "FAQ DELETE ERROR:",
        error
      );

      setError(
        "FAQ could not be deleted."
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
            FAQs
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            Add, edit, hide, reorder, and delete public frequently asked
            questions for the website.
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
            href="/#faqs"
            className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
          >
            View FAQs
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
              ? "Edit FAQ"
              : "Add FAQ"}
          </p>

          <h2 className="text-3xl font-bold">
            FAQ Item
          </h2>

          <form
            onSubmit={handleSubmit}
            className="mt-8 grid gap-5"
          >
            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">
                Question
              </span>

              <input
                value={form.question}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    question:
                      event.target.value,
                  }))
                }
                placeholder="How do I book a service?"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">
                Answer
              </span>

              <textarea
                value={form.answer}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    answer:
                      event.target.value,
                  }))
                }
                rows={7}
                placeholder="Explain the answer clearly for website visitors."
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
                  Hide FAQs without deleting them.
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
                    : "Add FAQ"}
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
                Public FAQs
              </p>

              <h2 className="text-3xl font-bold">
                FAQ List
              </h2>
            </div>

            <button
              onClick={fetchFaqs}
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
              Loading FAQs...
            </div>
          ) : faqs.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-black/40 p-8 text-center text-zinc-500">
              No FAQs yet. Add your first question.
            </div>
          ) : (
            <div className="grid gap-4">
              {faqs.map((faq) => (
                <div
                  key={faq.id}
                  className="rounded-3xl border border-white/10 bg-black/50 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-2xl font-bold">
                          {faq.question}
                        </h3>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs ${
                            faq.is_visible
                              ? "border-green-500 bg-green-500/10 text-green-300"
                              : "border-zinc-500 bg-zinc-500/10 text-zinc-300"
                          }`}
                        >
                          {faq.is_visible
                            ? "Visible"
                            : "Hidden"}
                        </span>
                      </div>

                      <p className="mt-3 whitespace-pre-line text-zinc-400">
                        {faq.answer}
                      </p>

                      <p className="mt-3 text-sm text-zinc-500">
                        Sort Order: {faq.sort_order}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() =>
                          startEdit(faq)
                        }
                        className="rounded-full border border-white/10 px-5 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          toggleVisibility(faq)
                        }
                        className="rounded-full border border-white/10 px-5 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
                      >
                        {faq.is_visible
                          ? "Hide"
                          : "Show"}
                      </button>

                      <button
                        onClick={() =>
                          deleteFaq(faq)
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