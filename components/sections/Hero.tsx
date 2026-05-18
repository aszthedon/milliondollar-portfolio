"use client";

import { useEffect, useState } from "react";

import Container from "../Container";
import Button from "../ui/Button";

import { supabase } from "@/lib/supabase";

export default function Hero() {
  const [businessName, setBusinessName] =
    useState("Loading business...");

  const [heroHeading, setHeroHeading] =
    useState("Loading heading...");

  const [heroDescription, setHeroDescription] =
    useState("Loading description...");

  async function fetchSettings() {
    const { data, error } = await supabase
      .from("site_settings")
      .select("*");

    console.log("SITE SETTINGS OBJECT:", data[0]);
    console.log("SITE SETTINGS ERROR:", error);

    if (error) {
      return;
    }

    if (data && data.length > 0) {
      const settings = data[0];

      setBusinessName(
        settings.business_name || ""
      );

      setHeroHeading(
        settings.hero_heading || ""
      );

      setHeroDescription(
        settings.hero_description || ""
      );
    }
  }

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <section
      id="home"
      className="relative flex min-h-screen items-center overflow-hidden bg-black text-white"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_40%)]" />

      <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />

      <div className="absolute right-0 top-0 h-[300px] w-[300px] rounded-full bg-purple-500/20 blur-3xl" />

      <Container>
        <div className="relative z-10 max-w-4xl py-40">
          <p className="mb-6 text-sm uppercase tracking-[0.4em] text-zinc-400">
            {businessName}
          </p>

          <h1 className="text-5xl font-bold leading-tight md:text-7xl">
            {heroHeading}
          </h1>

          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-zinc-300">
            {heroDescription}
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Button variant="primary">
              View Services
            </Button>

            <Button variant="secondary">
              Start A Project
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}