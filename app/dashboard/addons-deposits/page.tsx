"use client";

import { useEffect, useMemo, useState } from "react";

import AdminUnlockGate from "@/components/admin/AdminUnlockGate";
import { getDashboardAuthHeaders } from "@/lib/security/dashboardClientAuth";
import { getClientSiteSlug } from "@/lib/site/siteConfig";

type Service = { id: number; title: string };
type Variation = { id: number; service_id: number; variation_name: string };
type Addon = { id: number; name: string; description: string | null; price: number; duration: number; is_active: boolean; sort_order: number; payment_mode: string | null; deposit_type: string | null; deposit_value: number | null };
type Assignment = { id: number; service_id: number; addon_id: number; is_enabled: boolean };
type DepositRule = { id: number; name: string; rule_scope: string; service_id: number | null; service_variation_id: number | null; client_email: string | null; payment_mode: string; deposit_type: string; deposit_value: number; min_total: number | null; max_total: number | null; priority: number; is_active: boolean };

const blankAddon = { name: "", description: "", price: "", duration: "0", payment_mode: "", deposit_type: "", deposit_value: "", is_active: true, sort_order: "100" };
const blankRule = { name: "", rule_scope: "site", service_id: "", service_variation_id: "", client_email: "", payment_mode: "deposit", deposit_type: "amount", deposit_value: "25", min_total: "", max_total: "", priority: "100", is_active: true };

