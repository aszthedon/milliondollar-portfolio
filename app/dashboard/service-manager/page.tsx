"use client";

import { useEffect, useMemo, useState } from "react";

import AdminUnlockGate from "@/components/admin/AdminUnlockGate";
import { getDashboardAuthHeaders } from "@/lib/security/dashboardClientAuth";
import { getClientSiteSlug } from "@/lib/site/siteConfig";

type Section = { id: number; title: string; description: string | null; sort_order: number; is_active: boolean };
type Service = { id: number; title: string; description: string | null; price: number | null; duration: number | null; sort_order?: number | null; section_id?: number | null; is_recurring?: boolean | null; recurring_interval?: string | null; recurring_count?: number | string | null; recurring_label?: string | null; allow_quantity?: boolean | null; min_quantity?: number | string | null; max_quantity?: number | string | null; quantity_label?: string | null };
type Variation = { id: number; service_id: number; variation_name: string; price: number | null; duration: number | null };

type ServiceForm = { title: string; description: string; price: string; duration: string; section_id: string; sort_order: string; allow_quantity: boolean; min_quantity: string; max_quantity: string; quantity_label: string; is_recurring: boolean; recurring_interval: string; recurring_count: string; recurring_label: string };
type VariationForm = { service_id: string; variation_name: string; price: string; duration: string };

const blankService: ServiceForm = { title: "", description: "", price: "", duration: "60", section_id: "", sort_order: "100", allow_quantity: false, min_quantity: "1", max_quantity: "1", quantity_label: "Quantity", is_recurring: false, recurring_interval: "weekly", recurring_count: "4", recurring_label: "Recurring service" };
const blankVariation: VariationForm = { service_id: "", variation_name: "", price: "", duration: "60" };
const blankSection = { title: "", description: "", sort_order: "100", is_active: true };

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function servicePayload(service: Partial<Service> | ServiceForm) {
  const allowQuantity = Boolean(service.allow_quantity);
  const isRecurring = Boolean(service.is_recurring);
  return {
    title: String(service.title ?? "").trim(),
    description: String(service.description ?? "").trim(),
    price: numberValue(service.price),
    duration: numberValue(service.duration, 60),
    sort_order: numberValue(service.sort_order, 100),
    section_id: numberValue(service.section_id, 0) || null,
    allow_quantity: allowQuantity,
    min_quantity: allowQuantity ? Math.max(1, numberValue(service.min_quantity, 1)) : 1,
    max_quantity: allowQuantity ? Math.max(1, numberValue(service.max_quantity, 1)) : 1,
    quantity_label: String(service.quantity_label ?? "Quantity").trim() || "Quantity",
    is_recurring: isRecurring,
    recurring_interval: isRecurring ? String(service.recurring_interval ?? "weekly") : null,
    recurring_count: isRecurring ? Math.max(1, numberValue(service.recurring_count, 4)) : null,
    recurring_label: isRecurring ? String(service.recurring_label ?? "Recurring service").trim() || "Recurring service" : null,
  };
}

function variationPayload(variation: Partial<Variation> | VariationForm) {
  return {
    service_id: numberValue(variation.service_id),
    variation_name: String(variation.variation_name ?? "").trim(),
    price: numberValue(variation.price),
    duration: numberValue(variation.duration, 60),
  };
}

