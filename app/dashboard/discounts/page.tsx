"use client";

import { FormEvent, useEffect, useState } from "react";

import Link from "next/link";

import { supabase } from "@/lib/supabase";

interface DiscountCode {
  id: number;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

const emptyForm = {
  code: "",
  description: "",
  discount_type: "percent",
  discount_value: "",
  max_uses: "",
  starts_at: "",
  expires_at: "",
  is_active: true,
};

export default function DiscountCodesPage() {
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function fetchDiscounts() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("discount_codes")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (error) throw error;

      setDiscounts((data ?? []) as DiscountCode[]);
    } catch (error) {
      console.error("DISCOUNT FETCH ERROR:", error);
      setError("Discount codes could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDiscounts();
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setSuccess("");
  }

  function startEdit(discount: DiscountCode) {
    setEditingId(discount.id);

    setForm({
      code: discount.code || "",
      description: discount.description || "",
      discount_type: discount.discount_type || "percent",
      discount_value: String(discount.discount_value ?? ""),
      max_uses: discount.max_uses ? String(discount.max_uses) : "",
      starts_at: discount.starts_at
        ? discount.starts_at.slice(0, 16)
        : "",
      expires_at: discount.expires_at
        ? discount.expires_at.slice(0, 16)
        : "",
      is_active: discount.is_active ?? true,
    });

    setError("");
    setSuccess("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const code = form.code.trim().toUpperCase();
      const discountValue = Number(form.discount_value);

      if (!code || !Number.isFinite(discountValue) || discountValue <= 0) {
        setError("Code and discount value are required.");
        return;
      }

      if (form.discount_type === "percent" && discountValue > 100) {
        setError("Percent discounts cannot be more than 100%.");
        return;
      }

      const payload = {
        code,
        description: form.description.trim(),
        discount_type: form.discount_type,
        discount_value: discountValue,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        starts_at: form.starts_at
          ? new Date(form.starts_at).toISOString()
          : null,
        expires_at: form.expires_at
          ? new Date(form.expires_at).toISOString()
          : null,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase
          .from("discount_codes")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;

        setSuccess("Discount code updated.");
      } else {
        const { error } = await supabase
          .from("discount_codes")
          .insert(payload);

        if (error) throw error;

        setSuccess("Discount code created.");
      }

      resetForm();
      await fetchDiscounts();
    } catch (error) {
      console.error("DISCOUNT SAVE ERROR:", error);
      setError("Discount code could not be saved. Make sure the code is unique.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(discount: DiscountCode) {
    try {
      const { error } = await supabase
        .from("discount_codes")
        .update({
          is_active: !discount.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", discount.id);

      if (error) throw error;

      await fetchDiscounts();
    } catch (error) {
      console.error("DISCOUNT ACTIVE ERROR:", error);
      setError("Discount status could not be updated.");
    }
  }

  async function deleteDiscount(discount: DiscountCode) {
    const confirmed = window.confirm(`Delete discount code ${discount.code}?`);

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("discount_codes")
        .delete()
        .eq("id", discount.id);

      if (error) throw error;

      if (editingId === discount.id) {
        resetForm();
      }

      await fetchDiscounts();
    } catch (error) {
      console.error("DISCOUNT DELETE ERROR:", error);
      setError("Discount code could not be deleted.");
    }
  }

  function formatDiscount(discount: DiscountCode) {
    if (discount.discount_type === "amount") {
      return `$${discount.discount_value} off`;
    }

    return `${discount.discount_value}% off`;
  }

  function formatDate(date: string | null) {
    if (!date) return "No limit";

    return new Date(date).toLocaleString();
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white md:px-10">
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
            Dashboard
          </p>

          <h1 className="text-5xl font-bold">
            Discount Codes
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            Create promo codes clients can enter during booking. Discounts apply
            before the deposit or full payment is calculated.
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
            href="/#booking"
            className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
          >
            Test Booking
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
            {editingId ? "Edit Code" : "Create Code"}
          </p>

          <h2 className="text-3xl font-bold">
            Promo Details
          </h2>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">
                Code
              </span>

              <input
                value={form.code}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    code: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="LAUNCH10"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 uppercase text-white outline-none transition focus:border-white/40"
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
                    description: event.target.value,
                  }))
                }
                rows={4}
                placeholder="Launch discount for new clients."
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm text-zinc-400">
                  Discount Type
                </span>

                <select
                  value={form.discount_type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      discount_type: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
                >
                  <option value="percent">
                    Percent Off
                  </option>
                  <option value="amount">
                    Dollar Amount Off
                  </option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm text-zinc-400">
                  Discount Value
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discount_value}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      discount_value: event.target.value,
                    }))
                  }
                  placeholder={form.discount_type === "percent" ? "10" : "25"}
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
                />
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">
                Maximum Uses
              </span>

              <input
                type="number"
                min="1"
                value={form.max_uses}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    max_uses: event.target.value,
                  }))
                }
                placeholder="Leave blank for unlimited"
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm text-zinc-400">
                  Starts At
                </span>

                <input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      starts_at: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm text-zinc-400">
                  Expires At
                </span>

                <input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      expires_at: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
                />
              </label>
            </div>

            <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black px-4 py-4">
              <span>
                <span className="block font-medium">
                  Active
                </span>

                <span className="text-sm text-zinc-500">
                  Turn off a code without deleting it.
                </span>
              </span>

              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    is_active: event.target.checked,
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
                    : "Create Discount"}
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
                Codes
              </p>

              <h2 className="text-3xl font-bold">
                Discount List
              </h2>
            </div>

            <button
              onClick={fetchDiscounts}
              disabled={loading}
              className="rounded-full border border-white/10 px-5 py-3 text-sm text-zinc-300 transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-black/40 p-8 text-center text-zinc-500">
              Loading discount codes...
            </div>
          ) : discounts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-black/40 p-8 text-center text-zinc-500">
              No discount codes yet.
            </div>
          ) : (
            <div className="grid gap-4">
              {discounts.map((discount) => (
                <div
                  key={discount.id}
                  className="rounded-3xl border border-white/10 bg-black/50 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-2xl font-bold">
                          {discount.code}
                        </h3>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs ${
                            discount.is_active
                              ? "border-green-500 bg-green-500/10 text-green-300"
                              : "border-zinc-500 bg-zinc-500/10 text-zinc-300"
                          }`}
                        >
                          {discount.is_active ? "Active" : "Inactive"}
                        </span>

                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
                          {formatDiscount(discount)}
                        </span>
                      </div>

                      {discount.description && (
                        <p className="mt-3 text-zinc-400">
                          {discount.description}
                        </p>
                      )}

                      <div className="mt-4 grid gap-2 text-sm text-zinc-500">
                        <p>
                          Uses: {discount.used_count}
                          {discount.max_uses ? ` / ${discount.max_uses}` : " / Unlimited"}
                        </p>
                        <p>Starts: {formatDate(discount.starts_at)}</p>
                        <p>Expires: {formatDate(discount.expires_at)}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => startEdit(discount)}
                        className="rounded-full border border-white/10 px-5 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => toggleActive(discount)}
                        className="rounded-full border border-white/10 px-5 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
                      >
                        {discount.is_active ? "Disable" : "Enable"}
                      </button>

                      <button
                        onClick={() => deleteDiscount(discount)}
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