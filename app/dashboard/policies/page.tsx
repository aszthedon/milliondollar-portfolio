"use client";

import { useEffect, useState } from "react";

import AdminUnlockGate from "@/components/admin/AdminUnlockGate";
import { getDashboardAuthHeaders } from "@/lib/security/dashboardClientAuth";
import { getClientSiteSlug } from "@/lib/site/siteConfig";

type PolicyForm = {
  policies_title: string;
  policies_intro: string;
  booking_policy_title: string;
  booking_policy: string;
  deposit_policy_title: string;
  deposit_policy: string;
  cancellation_policy_title: string;
  cancellation_policy: string;
  late_policy_title: string;
  late_policy: string;
  no_show_policy_title: string;
  no_show_policy: string;
  refund_policy_title: string;
  refund_policy: string;
  reschedule_policy_title: string;
  reschedule_policy: string;
  preparation_policy_title: string;
  preparation_policy: string;
  extra_policy_title: string;
  extra_policy: string;
  show_policies_link: boolean;
};

const blankPolicies: PolicyForm = {
  policies_title: "Booking Policies",
  policies_intro: "Please review all policies before booking your appointment.",
  booking_policy_title: "Booking Policy",
  booking_policy: "Appointments must be booked online.",
  deposit_policy_title: "Deposit Policy",
  deposit_policy: "Deposits may be required to secure appointments.",
  cancellation_policy_title: "Cancellation Policy",
  cancellation_policy: "Please provide advance notice for cancellations.",
  late_policy_title: "Late Arrival Policy",
  late_policy: "Late arrivals may require rescheduling.",
  no_show_policy_title: "No-Show Policy",
  no_show_policy: "No-call/no-show appointments may forfeit deposits.",
  refund_policy_title: "Refund Policy",
  refund_policy: "Payments and deposits are subject to the business refund policy.",
  reschedule_policy_title: "Reschedule Policy",
  reschedule_policy: "Reschedule requests are subject to availability.",
  preparation_policy_title: "Preparation Policy",
  preparation_policy: "Please arrive prepared for the selected service.",
  extra_policy_title: "Additional Policy",
  extra_policy: "",
  show_policies_link: true,
};

const policyBlocks: Array<{
  titleKey: keyof PolicyForm;
  bodyKey: keyof PolicyForm;
  fallbackTitle: string;
}> = [
  { titleKey: "booking_policy_title", bodyKey: "booking_policy", fallbackTitle: "Booking Policy" },
  { titleKey: "deposit_policy_title", bodyKey: "deposit_policy", fallbackTitle: "Deposit Policy" },
  { titleKey: "cancellation_policy_title", bodyKey: "cancellation_policy", fallbackTitle: "Cancellation Policy" },
  { titleKey: "late_policy_title", bodyKey: "late_policy", fallbackTitle: "Late Arrival Policy" },
  { titleKey: "no_show_policy_title", bodyKey: "no_show_policy", fallbackTitle: "No-Show Policy" },
  { titleKey: "refund_policy_title", bodyKey: "refund_policy", fallbackTitle: "Refund Policy" },
  { titleKey: "reschedule_policy_title", bodyKey: "reschedule_policy", fallbackTitle: "Reschedule Policy" },
  { titleKey: "preparation_policy_title", bodyKey: "preparation_policy", fallbackTitle: "Preparation Policy" },
  { titleKey: "extra_policy_title", bodyKey: "extra_policy", fallbackTitle: "Additional Policy" },
];

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
      if (data.policies) setForm({ ...blankPolicies, ...data.policies });
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
      setMessage("Policy titles and policy text saved. Refresh /policies to see changes.");
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
            <p className="mt-4 max-w-3xl text-zinc-400">Rename every policy heading and edit the policy text beneath it. A “Late Arrival Policy” can become an “Equipment Policy,” “Meal Policy,” or any custom policy needed for that website.</p>
          </div>

          {error && <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div>}
          {message && <div className="rounded-3xl border border-green-500/30 bg-green-500/10 p-4 text-green-200">{message}</div>}

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">Loading policies...</div>
          ) : (
            <section className="grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-6">
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black p-4">
                <input type="checkbox" checked={form.show_policies_link} onChange={(event) => setField("show_policies_link", event.target.checked)} />
                <span>Show Policies link in navigation/footer</span>
              </label>

              <Field label="Policies Page Title" value={form.policies_title} onChange={(value) => setField("policies_title", value)} />
              <TextArea label="Policies Page Intro Text" value={form.policies_intro} onChange={(value) => setField("policies_intro", value)} />

              <div className="grid gap-5">
                {policyBlocks.map((block, index) => (
                  <div key={String(block.titleKey)} className="grid gap-4 rounded-3xl border border-white/10 bg-black p-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Policy Block {index + 1}</p>
                      <p className="mt-2 text-sm text-zinc-400">Change the title to any policy type needed for this website.</p>
                    </div>
                    <Field
                      label="Policy Title"
                      value={String(form[block.titleKey] ?? block.fallbackTitle)}
                      onChange={(value) => setField(block.titleKey, value as never)}
                    />
                    <TextArea
                      label="Policy Text"
                      value={String(form[block.bodyKey] ?? "")}
                      onChange={(value) => setField(block.bodyKey, value as never)}
                    />
                  </div>
                ))}
              </div>

              <button type="button" onClick={savePolicies} disabled={saving} className="w-fit rounded-full bg-white px-6 py-3 text-sm font-black text-black disabled:opacity-60">
                {saving ? "Saving..." : "Save Policy Titles & Text"}
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
