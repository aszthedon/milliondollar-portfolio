"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Container from "@/components/Container";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getClientSiteSlug } from "@/lib/site/siteConfig";
import { supabase } from "@/lib/supabase";

type PolicySettings = {
  policies_title: string | null;
  policies_intro: string | null;
  booking_policy_title: string | null;
  booking_policy: string | null;
  deposit_policy_title: string | null;
  deposit_policy: string | null;
  cancellation_policy_title: string | null;
  cancellation_policy: string | null;
  late_policy_title: string | null;
  late_policy: string | null;
  no_show_policy_title: string | null;
  no_show_policy: string | null;
  refund_policy_title: string | null;
  refund_policy: string | null;
  reschedule_policy_title: string | null;
  reschedule_policy: string | null;
  preparation_policy_title: string | null;
  preparation_policy: string | null;
  extra_policy_title: string | null;
  extra_policy: string | null;
};

const fallback: PolicySettings = {
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
};

export default function PoliciesPage() {
  const siteSlug = getClientSiteSlug();
  const [settings, setSettings] = useState<PolicySettings>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPolicies() {
      const { data, error } = await supabase
        .from("site_settings")
        .select("policies_title,policies_intro,booking_policy_title,booking_policy,deposit_policy_title,deposit_policy,cancellation_policy_title,cancellation_policy,late_policy_title,late_policy,no_show_policy_title,no_show_policy,refund_policy_title,refund_policy,reschedule_policy_title,reschedule_policy,preparation_policy_title,preparation_policy,extra_policy_title,extra_policy")
        .eq("site_slug", siteSlug)
        .maybeSingle();

      if (error) {
        console.error("PUBLIC POLICIES ERROR:", error);
        setLoading(false);
        return;
      }

      if (data) {
        setSettings({
          policies_title: data.policies_title || fallback.policies_title,
          policies_intro: data.policies_intro || fallback.policies_intro,
          booking_policy_title: data.booking_policy_title || fallback.booking_policy_title,
          booking_policy: data.booking_policy || fallback.booking_policy,
          deposit_policy_title: data.deposit_policy_title || fallback.deposit_policy_title,
          deposit_policy: data.deposit_policy || fallback.deposit_policy,
          cancellation_policy_title: data.cancellation_policy_title || fallback.cancellation_policy_title,
          cancellation_policy: data.cancellation_policy || fallback.cancellation_policy,
          late_policy_title: data.late_policy_title || fallback.late_policy_title,
          late_policy: data.late_policy || fallback.late_policy,
          no_show_policy_title: data.no_show_policy_title || fallback.no_show_policy_title,
          no_show_policy: data.no_show_policy || fallback.no_show_policy,
          refund_policy_title: data.refund_policy_title || fallback.refund_policy_title,
          refund_policy: data.refund_policy || fallback.refund_policy,
          reschedule_policy_title: data.reschedule_policy_title || fallback.reschedule_policy_title,
          reschedule_policy: data.reschedule_policy || fallback.reschedule_policy,
          preparation_policy_title: data.preparation_policy_title || fallback.preparation_policy_title,
          preparation_policy: data.preparation_policy || fallback.preparation_policy,
          extra_policy_title: data.extra_policy_title || fallback.extra_policy_title,
          extra_policy: data.extra_policy || fallback.extra_policy,
        });
      }

      setLoading(false);
    }

    loadPolicies();
  }, [siteSlug]);

  const sections = useMemo(
    () => [
      [settings.booking_policy_title, settings.booking_policy],
      [settings.deposit_policy_title, settings.deposit_policy],
      [settings.cancellation_policy_title, settings.cancellation_policy],
      [settings.late_policy_title, settings.late_policy],
      [settings.no_show_policy_title, settings.no_show_policy],
      [settings.refund_policy_title, settings.refund_policy],
      [settings.reschedule_policy_title, settings.reschedule_policy],
      [settings.preparation_policy_title, settings.preparation_policy],
      [settings.extra_policy_title, settings.extra_policy],
    ].filter(([, body]) => Boolean(String(body ?? "").trim())),
    [settings]
  );

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <section className="pb-20 pt-32">
        <Container>
          <div className="mx-auto max-w-4xl">
            <Link href="/" className="text-sm text-zinc-400 transition hover:text-white">
              ← Back to Home
            </Link>

            <p className="mt-10 text-sm uppercase tracking-[0.35em] text-zinc-500">Policies</p>
            <h1 className="mt-4 text-5xl font-black md:text-7xl">
              {loading ? "Loading Policies" : settings.policies_title}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-zinc-400">
              {settings.policies_intro}
            </p>

            <div className="mt-12 grid gap-5">
              {sections.map(([title, body], index) => (
                <article key={`${String(title)}-${index}`} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <h2 className="text-2xl font-black">{title}</h2>
                  <p className="mt-3 whitespace-pre-line leading-relaxed text-zinc-300">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </Container>
      </section>
      <Footer />
    </main>
  );
}