export default function ServiceManagerPage() {
  const siteSlug = getClientSiteSlug();
  const [sections, setSections] = useState<Section[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [serviceForm, setServiceForm] = useState<ServiceForm>(blankService);
  const [sectionForm, setSectionForm] = useState(blankSection);
  const [variationForm, setVariationForm] = useState<VariationForm>(blankVariation);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
    if (!response.ok) throw new Error(data.error ?? "Request failed.");
    return data;
  }

  async function loadAll() {
    try {
      setLoading(true);
      setError("");
      const [sectionData, serviceData, variationData] = await Promise.all([
        api("/api/dashboard/service-sections"),
        api("/api/dashboard/services"),
        api("/api/dashboard/service-variations"),
      ]);
      const nextServices = serviceData.services ?? [];
      setSections(sectionData.sections ?? []);
      setServices(nextServices);
      setVariations(variationData.variations ?? []);
      setVariationForm((current) => ({ ...current, service_id: current.service_id || String(nextServices[0]?.id ?? "") }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Service manager data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  const groupedServices = useMemo(() => {
    const activeSections = sections.filter((section) => section.is_active !== false).sort((a, b) => Number(a.sort_order ?? 100) - Number(b.sort_order ?? 100));
    return [
      ...activeSections.map((section) => ({ section, services: services.filter((service) => Number(service.section_id) === Number(section.id)).sort((a, b) => Number(a.sort_order ?? 100) - Number(b.sort_order ?? 100)) })),
      { section: { id: 0, title: "Unsectioned Services", description: "Services not assigned to a section yet.", sort_order: 9999, is_active: true }, services: services.filter((service) => !service.section_id).sort((a, b) => Number(a.sort_order ?? 100) - Number(b.sort_order ?? 100)) },
    ].filter((group) => group.services.length > 0 || group.section.id !== 0);
  }, [sections, services]);

  async function createSection() {
    try {
      setBusy(true); setError(""); setMessage("");
      await api("/api/dashboard/service-sections", { method: "POST", body: JSON.stringify({ ...sectionForm, sort_order: numberValue(sectionForm.sort_order, 100) }) });
      setSectionForm(blankSection);
      setMessage("Service section created.");
      await loadAll();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Service section could not be created.");
    } finally { setBusy(false); }
  }

  async function saveAllSections() {
    try {
      setBusy(true); setError(""); setMessage("");
      await api("/api/dashboard/service-sections", { method: "PUT", body: JSON.stringify({ sections }) });
      setMessage("All section changes saved.");
      await loadAll();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Sections could not be saved.");
    } finally { setBusy(false); }
  }

  async function deleteSection(id: number) {
    try {
      setBusy(true); setError(""); setMessage("");
      await api(`/api/dashboard/service-sections?id=${id}`, { method: "DELETE" });
      setMessage("Section deleted. Assigned services were moved to Unsectioned.");
      await loadAll();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Section could not be deleted.");
    } finally { setBusy(false); }
  }

  async function createService() {
    try {
      setBusy(true); setError(""); setMessage("");
      const payload = servicePayload({ ...serviceForm, sort_order: String((services.length + 1) * 10) });
      if (!payload.title || payload.price <= 0 || payload.duration <= 0) throw new Error("Service title, price, and duration are required.");
      await api("/api/dashboard/services", { method: "POST", body: JSON.stringify(payload) });
      setServiceForm(blankService);
      setMessage("Service created.");
      await loadAll();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Service could not be created.");
    } finally { setBusy(false); }
  }

  async function saveAllServices() {
    try {
      setBusy(true); setError(""); setMessage("");
      const payload = services.map((service) => ({ id: service.id, ...servicePayload(service) }));
      await api("/api/dashboard/services", { method: "PUT", body: JSON.stringify({ services: payload }) });
      setMessage("ALL SERVICE CHANGES SAVED.");
      await loadAll();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "All services could not be saved.");
    } finally { setBusy(false); }
  }

  async function deleteService(id: number) {
    try {
      setBusy(true); setError(""); setMessage("");
      await api(`/api/dashboard/services?id=${id}`, { method: "DELETE" });
      setMessage("Service deleted.");
      await loadAll();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Service could not be deleted.");
    } finally { setBusy(false); }
  }

  async function createVariation() {
    try {
      setBusy(true); setError(""); setMessage("");
      const payload = variationPayload(variationForm);
      if (!payload.service_id || !payload.variation_name || payload.price <= 0 || payload.duration <= 0) throw new Error("Service, variation name, price, and duration are required.");
      await api("/api/dashboard/service-variations", { method: "POST", body: JSON.stringify(payload) });
      setVariationForm((current) => ({ ...blankVariation, service_id: current.service_id }));
      setMessage("Variation created.");
      await loadAll();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Variation could not be created.");
    } finally { setBusy(false); }
  }

  async function saveAllVariations() {
    try {
      setBusy(true); setError(""); setMessage("");
      const payload = variations.map((variation) => ({ id: variation.id, ...variationPayload(variation) }));
      await api("/api/dashboard/service-variations", { method: "PUT", body: JSON.stringify({ variations: payload }) });
      setMessage("ALL VARIATION CHANGES SAVED.");
      await loadAll();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "All variations could not be saved.");
    } finally { setBusy(false); }
  }

  async function deleteVariation(id: number) {
    try {
      setBusy(true); setError(""); setMessage("");
      await api(`/api/dashboard/service-variations?id=${id}`, { method: "DELETE" });
      setMessage("Variation deleted.");
      await loadAll();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Variation could not be deleted.");
    } finally { setBusy(false); }
  }

  function updateSection(id: number, updates: Partial<Section>) { setSections((current) => current.map((section) => section.id === id ? { ...section, ...updates } : section)); }
  function updateService(id: number, updates: Partial<Service>) { setServices((current) => current.map((service) => service.id === id ? { ...service, ...updates } : service)); }
  function updateVariation(id: number, updates: Partial<Variation>) { setVariations((current) => current.map((variation) => variation.id === id ? { ...variation, ...updates } : variation)); }

  return (
    <AdminUnlockGate title="Service Manager">
      <main className="min-h-screen bg-black px-6 py-10 text-white md:px-10">
        <div className="mx-auto grid max-w-6xl gap-8">
          <header className="grid gap-5 rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <div>
              <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-500">Dashboard · {siteSlug}</p>
              <h1 className="text-5xl font-black">Service Manager</h1>
              <p className="mt-4 max-w-2xl text-zinc-400">Edit sections, services, quantities, recurring settings, and variations. Use the big save buttons below after making multiple changes.</p>
            </div>
            <div className="sticky top-20 z-20 grid gap-3 rounded-3xl border border-green-500/40 bg-green-500/15 p-4 md:grid-cols-3">
              <button type="button" onClick={saveAllServices} disabled={busy || loading || services.length === 0} className="rounded-2xl bg-white px-6 py-4 text-base font-black uppercase tracking-wide text-black disabled:opacity-50">Save All Service Changes</button>
              <button type="button" onClick={saveAllVariations} disabled={busy || loading || variations.length === 0} className="rounded-2xl border border-white/20 bg-black px-6 py-4 text-base font-black uppercase tracking-wide text-white disabled:opacity-50">Save All Variation Changes</button>
              <button type="button" onClick={saveAllSections} disabled={busy || loading || sections.length === 0} className="rounded-2xl border border-white/20 bg-black px-6 py-4 text-base font-black uppercase tracking-wide text-white disabled:opacity-50">Save All Section Changes</button>
            </div>
          </header>

          {error && <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div>}
          {message && <div className="rounded-3xl border border-green-500/30 bg-green-500/10 p-4 text-green-200">{message}</div>}

          {loading ? <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">Loading service manager...</div> : <>
            <section className="grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-black">Create Service Section</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Section Title" value={sectionForm.title} onChange={(value) => setSectionForm((current) => ({ ...current, title: value }))} />
                <Field label="Sort Order" type="number" value={sectionForm.sort_order} onChange={(value) => setSectionForm((current) => ({ ...current, sort_order: value }))} />
                <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black px-4 py-3"><input type="checkbox" checked={sectionForm.is_active} onChange={(event) => setSectionForm((current) => ({ ...current, is_active: event.target.checked }))} /> Active</label>
                <TextArea label="Section Description" value={sectionForm.description} onChange={(value) => setSectionForm((current) => ({ ...current, description: value }))} />
              </div>
              <button type="button" onClick={createSection} disabled={busy} className="w-fit rounded-full bg-white px-6 py-3 text-sm font-black text-black disabled:opacity-60">Create Section</button>
            </section>

            <section className="grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div><h2 className="text-2xl font-black">Edit Sections</h2><p className="mt-2 text-sm text-zinc-400">Rename, describe, activate, deactivate, reorder, or delete service sections.</p></div>
                <button type="button" onClick={saveAllSections} disabled={busy} className="rounded-full bg-white px-6 py-3 text-sm font-black text-black disabled:opacity-60">Save All Sections</button>
              </div>
              {sections.map((section) => <div key={section.id} className="grid gap-3 rounded-2xl border border-white/10 bg-black p-4 md:grid-cols-[1fr_1.5fr_0.45fr_0.45fr_0.45fr]">
                <Field label="Title" value={section.title} onChange={(value) => updateSection(section.id, { title: value })} />
                <Field label="Description" value={section.description ?? ""} onChange={(value) => updateSection(section.id, { description: value })} />
                <Field label="Order" type="number" value={String(section.sort_order ?? 100)} onChange={(value) => updateSection(section.id, { sort_order: numberValue(value, 100) })} />
                <label className="flex items-center gap-2"><input type="checkbox" checked={section.is_active} onChange={(event) => updateSection(section.id, { is_active: event.target.checked })} /> Active</label>
                <button type="button" onClick={() => deleteSection(section.id)} disabled={busy} className="rounded-full border border-red-500 px-4 py-2 text-sm text-red-400 disabled:opacity-50">Delete</button>
              </div>)}
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-black">Create Service</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Service Title" value={serviceForm.title} onChange={(value) => setServiceForm((current) => ({ ...current, title: value }))} />
                <Select label="Section" value={serviceForm.section_id} onChange={(value) => setServiceForm((current) => ({ ...current, section_id: value }))} options={[["", "Unsectioned"], ...sections.map((section) => [String(section.id), section.title] as [string, string])]} />
                <Field label="Price Per Unit" type="number" value={serviceForm.price} onChange={(value) => setServiceForm((current) => ({ ...current, price: value }))} />
                <Field label="Duration Minutes Per Unit" type="number" value={serviceForm.duration} onChange={(value) => setServiceForm((current) => ({ ...current, duration: value }))} />
                <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black px-4 py-3"><input type="checkbox" checked={serviceForm.allow_quantity} onChange={(event) => setServiceForm((current) => ({ ...current, allow_quantity: event.target.checked, max_quantity: event.target.checked ? current.max_quantity : "1" }))} /> Enable service quantity</label>
                {serviceForm.allow_quantity && <QuantityFields value={serviceForm} onChange={(updates) => setServiceForm((current) => ({ ...current, ...updates }))} />}
                <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black px-4 py-3"><input type="checkbox" checked={serviceForm.is_recurring} onChange={(event) => setServiceForm((current) => ({ ...current, is_recurring: event.target.checked }))} /> Enable recurring service</label>
                {serviceForm.is_recurring && <RecurringFields value={serviceForm} onChange={(updates) => setServiceForm((current) => ({ ...current, ...updates }))} />}
                <TextArea label="Description" value={serviceForm.description} onChange={(value) => setServiceForm((current) => ({ ...current, description: value }))} />
              </div>
              <button type="button" onClick={createService} disabled={busy} className="mt-5 rounded-full bg-white px-6 py-3 text-sm font-black text-black disabled:opacity-60">Create Service</button>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-2xl font-black">Create Variation</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Select label="Parent Service" value={variationForm.service_id} onChange={(value) => setVariationForm((current) => ({ ...current, service_id: value }))} options={[["", "Choose service"], ...services.map((service) => [String(service.id), service.title] as [string, string])]} />
                <Field label="Variation Name" value={variationForm.variation_name} onChange={(value) => setVariationForm((current) => ({ ...current, variation_name: value }))} />
                <Field label="Price" type="number" value={variationForm.price} onChange={(value) => setVariationForm((current) => ({ ...current, price: value }))} />
                <Field label="Duration Minutes" type="number" value={variationForm.duration} onChange={(value) => setVariationForm((current) => ({ ...current, duration: value }))} />
              </div>
              <button type="button" onClick={createVariation} disabled={busy || services.length === 0} className="mt-5 rounded-full bg-white px-6 py-3 text-sm font-black text-black disabled:opacity-60">Create Variation</button>
            </section>

            <section className="grid gap-6">
              <div className="grid gap-4 rounded-3xl border border-green-500/40 bg-green-500/10 p-6 md:grid-cols-[1fr_auto_auto] md:items-center">
                <div><h2 className="text-2xl font-black">Edit Services</h2><p className="mt-2 text-sm text-zinc-300">Make all service and variation edits first. Then click the big save buttons.</p></div>
                <button type="button" onClick={saveAllServices} disabled={busy || services.length === 0} className="rounded-full bg-white px-6 py-3 text-sm font-black uppercase tracking-wide text-black disabled:opacity-50">Save All Service Changes</button>
                <button type="button" onClick={saveAllVariations} disabled={busy || variations.length === 0} className="rounded-full border border-white/20 px-6 py-3 text-sm font-black uppercase tracking-wide text-white disabled:opacity-50">Save All Variation Changes</button>
              </div>

              {groupedServices.map((group) => <div key={group.section.id} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="mb-5"><p className="text-sm uppercase tracking-[0.25em] text-zinc-500">Service Section</p><h2 className="mt-2 text-3xl font-black">{group.section.title}</h2>{group.section.description && <p className="mt-2 text-sm text-zinc-400">{group.section.description}</p>}</div>
                <div className="grid gap-5">
                  {group.services.map((service) => {
                    const serviceVariations = variations.filter((variation) => Number(variation.service_id) === Number(service.id));
                    return <div key={service.id} className="rounded-2xl border border-white/10 bg-black p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Title" value={service.title ?? ""} onChange={(value) => updateService(service.id, { title: value })} />
                        <Select label="Section" value={String(service.section_id ?? "")} onChange={(value) => updateService(service.id, { section_id: value ? Number(value) : null })} options={[["", "Unsectioned"], ...sections.map((section) => [String(section.id), section.title] as [string, string])]} />
                        <Field label="Price Per Unit" type="number" value={String(service.price ?? "")} onChange={(value) => updateService(service.id, { price: numberValue(value) })} />
                        <Field label="Duration Per Unit" type="number" value={String(service.duration ?? "")} onChange={(value) => updateService(service.id, { duration: numberValue(value, 60) })} />
                        <Field label="Listing Order" type="number" value={String(service.sort_order ?? 100)} onChange={(value) => updateService(service.id, { sort_order: numberValue(value, 100) })} />
                        <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"><input type="checkbox" checked={Boolean(service.allow_quantity)} onChange={(event) => updateService(service.id, { allow_quantity: event.target.checked, max_quantity: event.target.checked ? Math.max(numberValue(service.max_quantity, 1), 2) : 1 })} /> Enable quantity</label>
                        {service.allow_quantity && <QuantityFields value={{ min_quantity: String(service.min_quantity ?? 1), max_quantity: String(service.max_quantity ?? 1), quantity_label: service.quantity_label ?? "Quantity" }} onChange={(updates) => updateService(service.id, updates as Partial<Service>)} />}
                        <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"><input type="checkbox" checked={Boolean(service.is_recurring)} onChange={(event) => updateService(service.id, { is_recurring: event.target.checked })} /> Enable recurring</label>
                        {service.is_recurring && <RecurringFields value={{ recurring_interval: service.recurring_interval ?? "weekly", recurring_count: String(service.recurring_count ?? 4), recurring_label: service.recurring_label ?? "Recurring service" }} onChange={(updates) => updateService(service.id, updates as Partial<Service>)} />}
                        <TextArea label="Description" value={service.description ?? ""} onChange={(value) => updateService(service.id, { description: value })} />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={() => deleteService(service.id)} disabled={busy} className="rounded-full border border-red-500 px-5 py-2 text-red-400 disabled:opacity-50">Delete Service</button></div>

                      {serviceVariations.length > 0 && <div className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <h3 className="font-black">Variations</h3>
                        {serviceVariations.map((variation) => <div key={variation.id} className="grid gap-3 rounded-xl border border-white/10 bg-black p-3 md:grid-cols-[1fr_0.4fr_0.4fr_auto]">
                          <Field label="Name" value={variation.variation_name ?? ""} onChange={(value) => updateVariation(variation.id, { variation_name: value })} />
                          <Field label="Price" type="number" value={String(variation.price ?? "")} onChange={(value) => updateVariation(variation.id, { price: numberValue(value) })} />
                          <Field label="Duration" type="number" value={String(variation.duration ?? "")} onChange={(value) => updateVariation(variation.id, { duration: numberValue(value, 60) })} />
                          <div className="flex items-end"><button type="button" onClick={() => deleteVariation(variation.id)} disabled={busy} className="rounded-full border border-red-500 px-4 py-2 text-sm text-red-400 disabled:opacity-50">Delete</button></div>
                        </div>)}
                      </div>}
                    </div>;
                  })}
                </div>
              </div>)}
            </section>
          </>}
        </div>
      </main>
    </AdminUnlockGate>
  );
}

function QuantityFields({ value, onChange }: { value: { min_quantity?: string | number | null; max_quantity?: string | number | null; quantity_label?: string | null }; onChange: (updates: Partial<ServiceForm>) => void }) {
  return <div className="grid gap-4 rounded-2xl border border-white/10 bg-black p-4 md:col-span-2 md:grid-cols-3"><Field label="Minimum Quantity" type="number" value={String(value.min_quantity ?? 1)} onChange={(next) => onChange({ min_quantity: next })} /><Field label="Maximum Quantity" type="number" value={String(value.max_quantity ?? 1)} onChange={(next) => onChange({ max_quantity: next })} /><Field label="Quantity Label" value={String(value.quantity_label ?? "Quantity")} onChange={(next) => onChange({ quantity_label: next })} /></div>;
}

function RecurringFields({ value, onChange }: { value: { recurring_interval?: string | null; recurring_count?: string | number | null; recurring_label?: string | null }; onChange: (updates: Partial<ServiceForm>) => void }) {
  return <div className="grid gap-4 rounded-2xl border border-white/10 bg-black p-4 md:col-span-2 md:grid-cols-3"><label className="grid gap-2"><span className="text-sm text-zinc-400">Repeat Interval</span><select value={value.recurring_interval ?? "weekly"} onChange={(event) => onChange({ recurring_interval: event.target.value })} className="rounded-xl border border-white/10 bg-black px-4 py-3"><option value="weekly">Weekly</option><option value="biweekly">Every 2 Weeks</option><option value="monthly">Monthly</option><option value="custom">Custom</option></select></label><Field label="Number of Appointments" type="number" value={String(value.recurring_count ?? 4)} onChange={(next) => onChange({ recurring_count: next })} /><Field label="Recurring Label" value={String(value.recurring_label ?? "Recurring service")} onChange={(next) => onChange({ recurring_label: next })} /></div>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="grid gap-2"><span className="text-sm text-zinc-400">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3" /></label>;
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-2 md:col-span-2"><span className="text-sm text-zinc-400">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="rounded-xl border border-white/10 bg-black px-4 py-3" /></label>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return <label className="grid gap-2"><span className="text-sm text-zinc-400">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;
}
