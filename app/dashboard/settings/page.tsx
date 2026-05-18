"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const [settingsId, setSettingsId] = useState<number | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const [heroHeading, setHeroHeading] = useState("");
  const [heroDescription, setHeroDescription] =
    useState("");

  async function fetchSettings() {
    const { data } = await supabase
      .from("site_settings")
      .select("*")
      .limit(1);

    if (data && data.length > 0) {
      const settings = data[0];

      setSettingsId(settings.id);

      setBusinessName(settings.business_name || "");
      setPhone(settings.phone || "");
      setEmail(settings.email || "");
      setAddress(settings.address || "");

      setHeroHeading(settings.hero_heading || "");
      setHeroDescription(
        settings.hero_description || ""
      );
    }
  }

  useEffect(() => {
    fetchSettings();
  }, []);

  async function updateSettings() {
    if (!settingsId) return;

    const { error } = await supabase
      .from("site_settings")
      .update({
        business_name: businessName,
        phone,
        email,
        address,
        hero_heading: heroHeading,
        hero_description: heroDescription,
      })
      .eq("id", settingsId);

    console.log(error);

    alert("Settings updated!");
  }

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <h1 className="mb-10 text-5xl font-bold">
        Site Settings
      </h1>

      <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-8">
        <input
          placeholder="Business Name"
          value={businessName}
          onChange={(e) =>
            setBusinessName(e.target.value)
          }
          className="rounded-xl border border-white/10 bg-black px-4 py-3"
        />

        <input
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="rounded-xl border border-white/10 bg-black px-4 py-3"
        />

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border border-white/10 bg-black px-4 py-3"
        />

        <input
          placeholder="Address"
          value={address}
          onChange={(e) =>
            setAddress(e.target.value)
          }
          className="rounded-xl border border-white/10 bg-black px-4 py-3"
        />

        <input
          placeholder="Hero Heading"
          value={heroHeading}
          onChange={(e) =>
            setHeroHeading(e.target.value)
          }
          className="rounded-xl border border-white/10 bg-black px-4 py-3"
        />

        <textarea
          placeholder="Hero Description"
          value={heroDescription}
          onChange={(e) =>
            setHeroDescription(e.target.value)
          }
          className="rounded-xl border border-white/10 bg-black px-4 py-3"
        />

        <button
          onClick={updateSettings}
          className="rounded-full bg-white px-6 py-3 text-black"
        >
          Save Settings
        </button>
      </div>
    </main>
  );
}