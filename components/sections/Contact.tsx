"use client";

import { FormEvent, useEffect, useState } from "react";

import Container from "@/components/Container";
import { getClientSiteSlug } from "@/lib/site/siteConfig";
import { supabase } from "@/lib/supabase";

interface ContactSettings {
  contact_heading: string | null;
  contact_description: string | null;
  contact_button_label: string | null;
  show_contact_section: boolean | null;
}

const fallbackSettings: ContactSettings = {
  contact_heading: "Let’s Talk About Your Project",
  contact_description: "Send a message and we will follow up with you soon.",
  contact_button_label: "Send Message",
  show_contact_section: true,
};

export default function Contact() {
  const siteSlug = getClientSiteSlug();
  const [settings, setSettings] = useState<ContactSettings>(fallbackSettings);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function fetchContactSettings() {
      const { data, error } = await supabase
        .from("site_settings")
        .select("contact_heading,contact_description,contact_button_label,show_contact_section")
        .eq("site_slug", siteSlug)
        .maybeSingle();

      if (error) {
        console.error("PUBLIC CONTACT SETTINGS ERROR:", error);
        setLoading(false);
        return;
      }

      if (data) {
        setSettings({
          contact_heading: data.contact_heading || fallbackSettings.contact_heading,
          contact_description: data.contact_description || fallbackSettings.contact_description,
          contact_button_label: data.contact_button_label || fallbackSettings.contact_button_label,
          show_contact_section: data.show_contact_section ?? true,
        });
      }

      setLoading(false);
    }

    fetchContactSettings();
  }, [siteSlug]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSending(true);
      setError("");
      setSuccess("");

      if (!name.trim() || !email.trim() || !message.trim()) {
        setError("Name, email, and message are required.");
        return;
      }

      const { error } = await supabase.from("contact_inquiries").insert({
        site_slug: siteSlug,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        subject: subject.trim(),
        message: message.trim(),
        status: "new",
      });

      if (error) throw error;

      setName("");
      setEmail("");
      setPhone("");
      setSubject("");
      setMessage("");
      setSuccess("Message sent. We’ll follow up soon.");
    } catch (error) {
      console.error("CONTACT FORM ERROR:", error);
      setError("Your message could not be sent right now.");
    } finally {
      setSending(false);
    }
  }

  if (!loading && settings.show_contact_section === false) return null;

  return (
    <section id="contact" className="relative py-24">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="mb-4 text-sm uppercase tracking-[0.35em] text-zinc-500">Contact</p>
            <h2 className="text-4xl font-bold md:text-6xl">{settings.contact_heading}</h2>
            <p className="mt-6 text-lg leading-relaxed text-zinc-400">{settings.contact_description}</p>
          </div>

          <form onSubmit={handleSubmit} className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            {error && <div className="mb-5 rounded-2xl border border-red-500 bg-red-500/10 p-4 text-red-300">{error}</div>}
            {success && <div className="mb-5 rounded-2xl border border-green-500 bg-green-500/10 p-4 text-green-300">{success}</div>}

            <div className="grid gap-5 md:grid-cols-2">
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40" />
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" type="email" className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40" />
              <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone" className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40" />
              <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40" />
            </div>

            <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Message" rows={7} className="mt-5 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40" />

            <button type="submit" disabled={sending} className="mt-6 rounded-full bg-white px-6 py-3 font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50">
              {sending ? "Sending..." : settings.contact_button_label}
            </button>
          </form>
        </div>
      </Container>
    </section>
  );
}
