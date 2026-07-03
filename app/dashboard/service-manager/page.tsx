"use client";

import { useEffect, useState } from "react";

import AdminUnlockGate from "@/components/admin/AdminUnlockGate";
import { getDashboardAuthHeaders } from "@/lib/security/dashboardClientAuth";
import { getClientSiteSlug } from "@/lib/site/siteConfig";

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
  payment_mode: string;
  deposit_type: string;
  deposit_value: string;
};

const fixMyCrownSlug = "fix-my-crown";

const blankForm: FormState = {
  title: "",
  description: "",
  price: "",
  duration: "",
  payment_mode: "deposit",
  deposit_type: "amount",
  deposit_value: "25",
};

const starterHairServices: FormState[] = [
  {
    title: "Silk Press",
    description: "Smooth silk press styling appointment with a polished finish.",
    price: "85",
    duration: "120",
    payment_mode: "deposit",
    deposit_type: "amount",
    deposit_value: "25",
  },
  {
    title: "Wig Install",
    description: "Wig install appointment with styling and finishing details.",
    price: "125",
    duration: "150",
    payment_mode: "deposit",
    deposit_type: "amount",
    deposit_value: "35",
  },
  {
    title: "Quick Weave",
    description: "Quick weave styling appointment for a fresh, confident look.",
    price: "100",
    duration: "150",
    payment_mode: "deposit",
    deposit_type: "amount",
    deposit_value: "30",
  },
  {
    title: "Wash, Treatment & Style",
    description: "Wash, conditioning treatment, and finished style appointment.",
    price: "95",
    duration: "150",
    payment_mode: "deposit",
    deposit_type: "amount",
    deposit_value: "25",
  },
];

function asPayload(input: FormState | Service) {
  return {
    title: String(input.title ?? "").trim(),
    description: String(input.description ?? "").trim(),
    price: Number(input.price ?? 0),
    duration: Number(input.duration ?? 60),
    payment_mode: String(input.payment_mode ?? "deposit"),
    deposit_type: String(input.deposit_type ?? "amount"),
    deposit_value: Number(input.deposit_value ?? 0),
  };
}

