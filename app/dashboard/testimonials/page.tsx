"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import { supabase } from "@/lib/supabase";

interface TestimonialItem {
  id: number;
  client_name: string;
  client_title: string | null;
  quote: string;
  rating: number | null;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string | null;
}

const emptyForm = {
  client_name: "",
  client_title: "",
  quote: "",
  rating: 5,
  sort_order: 0,
  is_visible: true,
};

export default function TestimonialsDashboardPage() {
  const [testimonials, setTestimonials] =
    useState<TestimonialItem[]>([]);

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

  async function fetchTestimonials() {
    try {
      setLoading(true);
      setError("");

      const { data, error } =
        await supabase
          .from("testimonial_items")
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

      setTestimonials(
        (data ?? []) as TestimonialItem[]
      );
    } catch (error) {
      console.error(
        "TESTIMONIAL FETCH ERROR:",
        error
      );

      setError(
        "Testimonials could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTestimonials();
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setSuccess("");
  }

  function startEdit(
    testimonial: TestimonialItem
  ) {
    setEditingId(testimonial.id);

    setForm({
      client_name:
        testimonial.client_name || "",
      client_title:
        testimonial.client_title || "",
      quote: testimonial.quote || "",
      rating:
        testimonial.rating ?? 5,
      sort_order:
        testimonial.sort_order ?? 0,
      is_visible:
        testimonial.is_visible ?? true,
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

      const clientName =
        form.client_name.trim();

      const clientTitle =
        form.client_title.trim();

      const quote =
        form.quote.trim();

      if (!clientName || !quote) {
        setError(
          "Client name and quote are required."
        );
        return;
      }

      const rating =
        Number(form.rating) || 5;

      const payload = {
        client_name: clientName,
        client_title: clientTitle,
        quote,
        rating:
          rating < 1
            ? 1
            : rating > 5
              ? 5
              : rating,
        sort_order:
          Number(form.sort_order) || 0,
        is_visible: form.is_visible,
        updated_at:
          new Date().toISOString(),
      };

      if (editingId) {
        const { error } =
          await supabase
            .from("testimonial_items")
            .update(payload)
            .eq("id", editingId);

        if (error) {
          throw error;
        }

        setSuccess(
          "Testimonial updated."
        );
      } else {
        const { error } =
          await supabase
            .from("testimonial_items")
            .insert(payload);

        if (error) {
          throw error;
        }

        setSuccess(
          "Testimonial added."
        );
      }

      resetForm();
      await fetchTestimonials();
    } catch (error) {
      console.error(
        "TESTIMONIAL SAVE ERROR:",
        error
      );

      setError(
        "Testimonial could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisibility(
    testimonial: TestimonialItem
  ) {
    try {
      setError("");
      setSuccess("");

      const { error } =
        await supabase
          .from("testimonial_items")
          .update({
            is_visible:
              !testimonial.is_visible,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", testimonial.id);

      if (error) {
        throw error;
      }

      await fetchTestimonials();
    } catch (error) {
      console.error(
        "TESTIMONIAL VISIBILITY ERROR:",
        error
      );

      setError(
        "Testimonial visibility could not be updated."
      );
    }
  }

  async function deleteTestimonial(
    testimonial: TestimonialItem
  ) {
    const confirmed =
      window.confirm(
        `Delete this testimonial?\n\n${testimonial.client_name}`
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      const { error } =
        await supabase
          .from("testimonial_items")
          .delete()
          .eq("id", testimonial.id);

      if (error) {
        throw error;
      }

      if (editingId === testimonial.id) {
        resetForm();
      }

      setSuccess(
        "Testimonial deleted."
      );

      await fetchTestimonials();
    } catch (error) {
      console.error(
        "TESTIMONIAL DELETE ERROR:",
        error
      );

      setError(
        "Testimonial could not be deleted."
      );
    }
  }

  function renderStars(
    rating: number | null
  ) {
    const count =
      rating ?? 5;

    return "★".repeat(count);
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white md:px-10">
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
            Dashboard
          </p>

          <h1 className="text-5xl font-bold">
            Testimonials
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            Add, edit, hide, reorder, and delete client testimonials shown on
            the public website.
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
            href="/#testimonials"
            className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
          >
            View Testimonials
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
              ? "Edit Testimonial"
              : "Add Testimonial"}
          </p>

          <h2 className="text-3xl font-bold">
            Client Review
          </h2>

          <form
            onSubmit={handleSubmit}
            className="mt-8 grid gap-5"
          >
            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">
                Client Name
              </span>

              <input
                value={form.client_name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    client_name:
                      event.target.value,
                  }))
                }
                placeholder="Asia Donald"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">
                Client Title / Company
              </span>

              <input
                value={form.client_title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    client_title:
                      event.target.value,
                  }))
                }
                placeholder="Small Business Owner"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">
                Quote
              </span>

              <textarea
                value={form.quote}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    quote:
                      event.target.value,
                  }))
                }
                rows={7}
                placeholder="Share what the client said about the experience."
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm text-zinc-400">
                  Rating
                </span>

                <input
                  type="number"
                  min={1}
                  max={5}
                  value={form.rating}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      rating:
                        Number(
                          event.target.value
                        ),
                    }))
                  }
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
            </div>

            <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black px-4 py-4">
              <span>
                <span className="block font-medium">
                  Show on public website
                </span>

                <span className="text-sm text-zinc-500">
                  Hide testimonials without deleting them.
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
                    : "Add Testimonial"}
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
                Public Testimonials
              </p>

              <h2 className="text-3xl font-bold">
                Review List
              </h2>
            </div>

            <button
              onClick={fetchTestimonials}
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
              Loading testimonials...
            </div>
          ) : testimonials.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-black/40 p-8 text-center text-zinc-500">
              No testimonials yet. Add your first review.
            </div>
          ) : (
            <div className="grid gap-4">
              {testimonials.map(
                (testimonial) => (
                  <div
                    key={testimonial.id}
                    className="rounded-3xl border border-white/10 bg-black/50 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-2xl font-bold">
                            {testimonial.client_name}
                          </h3>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs ${
                              testimonial.is_visible
                                ? "border-green-500 bg-green-500/10 text-green-300"
                                : "border-zinc-500 bg-zinc-500/10 text-zinc-300"
                            }`}
                          >
                            {testimonial.is_visible
                              ? "Visible"
                              : "Hidden"}
                          </span>
                        </div>

                        {testimonial.client_title && (
                          <p className="mt-1 text-sm text-zinc-500">
                            {testimonial.client_title}
                          </p>
                        )}

                        <p className="mt-3 text-yellow-400">
                          {renderStars(
                            testimonial.rating
                          )}
                        </p>

                        <p className="mt-3 whitespace-pre-line text-zinc-400">
                          “{testimonial.quote}”
                        </p>

                        <p className="mt-3 text-sm text-zinc-500">
                          Sort Order:{" "}
                          {testimonial.sort_order}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() =>
                            startEdit(
                              testimonial
                            )
                          }
                          className="rounded-full border border-white/10 px-5 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() =>
                            toggleVisibility(
                              testimonial
                            )
                          }
                          className="rounded-full border border-white/10 px-5 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
                        >
                          {testimonial.is_visible
                            ? "Hide"
                            : "Show"}
                        </button>

                        <button
                          onClick={() =>
                            deleteTestimonial(
                              testimonial
                            )
                          }
                          className="rounded-full border border-red-500/40 px-5 py-2 text-sm text-red-300 transition hover:bg-red-500 hover:text-white"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}