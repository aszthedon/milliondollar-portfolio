"use client";

import {
  useEffect,
  useState,
} from "react";

import Container from "@/components/Container";
import { supabase } from "@/lib/supabase";

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  sort_order: number;
  is_visible: boolean;
}

export default function FAQ() {
  const [faqs, setFaqs] =
    useState<FAQItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [openId, setOpenId] =
    useState<number | null>(null);

  useEffect(() => {
    async function fetchFaqs() {
      const { data, error } =
        await supabase
          .from("faq_items")
          .select(
            `
              id,
              question,
              answer,
              sort_order,
              is_visible
            `
          )
          .eq("is_visible", true)
          .order("sort_order", {
            ascending: true,
          })
          .order("created_at", {
            ascending: true,
          });

      if (error) {
        console.error(
          "PUBLIC FAQ ERROR:",
          error
        );

        setLoading(false);
        return;
      }

      setFaqs(
        (data ?? []) as FAQItem[]
      );

      if (data && data.length > 0) {
        setOpenId(data[0].id);
      }

      setLoading(false);
    }

    fetchFaqs();
  }, []);

  if (!loading && faqs.length === 0) {
    return null;
  }

  return (
    <section
      id="faqs"
      className="relative py-24"
    >
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm uppercase tracking-[0.35em] text-zinc-500">
            FAQs
          </p>

          <h2 className="text-4xl font-bold md:text-6xl">
            Frequently Asked Questions
          </h2>

          <p className="mt-6 text-lg leading-relaxed text-zinc-400">
            Find quick answers before booking. These questions can be managed
            directly from the admin dashboard.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-4">
          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-zinc-500">
              Loading FAQs...
            </div>
          ) : (
            faqs.map((faq) => {
              const isOpen =
                openId === faq.id;

              return (
                <div
                  key={faq.id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-white/5"
                >
                  <button
                    onClick={() =>
                      setOpenId(
                        isOpen
                          ? null
                          : faq.id
                      )
                    }
                    className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left transition hover:bg-white/5 md:px-8"
                  >
                    <span className="text-xl font-semibold text-white">
                      {faq.question}
                    </span>

                    <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-sm text-zinc-400">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-white/10 px-6 py-5 md:px-8">
                      <p className="whitespace-pre-line leading-relaxed text-zinc-400">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Container>
    </section>
  );
}