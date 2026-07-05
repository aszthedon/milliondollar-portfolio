"use client";

import { useEffect, useState } from "react";

import AdminUnlockGate from "@/components/admin/AdminUnlockGate";
import { getDashboardAuthHeaders } from "@/lib/security/dashboardClientAuth";
import { getClientSiteSlug } from "@/lib/site/siteConfig";

type PolicyForm = {
  policies_title: string;
  policies_intro: string;
  booking_policy: string;
  deposit_policy: string;
  cancellation_policy: string;
  late_policy: string;
  no_show_policy: string;
  refund_policy: string;
  reschedule_policy: string;
  preparation_policy: string;
  extra_policy: string;
  show_policies_link: boolean;
};

const blankPolicies: PolicyForm = {
  policies_title: "Booking Policies",
  policies_intro: "Please review all policies before booking your appointment.",
  booking_policy: "Appointments must be booked online.",
  deposit_policy: "Deposits may be required to secure appointments.",
  cancellation_policy: "Please provide advance notice for cancellations.",
  late_policy: "Late arrivals may require rescheduling.",
  no_show_policy: "No-call/no-show appointments may forfeit deposits.",
  refund_policy: "Payments and deposits are subject to the business refund policy.",
  reschedule_policy: "Reschedule requests are subject to availability.",
  preparation_policy: "Please arrive prepared for the selected service.",
  extra_policy: "",
  show_policies_link: true,
};

export default function DashboardPoliciesPage() {
  const siteSlug = getClientSiteSlug();
  const [form, setForm] = useState<PolicyForm>(blankPolicies);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function setField<K extends keyof PolicyForm>(key: K, value: PolicyForm[K]) {
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
    if (!response.ok) throw new Error(data.error ?? "Request failed.");
    return data;
  }

  async function loadPolicies() {
    try {
      setLoading(true);
      setError("");
      const data = await api("/api/dashboard/policies");
      if (data.policies) {
        setForm({ ...blankPolicies, ...data.policies });
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Policies could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function savePolicies() {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      await api("/api/dashboard/policies", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setMessage("Policies saved. Refresh /policies to see changes.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Policies could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadPolicies();
  }, []);

  return (
    <AdminUnlockGate title="Policies Dashboard">
      <main className="min-h-screen bg-black px-6 py-10 text-white md:px-10">
        <div className="mx-auto grid max-w-5xl gap-8">
          <div>
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-500">Dashboard · {siteSlug}</p>
            <h1 className="text-5xl font-black">Policies</h1>
            <p className="mt-4 max-w-2xl text-zinc-400">Edit the public policies page without touching code.</p>
          </div>

          {error && <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div>}
          {message && <div className="rounded-3xl border border-green-500/30 bg-green-500/10 p-4 text-green-200">{message}</div>}

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">Loading policies...</div>
          ) : (
            <section className="grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-6">
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black p-4">
                <input type="checkbox" checked={form.show_policies_link} onChange={(event) => setField("show_policies_link", event.target.checked)} />
                <span>Show Policies link in navigation/footer</span>
              </label>

              <Field label="Policies Page Title" value={form.policies_title} onChange={(value) => setField("policies_title", value)} />
              <TextArea label="Intro Text" value={form.policies_intro} onChange={(value) => setField("policies_intro", value)} />
              <TextArea label="Booking Policy" value={form.booking_policy} onChange={(value) => setField("booking_policy", value)} />
              <TextArea label="Deposit Policy" value={form.deposit_policy} onChange={(value) => setField("deposit_policy", value)} />
              <TextArea label="Cancellation Policy" value={form.cancellation_policy} onChange={(value) => setField("cancellation_policy", value)} />
              <TextArea label="Late Policy" value={form.late_policy} onChange={(value) => setField("late_policy", value)} />
              <TextArea label="No-Show Policy" value={form.no_show_policy} onChange={(value) => setField("no_show_policy", value)} />
              <TextArea label="Refund Policy" value={form.refund_policy} onChange={(value) => setField("refund_policy", value)} />
              <TextArea label="Reschedule Policy" value={form.reschedule_policy} onChange={(value) => setField("reschedule_policy", value)} />
              <TextArea label="Preparation Policy" value={form.preparation_policy} onChange={(value) => setField("preparation_policy", value)} />
              <TextArea label="Extra / Custom Policy" value={form.extra_policy} onChange={(value) => setField("extra_policy", value)} />

              <button type="button" onClick={savePolicies} disabled={saving} className="w-fit rounded-full bg-white px-6 py-3 text-sm font-black text-black disabled:opacity-60">
                {saving ? "Saving..." : "Save Policies"}
              </button>
            </section>
          )}
        </div>
      </main>
    </AdminUnlockGate>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-2"><span className="text-sm text-zinc-400">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3" /></label>;
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-2"><span className="text-sm text-zinc-400">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={5} className="rounded-xl border border-white/10 bg-black px-4 py-3" /></label>;
}
