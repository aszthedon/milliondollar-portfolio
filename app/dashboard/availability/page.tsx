"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import AdminUnlockGate from "@/components/admin/AdminUnlockGate";
import { getDashboardAuthHeaders } from "@/lib/security/dashboardClientAuth";
import { getClientSiteSlug } from "@/lib/site/siteConfig";

type Availability = {
  id: number;
  available_date: string;
  available_time: string | null;
  start_time: string | null;
  end_time: string | null;
  timezone: string | null;
};

type NewWindow = {
  available_date: string;
  available_time: string;
  start_time: string;
  end_time: string;
  timezone: string;
};

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AvailabilityPage() {
  const siteSlug = getClientSiteSlug();
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [bulkStartDate, setBulkStartDate] = useState("");
  const [bulkEndDate, setBulkEndDate] = useState("");
  const [bulkStartTime, setBulkStartTime] = useState("");
  const [bulkEndTime, setBulkEndTime] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [dateFilter, setDateFilter] = useState("");

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

  function getTodayDateString() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }

  function timeToMinutes(time: string) {
    const [hour, minute] = time.split(":");
    return Number(hour) * 60 + Number(minute ?? 0);
  }

  function isEndAfterStart(start: string, end: string) {
    return timeToMinutes(end) > timeToMinutes(start);
  }

  function formatDate(value: string) {
    const [year, month, day] = value.split("-");
    return year && month && day ? `${month}/${day}/${year}` : value;
  }

  function formatTime(value: string | null) {
    if (!value) return "Not set";
    const [hourString, minuteString] = value.split(":");
    const hour = Number(hourString);
    const minute = Number(minuteString ?? "0");
    const suffix = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`;
  }

  function getDateFromString(value: string) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function getDateString(value: Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }

  function windowKey(row: { available_date: string; start_time: string | null; end_time: string | null }) {
    return `${row.available_date}_${row.start_time}_${row.end_time}`;
  }

  async function fetchAvailability() {
    try {
      setLoading(true);
      setError("");
      const data = await api("/api/dashboard/availability");
      setAvailability(data.availability ?? []);
      setDirty(false);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Availability could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAvailability(); }, [siteSlug]);

  const totalWindows = availability.length;
  const upcomingWindows = useMemo(() => availability.filter((row) => row.available_date >= getTodayDateString()).length, [availability]);
  const filteredAvailability = useMemo(() => dateFilter ? availability.filter((row) => row.available_date === dateFilter) : availability, [availability, dateFilter]);

  function toggleDay(index: number) {
    setSelectedDays((current) => current.includes(index) ? current.filter((day) => day !== index) : [...current, index]);
  }

  function generateBulkWindows() {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Detroit";
    const windows: NewWindow[] = [];
    const start = getDateFromString(bulkStartDate);
    const end = getDateFromString(bulkEndDate);
    for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
      if (!selectedDays.includes(day.getDay())) continue;
      const availableDate = getDateString(day);
      windows.push({ available_date: availableDate, available_time: bulkStartTime, start_time: bulkStartTime, end_time: bulkEndTime, timezone });
    }
    return windows;
  }

  async function createAvailability() {
    try {
      setSaving(true); setError(""); setMessage("");
      if (!date || !startTime || !endTime) throw new Error("Complete date, start time, and end time.");
      if (!isEndAfterStart(startTime, endTime)) throw new Error("End time must be after start time.");
      if (availability.some((row) => row.available_date === date && row.start_time === startTime && row.end_time === endTime)) throw new Error("This availability window already exists.");
      await api("/api/dashboard/availability", { method: "POST", body: JSON.stringify({ available_date: date, start_time: startTime, end_time: endTime, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Detroit" }) });
      setDate(""); setStartTime(""); setEndTime(""); setMessage("Availability window added.");
      await fetchAvailability();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Availability could not be added.");
    } finally { setSaving(false); }
  }

  async function createBulkAvailability() {
    try {
      setSaving(true); setError(""); setMessage("");
      if (!bulkStartDate || !bulkEndDate || !bulkStartTime || !bulkEndTime) throw new Error("Complete all recurring availability fields.");
      if (selectedDays.length === 0) throw new Error("Select at least one weekday.");
      if (bulkEndDate < bulkStartDate) throw new Error("End date must be after start date.");
      if (!isEndAfterStart(bulkStartTime, bulkEndTime)) throw new Error("End time must be after start time.");
      const existingKeys = new Set(availability.map(windowKey));
      const windows = generateBulkWindows().filter((row) => !existingKeys.has(windowKey(row)));
      if (windows.length === 0) throw new Error("All generated availability windows already exist.");
      for (const row of windows) await api("/api/dashboard/availability", { method: "POST", body: JSON.stringify(row) });
      setMessage(`${windows.length} availability windows created.`);
      await fetchAvailability();
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : "Recurring availability could not be created.");
    } finally { setSaving(false); }
  }

  function updateAvailability(id: number, updates: Partial<Availability>) {
    setDirty(true);
    setAvailability((current) => current.map((row) => row.id === id ? { ...row, ...updates } : row));
  }

  async function saveAllAvailability() {
    try {
      setSaving(true); setError(""); setMessage("");
      await api("/api/dashboard/availability", { method: "PUT", body: JSON.stringify({ availability }) });
      setMessage("All availability changes saved.");
      await fetchAvailability();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Availability changes could not be saved.");
    } finally { setSaving(false); }
  }

  async function deleteAvailability(id: number) {
    if (!window.confirm("Delete this availability window?")) return;
    try {
      setSaving(true); setError(""); setMessage("");
      await api(`/api/dashboard/availability?id=${id}`, { method: "DELETE" });
      setMessage("Availability window deleted.");
      await fetchAvailability();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Availability could not be deleted.");
    } finally { setSaving(false); }
  }

  async function clearPastAvailability() {
    if (!window.confirm("Delete every availability window before today?")) return;
    const pastRows = availability.filter((row) => row.available_date < getTodayDateString());
    try {
      setSaving(true); setError(""); setMessage("");
      for (const row of pastRows) await api(`/api/dashboard/availability?id=${row.id}`, { method: "DELETE" });
      setMessage(`${pastRows.length} past availability windows cleared.`);
      await fetchAvailability();
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "Past availability could not be cleared.");
    } finally { setSaving(false); }
  }

  return (
    <AdminUnlockGate title="Availability Manager">
      <main className="min-h-screen bg-black px-6 py-10 text-white md:px-10">
        <div className="mx-auto grid max-w-7xl gap-8">
          <header className="flex flex-col gap-5 rounded-[2rem] border border-white/10 bg-white/5 p-6 lg:flex-row lg:items-end lg:justify-between">
            <div><p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Dashboard · {siteSlug}</p><h1 className="mt-3 text-5xl font-black">Availability Manager</h1><p className="mt-4 max-w-3xl text-zinc-400">Set one-time or recurring bookable windows for this website. Existing windows can be edited in place and bulk-saved.</p></div>
            <div className="flex flex-wrap gap-3"><Link href="/dashboard" className="rounded-full border border-white/10 px-5 py-3 text-sm font-black">Back to Dashboard</Link><button onClick={fetchAvailability} disabled={saving} className="rounded-full border border-white/10 px-5 py-3 text-sm font-black disabled:opacity-50">Refresh</button><button onClick={saveAllAvailability} disabled={saving || availability.length === 0} className="rounded-full bg-white px-5 py-3 text-sm font-black text-black disabled:opacity-50">Save All Availability Changes</button></div>
          </header>

          {error && <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">{error}</div>}
          {message && <div className="rounded-3xl border border-green-500/30 bg-green-500/10 p-5 text-green-200">{message}</div>}
          {dirty && <div className="rounded-3xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-yellow-100">You have unsaved availability edits.</div>}

          <section className="grid gap-5 md:grid-cols-3"><Stat label="Total Windows" value={totalWindows} /><Stat label="Upcoming Windows" value={upcomingWindows} /><Stat label="Recurring Weekdays Selected" value={selectedDays.length} /></section>

          <section className="grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-6"><div><p className="text-sm uppercase tracking-[0.25em] text-zinc-500">Single Window</p><h2 className="mt-2 text-2xl font-black">Add Availability</h2></div><div className="grid gap-4 md:grid-cols-4"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3" /><input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3" /><input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3" /><button onClick={createAvailability} disabled={saving} className="rounded-xl bg-white px-5 py-3 font-black text-black disabled:opacity-50">Add Window</button></div></section>

          <section className="grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-6"><div><p className="text-sm uppercase tracking-[0.25em] text-zinc-500">Recurring Windows</p><h2 className="mt-2 text-2xl font-black">Generate Multiple Dates</h2></div><div className="grid gap-4 md:grid-cols-4"><input type="date" value={bulkStartDate} onChange={(event) => setBulkStartDate(event.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3" /><input type="date" value={bulkEndDate} onChange={(event) => setBulkEndDate(event.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3" /><input type="time" value={bulkStartTime} onChange={(event) => setBulkStartTime(event.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3" /><input type="time" value={bulkEndTime} onChange={(event) => setBulkEndTime(event.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3" /></div><div className="flex flex-wrap gap-3">{weekdays.map((day, index) => <button key={day} type="button" onClick={() => toggleDay(index)} className={`rounded-full px-4 py-2 text-sm font-black ${selectedDays.includes(index) ? "bg-white text-black" : "border border-white/10 text-zinc-300"}`}>{day}</button>)}</div><button onClick={createBulkAvailability} disabled={saving} className="w-fit rounded-full bg-white px-6 py-3 text-sm font-black text-black disabled:opacity-50">Generate Availability</button></section>

          <section className="grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-6"><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-sm uppercase tracking-[0.25em] text-zinc-500">Existing Windows</p><h2 className="mt-2 text-2xl font-black">Edit Availability</h2></div><div className="flex flex-wrap gap-3"><input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="rounded-full border border-white/10 bg-black px-4 py-2 text-sm" /><button onClick={clearPastAvailability} disabled={saving} className="rounded-full border border-red-500/40 px-4 py-2 text-sm font-black text-red-300 disabled:opacity-50">Clear Past Dates</button><button onClick={saveAllAvailability} disabled={saving || availability.length === 0} className="rounded-full bg-white px-5 py-2 text-sm font-black text-black disabled:opacity-50">Save All Availability Changes</button></div></div>{loading ? <div className="rounded-2xl border border-white/10 bg-black p-6 text-zinc-400">Loading availability...</div> : filteredAvailability.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 bg-black p-6 text-zinc-400">No availability windows match this view.</div> : <div className="grid gap-3">{filteredAvailability.map((row) => <div key={row.id} className="grid gap-3 rounded-2xl border border-white/10 bg-black p-4 md:grid-cols-[1fr_0.7fr_0.7fr_1fr_auto]"><label className="grid gap-2"><span className="text-xs uppercase tracking-[0.2em] text-zinc-500">Date</span><input type="date" value={row.available_date} onChange={(event) => updateAvailability(row.id, { available_date: event.target.value })} className="rounded-xl border border-white/10 bg-black px-3 py-2" /></label><label className="grid gap-2"><span className="text-xs uppercase tracking-[0.2em] text-zinc-500">Start</span><input type="time" value={row.start_time ?? row.available_time ?? ""} onChange={(event) => updateAvailability(row.id, { start_time: event.target.value, available_time: event.target.value })} className="rounded-xl border border-white/10 bg-black px-3 py-2" /></label><label className="grid gap-2"><span className="text-xs uppercase tracking-[0.2em] text-zinc-500">End</span><input type="time" value={row.end_time ?? ""} onChange={(event) => updateAvailability(row.id, { end_time: event.target.value })} className="rounded-xl border border-white/10 bg-black px-3 py-2" /></label><div className="grid content-center text-sm text-zinc-400"><span>{formatDate(row.available_date)}</span><span>{formatTime(row.start_time ?? row.available_time)} – {formatTime(row.end_time)}</span><span>{row.timezone || "America/Detroit"}</span></div><div className="flex items-end"><button onClick={() => deleteAvailability(row.id)} disabled={saving} className="rounded-full border border-red-500 px-4 py-2 text-sm font-black text-red-400 disabled:opacity-50">Delete</button></div></div>)}</div>}</section>
        </div>
      </main>
    </AdminUnlockGate>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-3xl border border-white/10 bg-white/5 p-6"><p className="text-sm uppercase tracking-[0.2em] text-zinc-500">{label}</p><h2 className="mt-3 text-4xl font-black">{value}</h2></div>;
}
