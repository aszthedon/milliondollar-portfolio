"use client";

import { useEffect, useState } from "react";

import AdminUnlockGate from "@/components/admin/AdminUnlockGate";
import { getDashboardAuthHeaders } from "@/lib/security/dashboardClientAuth";
import { getClientSiteSlug } from "@/lib/site/siteConfig";

type Settings = {
  booking_slot_interval_minutes: number;
  booking_min_notice_hours: number;
  booking_max_advance_days: number;
  booking_buffer_before_minutes: number;
  booking_buffer_after_minutes: number;
  booking_allow_same_day: boolean;
  booking_auto_confirm: boolean;
};

const defaults: Settings = {
  booking_slot_interval_minutes: 30,
  booking_min_notice_hours: 0,
  booking_max_advance_days: 365,
  booking_buffer_before_minutes: 0,
  booking_buffer_after_minutes: 0,
  booking_allow_same_day: true,
  booking_auto_confirm: false,
};

export default function BookingSettingsPage() {
  const siteSlug = getClientSiteSlug();
  const [settings, setSettings] = useState<Settings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function api(path: string, init?: RequestInit) {
    const response = await fetch(path, {
      ...init,
      cache: "no-store",
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

  async function loadSettings() {
    try {
      setLoading(true); setError("");
      const data = await api("/api/dashboard/booking-settings");
      setSettings({ ...defaults, ...(data.settings ?? {}) });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Booking settings could not be loaded.");
    } finally { setLoading(false); }
  }

  async function saveSettings() {
    try {
      setSaving(true); setError(""); setMessage("");
      await api("/api/dashboard/booking-settings", { method: "PUT", body: JSON.stringify(settings) });
      setMessage("Booking scheduling rules saved.");
      await loadSettings();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Booking settings could not be saved.");
    } finally { setSaving(false); }
  }

  useEffect(() => { loadSettings(); }, []);

  function setNumber(key: keyof Settings, value: string) {
    setSettings((current) => ({ ...current, [key]: Math.max(0, Number(value || 0)) }));
  }

  return (
    <AdminUnlockGate title="Booking Settings">
      <main className="min-h-screen bg-black px-6 py-10 text-white md:px-10">
        <div className="mx-auto grid max-w-5xl gap-8">
          <div>
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-500">Dashboard · {siteSlug}</p>
            <h1 className="text-5xl font-black">Booking Settings</h1>
            <p className="mt-4 max-w-3xl text-zinc-400">Control how clients can use your availability windows without changing code.</p>
          </div>

          {error && <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div>}
          {message && <div className="rounded-3xl border border-green-500/30 bg-green-500/10 p-4 text-green-200">{message}</div>}

          {loading ? <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">Loading booking settings...</div> : (
            <section className="grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <NumberField label="Appointment Start Interval (minutes)" value={settings.booking_slot_interval_minutes} onChange={(value) => setNumber("booking_slot_interval_minutes", value)} help="Example: 30 creates start times at 9:00, 9:30, 10:00, etc." />
                <NumberField label="Minimum Booking Notice (hours)" value={settings.booking_min_notice_hours} onChange={(value) => setNumber("booking_min_notice_hours", value)} help="How much notice a client must give before an appointment can start." />
                <NumberField label="Maximum Advance Booking (days)" value={settings.booking_max_advance_days} onChange={(value) => setNumber("booking_max_advance_days", value)} help="How far into the future clients may book." />
                <NumberField label="Buffer Before Appointment (minutes)" value={settings.booking_buffer_before_minutes} onChange={(value) => setNumber("booking_buffer_before_minutes", value)} help="Reserved setup time before each booking." />
                <NumberField label="Buffer After Appointment (minutes)" value={settings.booking_buffer_after_minutes} onChange={(value) => setNumber("booking_buffer_after_minutes", value)} help="Reserved cleanup/reset time after each booking." />
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black p-4">
                <input type="checkbox" checked={settings.booking_allow_same_day} onChange={(event) => setSettings((current) => ({ ...current, booking_allow_same_day: event.target.checked }))} />
                <span><strong>Allow same-day bookings</strong><span className="mt-1 block text-sm text-zinc-500">Minimum notice still applies when this is enabled.</span></span>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black p-4">
                <input type="checkbox" checked={settings.booking_auto_confirm} onChange={(event) => setSettings((current) => ({ ...current, booking_auto_confirm: event.target.checked }))} />
                <span><strong>Automatically confirm new bookings</strong><span className="mt-1 block text-sm text-zinc-500">If disabled, new bookings remain pending for review.</span></span>
              </label>

              <button type="button" onClick={saveSettings} disabled={saving} className="w-fit rounded-full bg-white px-6 py-3 text-sm font-black text-black disabled:opacity-60">{saving ? "Saving..." : "Save Booking Settings"}</button>
            </section>
          )}
        </div>
      </main>
    </AdminUnlockGate>
  );
}

function NumberField({ label, value, onChange, help }: { label: string; value: number; onChange: (value: string) => void; help: string }) {
  return <label className="grid gap-2"><span className="text-sm font-semibold text-zinc-300">{label}</span><input type="number" min="0" value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3" /><span className="text-xs leading-5 text-zinc-500">{help}</span></label>;
}
