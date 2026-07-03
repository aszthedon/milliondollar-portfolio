"use client";

import { useEffect, useState } from "react";

import AdminUnlockGate from "@/components/admin/AdminUnlockGate";
import { getClientSiteSlug } from "@/lib/site/siteConfig";
import { supabase } from "@/lib/supabase";

type Service = {
  id: number;
  title: string;
  description: string | null;
  price: number | null;
  duration: number | null;
  payment_mode?: string | null;
  deposit_type?: string | null;
  deposit_value?: number | null;
};

type FormState = {
  title: string;
  description: string;
  price: string;
  duration: string;
  paymentMode: string;
  depositType: string;
  depositValue: string;
};

const defaultForm: FormState = {
  title: "",
  description: "",
  price: "",
  duration: "",
  paymentMode: "deposit",
  depositType: "amount",
  depositValue: "25",
};

const starterServices = [
  {
    title: "Silk Press",
    description: "Smooth silk press styling appointment with a polished finish.",
    price: "85",
    duration: "120",
    paymentMode: "deposit",
    depositType: "amount",
    depositValue: "25",
  },
  {
    title: "Wig Install",
    description: "Wig install appointment with styling and finishing details.",
    price: "125",
    duration: "150",
    paymentMode: "deposit",
    depositType: "amount",
    depositValue: "35",
  },
  {
    title: "Quick Weave",
    description: "Quick weave styling appointment for a fresh, confident look.",
    price: "100",
    duration: "150",
    paymentMode: "deposit",
    depositType: "amount",
    depositValue: "30",
  },
  {
    title: "Wash, Treatment & Style",
    description: "Wash, conditioning treatment, and finished style appointment.",
    price: "95",
    duration: "150",
    paymentMode: "deposit",
    depositType: "amount",
    depositValue: "25",
  },
];

