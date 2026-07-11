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
  sort_order?: number | null;
  section_id?: number | null;
  image_url?: string | null;
  image_alt_text?: string | null;
  show_in_gallery?: boolean | null;
  [key: string]: unknown;
};

export default function ServiceImagesPage() {
  const siteSlug = getClientSiteSlug();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function api(path: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    for (const [key, value] of Object.entries(getDashboardAuthHeaders())) headers.set(key, value);
    if (init?.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
    const response = await fetch(path, { ...init, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "Request failed.");
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

  function updateService(id: number, updates: Partial<Service>) {
    setServices((current) => current.map((service) => service.id === id ? { ...service, ...updates } : service));
  }

  async function uploadImage(service: Service, file: File) {
    try {
      setBusyId(service.id);
      setError("");
      setMessage("");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("service_id", String(service.id));
      const data = await api("/api/dashboard/service-images/upload", { method: "POST", body: formData });
      updateService(service.id, {
        image_url: data.image_url,
        image_alt_text: service.image_alt_text || service.title,
        show_in_gallery: service.show_in_gallery ?? true,
      });
      setMessage(`${service.title} image uploaded. Click Save All Service Images to publish it.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image could not be uploaded.");
    } finally {
      setBusyId(null);
    }
  }

  async function saveAll() {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      await api("/api/dashboard/services", {
        method: "PUT",
        body: JSON.stringify({ services }),
      });
      setMessage("All service images and gallery settings saved.");
      await loadServices();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Service images could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminUnlockGate title="Service Images">
      <main className="min-h-screen bg-black px-6 py-10 text-white md:px-10">
        <div className="mx-auto grid max-w-6xl gap-8">
          <header className="grid gap-5 rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <div>
              <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-500">Dashboard · {siteSlug}</p>
              <h1 className="text-5xl font-black">Service Images</h1>
              <p className="mt-4 max-w-3xl text-zinc-400">Upload one picture for every service. Any service with “Show in Gallery” enabled will automatically appear on the public Gallery page.</p>
            </div>
            <button type="button" onClick={saveAll} disabled={saving || loading || services.length === 0} className="w-fit rounded-full bg-white px-6 py-3 text-sm font-black text-black disabled:opacity-60">{saving ? "Saving..." : "Save All Service Images"}</button>
          </header>

          {error && <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div>}
          {message && <div className="rounded-3xl border border-green-500/30 bg-green-500/10 p-4 text-green-200">{message}</div>}

          {loading ? <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">Loading services...</div> : (
            <section className="grid gap-5">
              {services.map((service) => (
                <article key={service.id} className="grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-5 md:grid-cols-[260px_1fr]">
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                    {service.image_url ? (
                      <img src={service.image_url} alt={service.image_alt_text || service.title} className="h-64 w-full object-cover" />
                    ) : (
                      <div className="flex h-64 items-center justify-center p-6 text-center text-sm text-zinc-500">No image uploaded</div>
                    )}
                  </div>
                  <div className="grid content-start gap-4">
                    <div>
                      <h2 className="text-2xl font-black">{service.title}</h2>
                      <p className="mt-1 text-sm text-zinc-500">${Number(service.price ?? 0).toFixed(2)} · {service.duration ?? 60} minutes</p>
                    </div>
                    <label className="grid gap-2">
                      <span className="text-sm text-zinc-400">Upload Image</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busyId === service.id} onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadImage(service, file); }} className="rounded-xl border border-white/10 bg-black px-4 py-3" />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm text-zinc-400">Or Paste Image URL</span>
                      <input value={service.image_url ?? ""} onChange={(event) => updateService(service.id, { image_url: event.target.value })} placeholder="https://..." className="rounded-xl border border-white/10 bg-black px-4 py-3" />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm text-zinc-400">Image Description / Alt Text</span>
                      <input value={service.image_alt_text ?? ""} onChange={(event) => updateService(service.id, { image_alt_text: event.target.value })} placeholder={service.title} className="rounded-xl border border-white/10 bg-black px-4 py-3" />
                    </label>
                    <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black px-4 py-3">
                      <input type="checkbox" checked={service.show_in_gallery !== false} onChange={(event) => updateService(service.id, { show_in_gallery: event.target.checked })} />
                      Automatically show this service image in Gallery
                    </label>
                    {service.image_url && <button type="button" onClick={() => updateService(service.id, { image_url: null, image_alt_text: null })} className="w-fit rounded-full border border-red-500 px-4 py-2 text-sm text-red-400">Remove Image</button>}
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>
      </main>
    </AdminUnlockGate>
  );
}
