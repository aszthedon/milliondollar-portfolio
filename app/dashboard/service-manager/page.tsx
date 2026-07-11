"use client";

import { useEffect, useMemo, useState } from "react";

import AdminUnlockGate from "@/components/admin/AdminUnlockGate";
import { getDashboardAuthHeaders } from "@/lib/security/dashboardClientAuth";
import { getClientSiteSlug } from "@/lib/site/siteConfig";

type Section = { id: number; title: string; description: string | null; sort_order: number; is_active: boolean };
type Service = { id: number; title: string; description: string | null; price: number | null; duration: number | null; sort_order?: number | null; section_id?: number | null; is_recurring?: boolean | null; recurring_interval?: string | null; recurring_count?: number | null; recurring_label?: string | null; allow_quantity?: boolean | null; min_quantity?: number | null; max_quantity?: number | null; quantity_label?: string | null };
type Variation = { id: number; service_id: number; variation_name: string; price: number | null; duration: number | null };

type FormState = { title: string; description: string; price: string; duration: string; section_id: string; is_recurring: boolean; recurring_interval: string; recurring_count: string; recurring_label: string; allow_quantity: boolean; min_quantity: string; max_quantity: string; quantity_label: string };
type VariationFormState = { service_id: string; variation_name: string; price: string; duration: string };

const blankForm: FormState = { title: "", description: "", price: "", duration: "", section_id: "", is_recurring: false, recurring_interval: "weekly", recurring_count: "4", recurring_label: "Recurring service", allow_quantity: false, min_quantity: "1", max_quantity: "1", quantity_label: "Quantity" };
const blankVariationForm: VariationFormState = { service_id: "", variation_name: "", price: "", duration: "" };
const blankSection = { title: "", description: "", sort_order: "100", is_active: true };

function servicePayload(input: FormState | Service) {
  const isRecurring = Boolean(input.is_recurring);
  const allowQuantity = Boolean(input.allow_quantity);
  return {
    title: String(input.title ?? "").trim(),
    description: String(input.description ?? "").trim(),
    price: Number(input.price ?? 0),
    duration: Number(input.duration ?? 60),
    sort_order: Number("sort_order" in input ? input.sort_order ?? 100 : 100),
    section_id: Number(input.section_id ?? 0) || null,
    is_recurring: isRecurring,
    recurring_interval: isRecurring ? String(input.recurring_interval ?? "weekly") : null,
    recurring_count: isRecurring ? Number(input.recurring_count ?? 4) : null,
    recurring_label: isRecurring ? String(input.recurring_label ?? "Recurring service") : null,
    allow_quantity: allowQuantity,
    min_quantity: allowQuantity ? Number(input.min_quantity ?? 1) : 1,
    max_quantity: allowQuantity ? Number(input.max_quantity ?? 1) : 1,
    quantity_label: String(input.quantity_label ?? "Quantity").trim() || "Quantity",
  };
}

function variationPayload(input: VariationFormState | Variation) {
  return { service_id: Number(input.service_id ?? 0), variation_name: String(input.variation_name ?? "").trim(), price: Number(input.price ?? 0), duration: Number(input.duration ?? 60) };
}