export default function ServiceManagerPage() {
  const siteSlug = getClientSiteSlug();
  const canUseHairStarter = siteSlug === fixMyCrownSlug;

  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState<FormState>(blankForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function api(path: string, init?: RequestInit) {
    const response = await fetch(path, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...getDashboardAuthHeaders(),
        ...(init?.headers ?? {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error ?? "Request failed.");
    }

    return data;
  }

  async function loadServices() {
    try {
      setLoading(true);
      setError("");
      const data = await api("/api/dashboard/services");
      setServices(data.services ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Services could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServices();
  }, []);

  async function createService(input: FormState) {
    const payload = asPayload(input);

    if (!payload.title || payload.price <= 0 || payload.duration <= 0) {
      throw new Error("Service title, price, and duration are required.");
    }

    await api("/api/dashboard/services", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async function handleCreate() {
    try {
      setBusy(true);
      setError("");
      setMessage("");
      await createService(form);
      setForm(blankForm);
      setMessage("Service created.");
      await loadServices();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Service could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function addStarterHairServices() {
    if (!canUseHairStarter) {
      setError("Starter hair services only run for Iyanla Fix My Crown.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      setMessage("");

      for (const starterService of starterHairServices) {
        const exists = services.some(
          (service) => service.title.toLowerCase() === starterService.title.toLowerCase()
        );

        if (!exists) {
          await createService(starterService);
        }
      }

      setMessage("Starter hair services added.");
      await loadServices();
    } catch (starterError) {
      setError(starterError instanceof Error ? starterError.message : "Starter hair services could not be added.");
    } finally {
      setBusy(false);
    }
  }

  async function saveService(service: Service) {
    try {
      setActiveId(service.id);
      setError("");
      setMessage("");
      await api("/api/dashboard/services", {
        method: "PUT",
        body: JSON.stringify({ id: service.id, ...asPayload(service) }),
      });
      setMessage("Service saved.");
      await loadServices();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Service could not be saved.");
    } finally {
      setActiveId(null);
    }
  }

  async function deleteService(id: number) {
    try {
      setActiveId(id);
      setError("");
      setMessage("");
      await api(`/api/dashboard/services?id=${id}`, { method: "DELETE" });
      setMessage("Service deleted.");
      await loadServices();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Service could not be deleted.");
    } finally {
      setActiveId(null);
    }
  }

  function updateLocal(id: number, updates: Partial<Service>) {
    setServices((current) => current.map((service) => (service.id === id ? { ...service, ...updates } : service)));
  }

  return (
    <AdminUnlockGate title="Service Manager">
      <main className="min-h-screen bg-black px-6 py-10 text-white md:px-10">
        <div className="mx-auto grid max-w-6xl gap-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-500">Dashboard · {siteSlug}</p>
              <h1 className="text-5xl font-black">Service Manager</h1>
              <p className="mt-4 max-w-2xl text-zinc-400">Create and edit booking services through the protected dashboard API.</p>
            </div>

            {canUseHairStarter && (
              <button
                type="button"
                onClick={addStarterHairServices}
                disabled={busy || loading}
                className="rounded-full border border-white/10 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
              >
                Add Starter Hair Services
              </button>
            )}
          </div>

          {error && <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div>}
          {message && <div className="rounded-3xl border border-green-500/30 bg-green-500/10 p-4 text-green-200">{message}</div>}

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-black">Create Service</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Service Title" value={form.title} onChange={(value) => setField("title", value)} />
              <Field label="Price" value={form.price} onChange={(value) => setField("price", value)} type="number" />
              <Field label="Duration Minutes" value={form.duration} onChange={(value) => setField("duration", value)} type="number" />
              <Field label="Deposit Value" value={form.deposit_value} onChange={(value) => setField("deposit_value", value)} type="number" />
              <SelectField label="Payment Mode" value={form.payment_mode} onChange={(value) => setField("payment_mode", value)} options={[["full", "Full Payment"], ["deposit", "Deposit"]]} />
              <SelectField label="Deposit Type" value={form.deposit_type} onChange={(value) => setField("deposit_type", value)} options={[["amount", "Dollar Amount"], ["percent", "Percentage"]]} />
              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm text-zinc-400">Description</span>
                <textarea value={form.description} onChange={(event) => setField("description", event.target.value)} className="min-h-24 rounded-xl border border-white/10 bg-black px-4 py-3" />
              </label>
            </div>
            <button type="button" onClick={handleCreate} disabled={busy} className="mt-5 rounded-full bg-white px-6 py-3 text-sm font-black text-black disabled:opacity-60">
              {busy ? "Saving..." : "Create Service"}
            </button>
          </section>

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">Loading services...</div>
          ) : services.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-zinc-400">No services yet.</div>
          ) : (
            <section className="grid gap-6">
              {services.map((service) => (
                <div key={service.id} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Title" value={service.title ?? ""} onChange={(value) => updateLocal(service.id, { title: value })} />
                    <Field label="Price" value={String(service.price ?? "")} onChange={(value) => updateLocal(service.id, { price: Number(value) })} type="number" />
                    <Field label="Duration" value={String(service.duration ?? "")} onChange={(value) => updateLocal(service.id, { duration: Number(value) })} type="number" />
                    <Field label="Deposit Value" value={String(service.deposit_value ?? "")} onChange={(value) => updateLocal(service.id, { deposit_value: Number(value) })} type="number" />
                    <SelectField label="Payment Mode" value={service.payment_mode ?? "deposit"} onChange={(value) => updateLocal(service.id, { payment_mode: value })} options={[["full", "Full Payment"], ["deposit", "Deposit"]]} />
                    <SelectField label="Deposit Type" value={service.deposit_type ?? "amount"} onChange={(value) => updateLocal(service.id, { deposit_type: value })} options={[["amount", "Dollar Amount"], ["percent", "Percentage"]]} />
                    <label className="grid gap-2 md:col-span-2">
                      <span className="text-sm text-zinc-400">Description</span>
                      <textarea value={service.description ?? ""} onChange={(event) => updateLocal(service.id, { description: event.target.value })} className="min-h-24 rounded-xl border border-white/10 bg-black px-4 py-3" />
                    </label>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button disabled={activeId === service.id} onClick={() => saveService(service)} className="rounded-full border border-green-500 px-5 py-2 text-green-400 disabled:opacity-50">
                      {activeId === service.id ? "Saving..." : "Save"}
                    </button>
                    <button disabled={activeId === service.id} onClick={() => deleteService(service.id)} className="rounded-full border border-red-500 px-5 py-2 text-red-500 disabled:opacity-50">
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

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm text-zinc-400">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3" />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm text-zinc-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3">
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}