export default function AddonsDepositsPage() {
  const siteSlug = getClientSiteSlug();
  const [services, setServices] = useState<Service[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [rules, setRules] = useState<DepositRule[]>([]);
  const [addonForm, setAddonForm] = useState(blankAddon);
  const [ruleForm, setRuleForm] = useState(blankRule);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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
      const [serviceData, addonData, ruleData] = await Promise.all([
        api("/api/dashboard/services"),
        api("/api/dashboard/service-addons"),
        api("/api/dashboard/deposit-rules"),
      ]);
      const variationData = await api("/api/dashboard/service-variations");
      setServices(serviceData.services ?? []);
      setVariations(variationData.variations ?? []);
      setAddons(addonData.addons ?? []);
      setAssignments(addonData.assignments ?? []);
      setRules(ruleData.rules ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Add-ons and deposit rules could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  const variationsForRule = useMemo(() => {
    const selectedServiceId = Number(ruleForm.service_id || 0);
    return selectedServiceId ? variations.filter((variation) => variation.service_id === selectedServiceId) : variations;
  }, [ruleForm.service_id, variations]);

  async function createAddon() {
    try {
      setBusy(true); setError(""); setMessage("");
      await api("/api/dashboard/service-addons", {
        method: "POST",
        body: JSON.stringify({
          ...addonForm,
          price: Number(addonForm.price || 0),
          duration: Number(addonForm.duration || 0),
          deposit_value: addonForm.deposit_value === "" ? null : Number(addonForm.deposit_value),
          sort_order: Number(addonForm.sort_order || 100),
        }),
      });
      setAddonForm(blankAddon);
      setMessage("Add-on created.");
      await loadAll();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Add-on could not be created.");
    } finally { setBusy(false); }
  }

  async function saveAddon(addon: Addon) {
    try {
      setBusy(true); setError(""); setMessage("");
      await api("/api/dashboard/service-addons", { method: "PUT", body: JSON.stringify(addon) });
      setMessage("Add-on saved."); await loadAll();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Add-on could not be saved.");
    } finally { setBusy(false); }
  }

  async function toggleAssignment(serviceId: number, addonId: number, enabled: boolean) {
    try {
      setBusy(true); setError(""); setMessage("");
      await api("/api/dashboard/service-addons", { method: "PATCH", body: JSON.stringify({ service_id: serviceId, addon_id: addonId, is_enabled: enabled }) });
      setMessage("Add-on service assignment saved."); await loadAll();
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Assignment could not be saved.");
    } finally { setBusy(false); }
  }

  async function createRule() {
    try {
      setBusy(true); setError(""); setMessage("");
      await api("/api/dashboard/deposit-rules", {
        method: "POST",
        body: JSON.stringify({
          ...ruleForm,
          service_id: ruleForm.service_id ? Number(ruleForm.service_id) : null,
          service_variation_id: ruleForm.service_variation_id ? Number(ruleForm.service_variation_id) : null,
          deposit_value: Number(ruleForm.deposit_value || 0),
          min_total: ruleForm.min_total === "" ? null : Number(ruleForm.min_total),
          max_total: ruleForm.max_total === "" ? null : Number(ruleForm.max_total),
          priority: Number(ruleForm.priority || 100),
        }),
      });
      setRuleForm(blankRule);
      setMessage("Deposit rule created."); await loadAll();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Deposit rule could not be created.");
    } finally { setBusy(false); }
  }

  async function saveRule(rule: DepositRule) {
    try {
      setBusy(true); setError(""); setMessage("");
      await api("/api/dashboard/deposit-rules", { method: "PUT", body: JSON.stringify(rule) });
      setMessage("Deposit rule saved."); await loadAll();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Deposit rule could not be saved.");
    } finally { setBusy(false); }
  }

  function assignmentEnabled(serviceId: number, addonId: number) {
    return assignments.some((assignment) => assignment.service_id === serviceId && assignment.addon_id === addonId && assignment.is_enabled);
  }

  function updateAddon(id: number, updates: Partial<Addon>) {
    setAddons((current) => current.map((addon) => addon.id === id ? { ...addon, ...updates } : addon));
  }

  function updateRule(id: number, updates: Partial<DepositRule>) {
    setRules((current) => current.map((rule) => rule.id === id ? { ...rule, ...updates } : rule));
  }

  return (
    <AdminUnlockGate title="Add-ons & Deposits">
      <main className="min-h-screen bg-black px-6 py-10 text-white md:px-10">
        <div className="mx-auto grid max-w-6xl gap-8">
          <div>
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-500">Dashboard · {siteSlug}</p>
            <h1 className="text-5xl font-black">Add-ons & Deposit Rules</h1>
            <p className="mt-4 max-w-3xl text-zinc-400">Create add-ons, enable them for specific services, and set automatic deposit rules by site, service, variation, client email, or total range.</p>
          </div>
          {error && <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div>}
          {message && <div className="rounded-3xl border border-green-500/30 bg-green-500/10 p-4 text-green-200">{message}</div>}
          {loading ? <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">Loading...</div> : (
            <>
              <section className="grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-2xl font-black">Create Add-on</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Add-on Name" value={addonForm.name} onChange={(value) => setAddonForm((current) => ({ ...current, name: value }))} />
                  <Field label="Price" type="number" value={addonForm.price} onChange={(value) => setAddonForm((current) => ({ ...current, price: value }))} />
                  <Field label="Extra Duration Minutes" type="number" value={addonForm.duration} onChange={(value) => setAddonForm((current) => ({ ...current, duration: value }))} />
                  <Field label="Sort Order" type="number" value={addonForm.sort_order} onChange={(value) => setAddonForm((current) => ({ ...current, sort_order: value }))} />
                  <TextArea label="Description" value={addonForm.description} onChange={(value) => setAddonForm((current) => ({ ...current, description: value }))} />
                </div>
                <button onClick={createAddon} disabled={busy} className="w-fit rounded-full bg-white px-6 py-3 text-sm font-black text-black disabled:opacity-60">Create Add-on</button>
              </section>

              <section className="grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-2xl font-black">Enable Add-ons for Specific Services</h2>
                {services.map((service) => <div key={service.id} className="rounded-2xl border border-white/10 bg-black p-4"><h3 className="font-black">{service.title}</h3><div className="mt-4 grid gap-3 md:grid-cols-2">{addons.map((addon) => <label key={addon.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"><input type="checkbox" checked={assignmentEnabled(service.id, addon.id)} onChange={(event) => toggleAssignment(service.id, addon.id, event.target.checked)} /><span>{addon.name} · ${Number(addon.price ?? 0).toFixed(2)}</span></label>)}</div></div>)}
              </section>

              <section className="grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-2xl font-black">Create Deposit Rule</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Rule Name" value={ruleForm.name} onChange={(value) => setRuleForm((current) => ({ ...current, name: value }))} />
                  <Select label="Rule Scope" value={ruleForm.rule_scope} onChange={(value) => setRuleForm((current) => ({ ...current, rule_scope: value }))} options={[["site", "Whole Site"], ["service", "Specific Service"], ["variation", "Specific Variation"], ["client", "Specific Client Email"], ["total", "Total Price Range"]]} />
                  <Select label="Service" value={ruleForm.service_id} onChange={(value) => setRuleForm((current) => ({ ...current, service_id: value, service_variation_id: "" }))} options={[["", "Any Service"], ...services.map((service) => [String(service.id), service.title] as [string, string])]} />
                  <Select label="Variation" value={ruleForm.service_variation_id} onChange={(value) => setRuleForm((current) => ({ ...current, service_variation_id: value }))} options={[["", "Any Variation"], ...variationsForRule.map((variation) => [String(variation.id), variation.variation_name] as [string, string])]} />
                  <Field label="Client Email" value={ruleForm.client_email} onChange={(value) => setRuleForm((current) => ({ ...current, client_email: value }))} />
                  <Select label="Payment Mode" value={ruleForm.payment_mode} onChange={(value) => setRuleForm((current) => ({ ...current, payment_mode: value }))} options={[["full", "Full Payment"], ["deposit", "Deposit"]]} />
                  <Select label="Deposit Type" value={ruleForm.deposit_type} onChange={(value) => setRuleForm((current) => ({ ...current, deposit_type: value }))} options={[["amount", "Dollar Amount"], ["percent", "Percentage"]]} />
                  <Field label="Deposit Value" type="number" value={ruleForm.deposit_value} onChange={(value) => setRuleForm((current) => ({ ...current, deposit_value: value }))} />
                  <Field label="Minimum Total" type="number" value={ruleForm.min_total} onChange={(value) => setRuleForm((current) => ({ ...current, min_total: value }))} />
                  <Field label="Maximum Total" type="number" value={ruleForm.max_total} onChange={(value) => setRuleForm((current) => ({ ...current, max_total: value }))} />
                  <Field label="Priority Lower Runs First" type="number" value={ruleForm.priority} onChange={(value) => setRuleForm((current) => ({ ...current, priority: value }))} />
                </div>
                <button onClick={createRule} disabled={busy} className="w-fit rounded-full bg-white px-6 py-3 text-sm font-black text-black disabled:opacity-60">Create Deposit Rule</button>
              </section>

              <section className="grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-6"><h2 className="text-2xl font-black">Existing Deposit Rules</h2>{rules.map((rule) => <div key={rule.id} className="rounded-2xl border border-white/10 bg-black p-4"><div className="grid gap-3 md:grid-cols-2"><Field label="Name" value={rule.name} onChange={(value) => updateRule(rule.id, { name: value })} /><Field label="Deposit Value" type="number" value={String(rule.deposit_value ?? 0)} onChange={(value) => updateRule(rule.id, { deposit_value: Number(value) })} /><Select label="Deposit Type" value={rule.deposit_type} onChange={(value) => updateRule(rule.id, { deposit_type: value })} options={[["amount", "Dollar Amount"], ["percent", "Percentage"]]} /><Field label="Priority" type="number" value={String(rule.priority ?? 100)} onChange={(value) => updateRule(rule.id, { priority: Number(value) })} /></div><button onClick={() => saveRule(rule)} disabled={busy} className="mt-4 rounded-full border border-green-500 px-5 py-2 text-green-400 disabled:opacity-50">Save Rule</button></div>)}</section>

              <section className="grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-6"><h2 className="text-2xl font-black">Existing Add-ons</h2>{addons.map((addon) => <div key={addon.id} className="rounded-2xl border border-white/10 bg-black p-4"><div className="grid gap-3 md:grid-cols-2"><Field label="Name" value={addon.name} onChange={(value) => updateAddon(addon.id, { name: value })} /><Field label="Price" type="number" value={String(addon.price ?? 0)} onChange={(value) => updateAddon(addon.id, { price: Number(value) })} /><Field label="Duration" type="number" value={String(addon.duration ?? 0)} onChange={(value) => updateAddon(addon.id, { duration: Number(value) })} /><label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"><input type="checkbox" checked={addon.is_active} onChange={(event) => updateAddon(addon.id, { is_active: event.target.checked })} /><span>Active</span></label></div><button onClick={() => saveAddon(addon)} disabled={busy} className="mt-4 rounded-full border border-green-500 px-5 py-2 text-green-400 disabled:opacity-50">Save Add-on</button></div>)}</section>
            </>
          )}
        </div>
      </main>
    </AdminUnlockGate>
  );
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