export default function ServiceManagerPage() {
  const siteSlug = getClientSiteSlug();
  const [sections, setSections] = useState<Section[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [form, setForm] = useState<FormState>(blankForm);
  const [sectionForm, setSectionForm] = useState(blankSection);
  const [variationForm, setVariationForm] = useState<VariationFormState>(blankVariationForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function api(path: string, init?: RequestInit) {
    const response = await fetch(path, { ...init, headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...getDashboardAuthHeaders(), ...(init?.headers ?? {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "Request failed.");
    return data;
  }

  async function loadAll() {
    try {
      setLoading(true); setError("");
      const [sectionData, serviceData, variationData] = await Promise.all([api("/api/dashboard/service-sections"), api("/api/dashboard/services"), api("/api/dashboard/service-variations")]);
      setSections(sectionData.sections ?? []);
      setServices(serviceData.services ?? []);
      setVariations(variationData.variations ?? []);
      setVariationForm((current) => ({ ...current, service_id: current.service_id || String(serviceData.services?.[0]?.id ?? "") }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Service manager data could not be loaded.");
    } finally { setLoading(false); }
  }

  useEffect(() => { loadAll(); }, []);

  const groupedServices = useMemo(() => {
    const activeSections = sections.filter((section) => section.is_active !== false);
    return [
      ...activeSections.map((section) => ({ section, services: services.filter((service) => Number(service.section_id) === Number(section.id)) })),
      { section: { id: 0, title: "Unsectioned Services", description: "Services not assigned to a section yet.", sort_order: 9999, is_active: true }, services: services.filter((service) => !service.section_id) },
    ].filter((group) => group.services.length > 0 || group.section.id !== 0);
  }, [sections, services]);

  async function createSection() {
    try {
      setBusy(true); setError(""); setMessage("");
      await api("/api/dashboard/service-sections", { method: "POST", body: JSON.stringify({ ...sectionForm, sort_order: Number(sectionForm.sort_order || 100) }) });
      setSectionForm(blankSection); setMessage("Service section created."); await loadAll();
    } catch (createError) { setError(createError instanceof Error ? createError.message : "Service section could not be created."); }
    finally { setBusy(false); }
  }

  async function saveAllSections() {
    try {
      setBusy(true); setError(""); setMessage("");
      await api("/api/dashboard/service-sections", { method: "PUT", body: JSON.stringify({ sections }) });
      setMessage("Service sections saved."); await loadAll();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Service sections could not be saved."); }
    finally { setBusy(false); }
  }

  async function deleteSection(id: number) {
    try {
      setBusy(true); setError(""); setMessage("");
      await api(`/api/dashboard/service-sections?id=${id}`, { method: "DELETE" });
      setMessage("Service section deleted and services were moved to Unsectioned."); await loadAll();
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Service section could not be deleted."); }
    finally { setBusy(false); }
  }

  async function createService(input: FormState) {
    const payload = servicePayload(input);
    if (!payload.title || payload.price <= 0 || payload.duration <= 0) throw new Error("Service title, price, and duration are required.");
    await api("/api/dashboard/services", { method: "POST", body: JSON.stringify({ ...payload, sort_order: (services.length + 1) * 10 }) });
  }

  async function handleCreate() {
    try { setBusy(true); setError(""); setMessage(""); await createService(form); setForm(blankForm); setMessage("Service created."); await loadAll(); }
    catch (createError) { setError(createError instanceof Error ? createError.message : "Service could not be created."); }
    finally { setBusy(false); }
  }

  async function saveService(service: Service) {
    try { setBusy(true); setError(""); setMessage(""); await api("/api/dashboard/services", { method: "PUT", body: JSON.stringify({ id: service.id, ...servicePayload(service) }) }); setMessage("Service saved."); await loadAll(); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Service could not be saved."); }
    finally { setBusy(false); }
  }

  async function deleteService(id: number) {
    try { setBusy(true); setError(""); setMessage(""); await api(`/api/dashboard/services?id=${id}`, { method: "DELETE" }); setMessage("Service deleted."); await loadAll(); }
    catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Service could not be deleted."); }
    finally { setBusy(false); }
  }

  async function handleCreateVariation() {
    try { setBusy(true); setError(""); setMessage(""); const payload = variationPayload(variationForm); if (!payload.service_id || !payload.variation_name || payload.price <= 0 || payload.duration <= 0) throw new Error("Service, variation name, price, and duration are required."); await api("/api/dashboard/service-variations", { method: "POST", body: JSON.stringify(payload) }); setVariationForm((current) => ({ ...blankVariationForm, service_id: current.service_id })); setMessage("Variation created."); await loadAll(); }
    catch (createError) { setError(createError instanceof Error ? createError.message : "Variation could not be created."); }
    finally { setBusy(false); }
  }

  async function saveVariation(variation: Variation) {
    try { setBusy(true); setError(""); setMessage(""); await api("/api/dashboard/service-variations", { method: "PUT", body: JSON.stringify({ id: variation.id, ...variationPayload(variation) }) }); setMessage("Variation saved."); await loadAll(); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Variation could not be saved."); }
    finally { setBusy(false); }
  }

  async function deleteVariation(id: number) {
    try { setBusy(true); setError(""); setMessage(""); await api(`/api/dashboard/service-variations?id=${id}`, { method: "DELETE" }); setMessage("Variation deleted."); await loadAll(); }
    catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Variation could not be deleted."); }
    finally { setBusy(false); }
  }

  function updateSection(id: number, updates: Partial<Section>) { setSections((current) => current.map((section) => section.id === id ? { ...section, ...updates } : section)); }
  function updateLocal(id: number, updates: Partial<Service>) { setServices((current) => current.map((service) => service.id === id ? { ...service, ...updates } : service)); }
  function updateLocalVariation(id: number, updates: Partial<Variation>) { setVariations((current) => current.map((variation) => variation.id === id ? { ...variation, ...updates } : variation)); }

  return (
    <AdminUnlockGate title="Service Manager">
      <main className="min-h-screen bg-black px-6 py-10 text-white md:px-10">
        <div className="mx-auto grid max-w-6xl gap-8">
          <div><p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-500">Dashboard · {siteSlug}</p><h1 className="text-5xl font-black">Service Manager</h1><p className="mt-4 max-w-2xl text-zinc-400">Create service sections, assign services into sections, reorder sections, and manage pricing/quantity/recurring settings.</p></div>
          {error && <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div>}{message && <div className="rounded-3xl border border-green-500/30 bg-green-500/10 p-4 text-green-200">{message}</div>}
          {loading ? <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">Loading service manager...</div> : <>
            <section className="grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-6"><h2 className="text-2xl font-black">Create Service Section</h2><div className="grid gap-4 md:grid-cols-3"><Field label="Section Title" value={sectionForm.title} onChange={(value) => setSectionForm((current) => ({ ...current, title: value }))} /><Field label="Sort Order" type="number" value={sectionForm.sort_order} onChange={(value) => setSectionForm((current) => ({ ...current, sort_order: value }))} /><label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black px-4 py-3"><input type="checkbox" checked={sectionForm.is_active} onChange={(event) => setSectionForm((current) => ({ ...current, is_active: event.target.checked }))} /> Active</label><TextArea label="Section Description" value={sectionForm.description} onChange={(value) => setSectionForm((current) => ({ ...current, description: value }))} /></div><button type="button" onClick={createSection} disabled={busy} className="w-fit rounded-full bg-white px-6 py-3 text-sm font-black text-black disabled:opacity-60">Create Section</button></section>
            <section className="grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-6"><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><h2 className="text-2xl font-black">Edit Sections</h2><p className="mt-2 text-sm text-zinc-400">Rename sections, update descriptions, reorder them, or deactivate sections.</p></div><button type="button" onClick={saveAllSections} disabled={busy} className="rounded-full bg-white px-6 py-3 text-sm font-black text-black disabled:opacity-60">Save All Sections</button></div>{sections.map((section) => <div key={section.id} className="grid gap-3 rounded-2xl border border-white/10 bg-black p-4 md:grid-cols-[1fr_1.5fr_0.4fr_0.4fr_0.4fr]"><Field label="Title" value={section.title} onChange={(value) => updateSection(section.id, { title: value })} /><Field label="Description" value={section.description ?? ""} onChange={(value) => updateSection(section.id, { description: value })} /><Field label="Order" type="number" value={String(section.sort_order ?? 100)} onChange={(value) => updateSection(section.id, { sort_order: Number(value) })} /><label className="flex items-center gap-2"><input type="checkbox" checked={section.is_active} onChange={(event) => updateSection(section.id, { is_active: event.target.checked })} /> Active</label><button type="button" onClick={() => deleteSection(section.id)} disabled={busy} className="rounded-full border border-red-500 px-4 py-2 text-sm text-red-400 disabled:opacity-50">Delete</button></div>)}</section>
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6"><h2 className="text-2xl font-black">Create Service</h2><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="Service Title" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} /><Select label="Section" value={form.section_id} onChange={(value) => setForm((current) => ({ ...current, section_id: value }))} options={[["", "Unsectioned"], ...sections.map((section) => [String(section.id), section.title] as [string, string])]} /><Field label="Price Per Unit" value={form.price} onChange={(value) => setForm((current) => ({ ...current, price: value }))} type="number" /><Field label="Duration Minutes Per Unit" value={form.duration} onChange={(value) => setForm((current) => ({ ...current, duration: value }))} type="number" /><label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black px-4 py-3"><input type="checkbox" checked={form.allow_quantity} onChange={(event) => setForm((current) => ({ ...current, allow_quantity: event.target.checked, max_quantity: event.target.checked ? current.max_quantity : "1" }))} /> Enable service quantity</label>{form.allow_quantity && <QuantityFields value={form} onChange={(updates) => setForm((current) => ({ ...current, ...updates }))} />}<label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black px-4 py-3"><input type="checkbox" checked={form.is_recurring} onChange={(event) => setForm((current) => ({ ...current, is_recurring: event.target.checked }))} /> Enable recurring service</label>{form.is_recurring && <RecurringFields value={form} onChange={(updates) => setForm((current) => ({ ...current, ...updates }))} />}<TextArea label="Description" value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} /></div><button type="button" onClick={handleCreate} disabled={busy} className="mt-5 rounded-full bg-white px-6 py-3 text-sm font-black text-black disabled:opacity-60">Create Service</button></section>
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6"><h2 className="text-2xl font-black">Create Variation</h2><div className="mt-5 grid gap-4 md:grid-cols-2"><Select label="Parent Service" value={variationForm.service_id} onChange={(value) => setVariationForm((current) => ({ ...current, service_id: value }))} options={[["", "Choose service"], ...services.map((service) => [String(service.id), service.title] as [string, string])]} /><Field label="Variation Name" value={variationForm.variation_name} onChange={(value) => setVariationForm((current) => ({ ...current, variation_name: value }))} /><Field label="Price" value={variationForm.price} onChange={(value) => setVariationForm((current) => ({ ...current, price: value }))} type="number" /><Field label="Duration Minutes" value={variationForm.duration} onChange={(value) => setVariationForm((current) => ({ ...current, duration: value }))} type="number" /></div><button type="button" onClick={handleCreateVariation} disabled={busy || services.length === 0} className="mt-5 rounded-full bg-white px-6 py-3 text-sm font-black text-black disabled:opacity-60">Create Variation</button></section>
            <section className="grid gap-6">{groupedServices.map((group) => <div key={group.section.id} className="rounded-3xl border border-white/10 bg-white/5 p-6"><div className="mb-5"><p className="text-sm uppercase tracking-[0.25em] text-zinc-500">Service Section</p><h2 className="mt-2 text-3xl font-black">{group.section.title}</h2>{group.section.description && <p className="mt-2 text-sm text-zinc-400">{group.section.description}</p>}</div><div className="grid gap-5">{group.services.map((service) => { const serviceVariations = variations.filter((variation) => variation.service_id === service.id); return <div key={service.id} className="rounded-2xl border border-white/10 bg-black p-4"><div className="grid gap-4 md:grid-cols-2"><Field label="Title" value={service.title ?? ""} onChange={(value) => updateLocal(service.id, { title: value })} /><Select label="Section" value={String(service.section_id ?? "")} onChange={(value) => updateLocal(service.id, { section_id: value ? Number(value) : null })} options={[["", "Unsectioned"], ...sections.map((section) => [String(section.id), section.title] as [string, string])]} /><Field label="Price Per Unit" value={String(service.price ?? "")} onChange={(value) => updateLocal(service.id, { price: Number(value) })} type="number" /><Field label="Duration Per Unit" value={String(service.duration ?? "")} onChange={(value) => updateLocal(service.id, { duration: Number(value) })} type="number" /><Field label="Listing Order" value={String(service.sort_order ?? 100)} onChange={(value) => updateLocal(service.id, { sort_order: Number(value) })} type="number" /><label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"><input type="checkbox" checked={Boolean(service.allow_quantity)} onChange={(event) => updateLocal(service.id, { allow_quantity: event.target.checked, max_quantity: event.target.checked ? Math.max(Number(service.max_quantity ?? 1), 2) : 1 })} /> Enable quantity</label>{service.allow_quantity && <QuantityFields value={{ min_quantity: String(service.min_quantity ?? 1), max_quantity: String(service.max_quantity ?? 1), quantity_label: service.quantity_label ?? "Quantity" }} onChange={(updates) => updateLocal(service.id, updates as Partial<Service>)} />}<label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"><input type="checkbox" checked={Boolean(service.is_recurring)} onChange={(event) => updateLocal(service.id, { is_recurring: event.target.checked })} /> Enable recurring</label>{service.is_recurring && <RecurringFields value={{ recurring_interval: service.recurring_interval ?? "weekly", recurring_count: String(service.recurring_count ?? 4), recurring_label: service.recurring_label ?? "Recurring service" }} onChange={(updates) => updateLocal(service.id, updates as Partial<Service>)} />}<TextArea label="Description" value={service.description ?? ""} onChange={(value) => updateLocal(service.id, { description: value })} /></div><div className="mt-4 flex flex-wrap gap-3"><button onClick={() => saveService(service)} disabled={busy} className="rounded-full border border-green-500 px-5 py-2 text-green-400 disabled:opacity-50">Save Service</button><button onClick={() => deleteService(service.id)} disabled={busy} className="rounded-full border border-red-500 px-5 py-2 text-red-400 disabled:opacity-50">Delete Service</button></div>{serviceVariations.length > 0 && <div className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"><h3 className="font-black">Variations</h3>{serviceVariations.map((variation) => <div key={variation.id} className="grid gap-3 rounded-xl border border-white/10 bg-black p-3 md:grid-cols-[1fr_0.4fr_0.4fr_auto]"><Field label="Name" value={variation.variation_name ?? ""} onChange={(value) => updateLocalVariation(variation.id, { variation_name: value })} /><Field label="Price" type="number" value={String(variation.price ?? "")} onChange={(value) => updateLocalVariation(variation.id, { price: Number(value) })} /><Field label="Duration" type="number" value={String(variation.duration ?? "")} onChange={(value) => updateLocalVariation(variation.id, { duration: Number(value) })} /><div className="flex items-end gap-2"><button onClick={() => saveVariation(variation)} disabled={busy} className="rounded-full border border-green-500 px-4 py-2 text-sm text-green-400 disabled:opacity-50">Save</button><button onClick={() => deleteVariation(variation.id)} disabled={busy} className="rounded-full border border-red-500 px-4 py-2 text-sm text-red-400 disabled:opacity-50">Delete</button></div></div>)}</div>}</div>; })}</div></div>)}</section>
          </>}
        </div>
      </main>
    </AdminUnlockGate>
  );
}

function QuantityFields({ value, onChange }: { value: { min_quantity?: string | number | null; max_quantity?: string | number | null; quantity_label?: string | null }; onChange: (updates: Partial<FormState>) => void }) { return <div className="grid gap-4 rounded-2xl border border-white/10 bg-black p-4 md:col-span-2 md:grid-cols-3"><Field label="Minimum Quantity" value={String(value.min_quantity ?? 1)} onChange={(next) => onChange({ min_quantity: next })} type="number" /><Field label="Maximum Quantity" value={String(value.max_quantity ?? 1)} onChange={(next) => onChange({ max_quantity: next })} type="number" /><Field label="Quantity Label" value={String(value.quantity_label ?? "Quantity")} onChange={(next) => onChange({ quantity_label: next })} /></div>; }
function RecurringFields({ value, onChange }: { value: { recurring_interval?: string | null; recurring_count?: string | number | null; recurring_label?: string | null }; onChange: (updates: Partial<FormState>) => void }) { return <div className="grid gap-4 rounded-2xl border border-white/10 bg-black p-4 md:col-span-2 md:grid-cols-3"><label className="grid gap-2"><span className="text-sm text-zinc-400">Repeat Interval</span><select value={value.recurring_interval ?? "weekly"} onChange={(event) => onChange({ recurring_interval: event.target.value })} className="rounded-xl border border-white/10 bg-black px-4 py-3"><option value="weekly">Weekly</option><option value="biweekly">Every 2 Weeks</option><option value="monthly">Monthly</option><option value="custom">Custom</option></select></label><Field label="Number of Appointments" value={String(value.recurring_count ?? 4)} onChange={(next) => onChange({ recurring_count: next })} type="number" /><Field label="Recurring Label" value={String(value.recurring_label ?? "Recurring service")} onChange={(next) => onChange({ recurring_label: next })} /></div>; }
function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="grid gap-2"><span className="text-sm text-zinc-400">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3" /></label>; }
function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="grid gap-2 md:col-span-2"><span className="text-sm text-zinc-400">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="rounded-xl border border-white/10 bg-black px-4 py-3" /></label>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) { return <label className="grid gap-2"><span className="text-sm text-zinc-400">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>; }
