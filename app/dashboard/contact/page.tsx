"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { supabase } from "@/lib/supabase";

interface ContactInquiry {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: string | null;
  created_at: string;
}

interface ContactSettings {
  id: number;
  contact_heading: string | null;
  contact_description: string | null;
  contact_button_label: string | null;
  show_contact_section: boolean | null;
}

export default function ContactDashboardPage() {
  const [settingsId, setSettingsId] = useState<number | null>(null);
  const [contactHeading, setContactHeading] = useState("Let’s Talk About Your Project");
  const [contactDescription, setContactDescription] = useState(
    "Send a message and we will follow up with you soon."
  );
  const [contactButtonLabel, setContactButtonLabel] = useState("Send Message");
  const [showContactSection, setShowContactSection] = useState(true);

  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function fillSettings(settings: ContactSettings) {
    setSettingsId(settings.id);
    setContactHeading(settings.contact_heading || "Let’s Talk About Your Project");
    setContactDescription(
      settings.contact_description ||
        "Send a message and we will follow up with you soon."
    );
    setContactButtonLabel(settings.contact_button_label || "Send Message");
    setShowContactSection(settings.show_contact_section ?? true);
  }

  async function fetchData() {
    try {
      setLoading(true);
      setError("");

      const [settingsResponse, inquiriesResponse] = await Promise.all([
        supabase
          .from("site_settings")
          .select("id, contact_heading, contact_description, contact_button_label, show_contact_section")
          .limit(1)
          .maybeSingle(),

        supabase
          .from("contact_inquiries")
          .select("*")
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (settingsResponse.error) throw settingsResponse.error;
      if (inquiriesResponse.error) throw inquiriesResponse.error;

      if (settingsResponse.data) fillSettings(settingsResponse.data as ContactSettings);
      setInquiries((inquiriesResponse.data ?? []) as ContactInquiry[]);
    } catch (error) {
      console.error("CONTACT DASHBOARD FETCH ERROR:", error);
      setError("Contact data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function saveSettings() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        contact_heading: contactHeading.trim(),
        contact_description: contactDescription.trim(),
        contact_button_label: contactButtonLabel.trim(),
        show_contact_section: showContactSection,
        updated_at: new Date().toISOString(),
      };

      if (settingsId) {
        const { error } = await supabase
          .from("site_settings")
          .update(payload)
          .eq("id", settingsId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("site_settings")
          .insert(payload)
          .select("id, contact_heading, contact_description, contact_button_label, show_contact_section")
          .single();

        if (error) throw error;
        if (data) fillSettings(data as ContactSettings);
      }

      setSuccess("Contact section updated.");
      await fetchData();
    } catch (error) {
      console.error("CONTACT SETTINGS SAVE ERROR:", error);
      setError("Contact settings could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function updateInquiryStatus(id: number, status: string) {
    try {
      const { error } = await supabase
        .from("contact_inquiries")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      await fetchData();
    } catch (error) {
      console.error("INQUIRY STATUS ERROR:", error);
      setError("Inquiry status could not be updated.");
    }
  }

  async function deleteInquiry(id: number) {
    const confirmed = window.confirm("Delete this contact inquiry?");
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("contact_inquiries")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchData();
    } catch (error) {
      console.error("INQUIRY DELETE ERROR:", error);
      setError("Inquiry could not be deleted.");
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            Loading
          </p>

          <h1 className="mt-4 text-3xl font-bold">
            Loading Contact Dashboard...
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white md:px-10">
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
            Dashboard
          </p>

          <h1 className="text-5xl font-bold">
            Contact
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            Edit the public contact section and review incoming inquiries.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white hover:text-black"
          >
            Dashboard Home
          </Link>

          <Link
            href="/#contact"
            className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
          >
            View Contact
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-3xl border border-red-500 bg-red-500/10 p-5 text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-3xl border border-green-500 bg-green-500/10 p-5 text-green-300">
          {success}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="mb-3 text-sm uppercase tracking-[0.25em] text-zinc-500">
            Contact Section
          </p>

          <h2 className="text-3xl font-bold">
            Public Form Settings
          </h2>

          <div className="mt-8 grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">Heading</span>
              <input
                value={contactHeading}
                onChange={(event) => setContactHeading(event.target.value)}
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">Description</span>
              <textarea
                value={contactDescription}
                onChange={(event) => setContactDescription(event.target.value)}
                rows={5}
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm text-zinc-400">Button Label</span>
              <input
                value={contactButtonLabel}
                onChange={(event) => setContactButtonLabel(event.target.value)}
                className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
              />
            </label>

            <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black px-4 py-4">
              <span>
                <span className="block font-medium">Show Contact Section</span>
                <span className="text-sm text-zinc-500">
                  Hide the public contact section without deleting inquiries.
                </span>
              </span>

              <input
                type="checkbox"
                checked={showContactSection}
                onChange={(event) => setShowContactSection(event.target.checked)}
                className="h-5 w-5"
              />
            </label>

            <div className="flex flex-wrap gap-3 pt-3">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="rounded-full bg-white px-6 py-3 font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Contact Settings"}
              </button>

              <button
                onClick={fetchData}
                disabled={saving}
                className="rounded-full border border-white/10 px-6 py-3 font-medium text-zinc-300 transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                Refresh
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-sm uppercase tracking-[0.25em] text-zinc-500">
                Inbox
              </p>

              <h2 className="text-3xl font-bold">
                Contact Inquiries
              </h2>
            </div>

            <button
              onClick={fetchData}
              className="rounded-full border border-white/10 px-5 py-3 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
            >
              Refresh
            </button>
          </div>

          {inquiries.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-black/40 p-8 text-center text-zinc-500">
              No contact inquiries yet.
            </div>
          ) : (
            <div className="grid gap-4">
              {inquiries.map((inquiry) => (
                <div
                  key={inquiry.id}
                  className="rounded-3xl border border-white/10 bg-black/50 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-2xl font-bold">
                          {inquiry.name}
                        </h3>

                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.15em] text-zinc-300">
                          {inquiry.status || "new"}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-zinc-500">
                        {inquiry.email}
                        {inquiry.phone ? ` • ${inquiry.phone}` : ""}
                      </p>

                      {inquiry.subject && (
                        <p className="mt-3 font-medium text-zinc-300">
                          {inquiry.subject}
                        </p>
                      )}

                      <p className="mt-3 whitespace-pre-line text-zinc-400">
                        {inquiry.message}
                      </p>

                      <p className="mt-3 text-xs text-zinc-600">
                        {new Date(inquiry.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => updateInquiryStatus(inquiry.id, "new")}
                        className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
                      >
                        New
                      </button>

                      <button
                        onClick={() => updateInquiryStatus(inquiry.id, "replied")}
                        className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
                      >
                        Replied
                      </button>

                      <button
                        onClick={() => updateInquiryStatus(inquiry.id, "closed")}
                        className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
                      >
                        Closed
                      </button>

                      <button
                        onClick={() => deleteInquiry(inquiry.id)}
                        className="rounded-full border border-red-500/40 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500 hover:text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}