function toNumber(value: string, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

export default function ServicesDashboardPage() {
  const siteSlug = getClientSiteSlug();

  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function fetchServices() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("site_slug", siteSlug)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setServices((data ?? []) as Service[]);
    } catch (fetchError) {
      console.error("SERVICES FETCH ERROR:", fetchError);
      setError("Services could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchServices();
  }, []);

  async function createServiceFromForm(source: FormState) {
    const cleanTitle = source.title.trim();
    const cleanPrice = toNumber(source.price);
    const cleanDuration = toNumber(source.duration, 60);

    if (!cleanTitle || cleanPrice <= 0 || cleanDuration <= 0) {
      throw new Error("Service title, price, and duration are required.");
    }

    const { error } = await supabase.from("services").insert({
      site_slug: siteSlug,
      title: cleanTitle,
      description: source.description.trim(),
      price: cleanPrice,
      duration: cleanDuration,
      payment_mode: source.paymentMode,
      deposit_type: source.depositType,
      deposit_value: toNumber(source.depositValue),
    });

    if (error) {
      throw error;
    }
  }

  async function createService() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await createServiceFromForm(form);
      setForm(defaultForm);
      setSuccess("Service created.");
      await fetchServices();
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "Service could not be created."
      );
    } finally {
      setSaving(false);
    }
  }

  async function addStarterServices() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      for (const starterService of starterServices) {
        const existing = services.some(
          (service) =>
            service.title.trim().toLowerCase() ===
            starterService.title.trim().toLowerCase()
        );

        if (!existing) {
          await createServiceFromForm(starterService);
        }
      }

      setSuccess("Starter hairstylist services added.");
      await fetchServices();
    } catch (starterError) {
      setError(
        starterError instanceof Error
          ? starterError.message
          : "Starter services could not be added."
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveService(service: Service) {
    try {
      setLoadingId(service.id);
      setError("");
      setSuccess("");

      const { error } = await supabase
        .from("services")
        .update({
          title: service.title,
          description: service.description,
          price: Number(service.price ?? 0),
          duration: Number(service.duration ?? 60),
          payment_mode: service.payment_mode ?? "deposit",
          deposit_type: service.deposit_type ?? "amount",
          deposit_value: Number(service.deposit_value ?? 0),
        })
        .eq("site_slug", siteSlug)
        .eq("id", service.id);

      if (error) {
        throw error;
      }

      setSuccess("Service saved.");
      await fetchServices();
    } catch (saveError) {
      console.error("SERVICE SAVE ERROR:", saveError);
      setError("Service could not be saved.");
    } finally {
      setLoadingId(null);
    }
  }

  async function deleteService(id: number) {
    try {
      setLoadingId(id);
      setError("");
      setSuccess("");

      const { error } = await supabase
        .from("services")
        .delete()
        .eq("site_slug", siteSlug)
        .eq("id", id);

      if (error) {
        throw error;
      }

      setSuccess("Service deleted.");
      await fetchServices();
    } catch (deleteError) {
      console.error("SERVICE DELETE ERROR:", deleteError);
      setError("Service could not be deleted.");
    } finally {
      setLoadingId(null);
    }
  }

  function updateLocalService(id: number, updates: Partial<Service>) {
    setServices((current) =>
      current.map((service) =>
        service.id === id
          ? {
              ...service,
              ...updates,
            }
          : service
      )
    );
  }

  return (
    <AdminUnlockGate title="Services Dashboard">
      <main className="min-h-screen bg-black px-6 py-10 text-white md:px-10">
        <div className="mx-auto grid max-w-6xl gap-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
                Dashboard · {siteSlug}
              </p>
              <h1 className="text-5xl font-bold">Services</h1>
              <p className="mt-4 max-w-2xl text-zinc-400">
                Add, edit, and price booking services for the current site without touching code.
              </p>
            </div>

            <button
              type="button"
              onClick={addStarterServices}
              disabled={saving || loading}
              className="rounded-full border border-white/10 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              Add Starter Hair Services
            </button>
          </div>

          {error && (
            <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-3xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-200">
              {success}
            </div>
          )}

          <section className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-black">Create Service</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Service Title" value={form.title} onChange={(value) => setField("title", value)} />
              <Field label="Price" value={form.price} onChange={(value) => setField("price", value)} type="number" />
              <Field label="Duration Minutes" value={form.duration} onChange={(value) => setField("duration", value)} type="number" />
              <Field label="Deposit Amount" value={form.depositValue} onChange={(value) => setField("depositValue", value)} type="number" />

              <label className="grid gap-2">
                <span className="text-sm text-zinc-400">Payment Mode</span>
                <select
                  value={form.paymentMode}
                  onChange={(event) => setField("paymentMode", event.target.value)}
                  className="rounded-xl border border-white/10 bg-black px-4 py-3"
                >
                  <option value="full">Full Payment</option>
                  <option value="deposit">Deposit</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm text-zinc-400">Deposit Type</span>
                <select
                  value={form.depositType}
                  onChange={(event) => setField("depositType", event.target.value)}
                  className="rounded-xl border border-white/10 bg-black px-4 py-3"
                >
                  <option value="amount">Dollar Amount</option>
                  <option value="percent">Percentage</option>
                </select>
              </label>

              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm text-zinc-400">Description</span>
                <textarea
                  value={form.description}
                  onChange={(event) => setField("description", event.target.value)}
                  className="min-h-24 rounded-xl border border-white/10 bg-black px-4 py-3"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={createService}
              disabled={saving}
              className="w-fit rounded-full bg-white px-6 py-3 text-sm font-black text-black disabled:opacity-60"
            >
              {saving ? "Saving..." : "Create Service"}
            </button>
          </section>

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">
              Loading services...
            </div>
          ) : services.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-zinc-400">
              No services yet. Add one manually or use the starter hair services button.
            </div>
          ) : (
            <section className="grid gap-6">
              {services.map((service) => (
                <div key={service.id} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label="Title"
                      value={service.title ?? ""}
                      onChange={(value) => updateLocalService(service.id, { title: value })}
                    />
                    <Field
                      label="Price"
                      value={String(service.price ?? "")}
                      onChange={(value) => updateLocalService(service.id, { price: Number(value) })}
                      type="number"
                    />
                    <Field
                      label="Duration"
                      value={String(service.duration ?? "")}
                      onChange={(value) => updateLocalService(service.id, { duration: Number(value) })}
                      type="number"
                    />
                    <Field
                      label="Deposit Value"
                      value={String(service.deposit_value ?? "")}
                      onChange={(value) => updateLocalService(service.id, { deposit_value: Number(value) })}
                      type="number"
                    />

                    <label className="grid gap-2">
                      <span className="text-sm text-zinc-400">Payment Mode</span>
                      <select
                        value={service.payment_mode ?? "deposit"}
                        onChange={(event) => updateLocalService(service.id, { payment_mode: event.target.value })}
                        className="rounded-xl border border-white/10 bg-black px-4 py-3"
                      >
                        <option value="full">Full Payment</option>
                        <option value="deposit">Deposit</option>
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm text-zinc-400">Deposit Type</span>
                      <select
                        value={service.deposit_type ?? "amount"}
                        onChange={(event) => updateLocalService(service.id, { deposit_type: event.target.value })}
                        className="rounded-xl border border-white/10 bg-black px-4 py-3"
                      >
                        <option value="amount">Dollar Amount</option>
                        <option value="percent">Percentage</option>
                      </select>
                    </label>

                    <label className="grid gap-2 md:col-span-2">
                      <span className="text-sm text-zinc-400">Description</span>
                      <textarea
                        value={service.description ?? ""}
                        onChange={(event) => updateLocalService(service.id, { description: event.target.value })}
                        className="min-h-24 rounded-xl border border-white/10 bg-black px-4 py-3"
                      />
                    </label>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      disabled={loadingId === service.id}
                      onClick={() => saveService(service)}
                      className="rounded-full border border-green-500 px-5 py-2 text-green-400 disabled:opacity-50"
                    >
                      {loadingId === service.id ? "Saving..." : "Save"}
                    </button>

                    <button
                      disabled={loadingId === service.id}
                      onClick={() => deleteService(service.id)}
                      className="rounded-full border border-red-500 px-5 py-2 text-red-500 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>
      </main>
    </AdminUnlockGate>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm text-zinc-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-white/10 bg-black px-4 py-3"
      />
    </label>
  );
}
