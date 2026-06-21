"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import { supabase } from "@/lib/supabase";

interface NavigationLink {
  id: number;
  label: string;
  href: string;
  sort_order: number;
  is_visible: boolean;
  opens_new_tab: boolean;
  created_at: string;
}

const emptyForm = {
  label: "",
  href: "",
  sort_order: 0,
  is_visible: true,
  opens_new_tab: false,
};

export default function DashboardNavigationPage() {
  const [links, setLinks] =
    useState<NavigationLink[]>([]);

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

  async function fetchLinks() {
    try {
      setLoading(true);
      setError("");

      const { data, error } =
        await supabase
          .from("navigation_links")
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

      setLinks(
        (data ?? []) as NavigationLink[]
      );
    } catch (error) {
      console.error(
        "NAVIGATION LINKS FETCH ERROR:",
        error
      );

      setError(
        "Navigation links could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLinks();
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setSuccess("");
  }

  function startEdit(link: NavigationLink) {
    setEditingId(link.id);

    setForm({
      label: link.label,
      href: link.href,
      sort_order: link.sort_order,
      is_visible: link.is_visible,
      opens_new_tab:
        link.opens_new_tab,
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

      const label =
        form.label.trim();

      const href =
        form.href.trim();

      if (!label || !href) {
        setError(
          "Label and link are required."
        );
        return;
      }

      const payload = {
        label,
        href,
        sort_order:
          Number(form.sort_order) || 0,
        is_visible: form.is_visible,
        opens_new_tab:
          form.opens_new_tab,
      };

      if (editingId) {
        const { error } =
          await supabase
            .from("navigation_links")
            .update(payload)
            .eq("id", editingId);

        if (error) {
          throw error;
        }

        setSuccess(
          "Navigation link updated."
        );
      } else {
        const { error } =
          await supabase
            .from("navigation_links")
            .insert(payload);

        if (error) {
          throw error;
        }

        setSuccess(
          "Navigation link added."
        );
      }

      resetForm();
      await fetchLinks();
    } catch (error) {
      console.error(
        "NAVIGATION SAVE ERROR:",
        error
      );

      setError(
        "Navigation link could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisibility(
    link: NavigationLink
  ) {
    try {
      setError("");
      setSuccess("");

      const { error } =
        await supabase
          .from("navigation_links")
          .update({
            is_visible:
              !link.is_visible,
          })
          .eq("id", link.id);

      if (error) {
        throw error;
      }

      await fetchLinks();
    } catch (error) {
      console.error(
        "NAVIGATION VISIBILITY ERROR:",
        error
      );

      setError(
        "Visibility could not be updated."
      );
    }
  }

  async function deleteLink(
    link: NavigationLink
  ) {
    const confirmed =
      window.confirm(
        `Delete "${link.label}" from the website menu?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      const { error } =
        await supabase
          .from("navigation_links")
          .delete()
          .eq("id", link.id);

      if (error) {
        throw error;
      }

      setSuccess(
        "Navigation link deleted."
      );

      if (editingId === link.id) {
        resetForm();
      }

      await fetchLinks();
    } catch (error) {
      console.error(
        "NAVIGATION DELETE ERROR:",
        error
      );

      setError(
        "Navigation link could not be deleted."
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
            Navigation
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            Control the public website menu links, labels, order, visibility,
            and external link behavior.
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

      {success && (
        <div className="mb-6 rounded-3xl border border-green-500 bg-green-500/10 p-5 text-green-300">
          {success}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="mb-3 text-sm uppercase tracking-[0.25em] text-zinc-500">
            {editingId
              ? "Edit Menu Link"
              : "Add Menu Link"}
          </p>

          <h2 className="text-3xl font-bold">
            Menu Item
          </h2>

          <form
            onSubmit={handleSubmit}
            className="mt-8 grid gap-5"
          >
            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">
                Label
              </span>

              <input
                value={form.label}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    label:
                      event.target.value,
                  }))
                }
                placeholder="Book Now"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">
                Link / URL
              </span>

              <input
                value={form.href}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    href:
                      event.target.value,
                  }))
                }
                placeholder="/#booking or /client or https://example.com"
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
                  Hide links without deleting them.
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

            <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black px-4 py-4">
              <span>
                <span className="block font-medium">
                  Open in new tab
                </span>

                <span className="text-sm text-zinc-500">
                  Best for outside links.
                </span>
              </span>

              <input
                type="checkbox"
                checked={
                  form.opens_new_tab
                }
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    opens_new_tab:
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
                    : "Add Link"}
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
                Public Menu
              </p>

              <h2 className="text-3xl font-bold">
                Website Links
              </h2>
            </div>

            <button
              onClick={fetchLinks}
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
              Loading navigation links...
            </div>
          ) : links.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-black/40 p-8 text-center text-zinc-500">
              No navigation links yet. Add your first menu item.
            </div>
          ) : (
            <div className="grid gap-4">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="rounded-3xl border border-white/10 bg-black/50 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-2xl font-bold">
                          {link.label}
                        </h3>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs ${
                            link.is_visible
                              ? "border-green-500 bg-green-500/10 text-green-300"
                              : "border-zinc-500 bg-zinc-500/10 text-zinc-300"
                          }`}
                        >
                          {link.is_visible
                            ? "Visible"
                            : "Hidden"}
                        </span>

                        {link.opens_new_tab && (
                          <span className="rounded-full border border-blue-500 bg-blue-500/10 px-3 py-1 text-xs text-blue-300">
                            New Tab
                          </span>
                        )}
                      </div>

                      <p className="mt-2 break-all text-zinc-400">
                        {link.href}
                      </p>

                      <p className="mt-2 text-sm text-zinc-500">
                        Sort Order: {link.sort_order}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() =>
                          startEdit(link)
                        }
                        className="rounded-full border border-white/10 px-5 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          toggleVisibility(
                            link
                          )
                        }
                        className="rounded-full border border-white/10 px-5 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
                      >
                        {link.is_visible
                          ? "Hide"
                          : "Show"}
                      </button>

                      <button
                        onClick={() =>
                          deleteLink(link)
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