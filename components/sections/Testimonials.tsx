"use client";

import {
  useEffect,
  useState,
} from "react";

import Container from "@/components/Container";
import { supabase } from "@/lib/supabase";

interface TestimonialItem {
  id: number;
  client_name: string;
  client_title: string | null;
  quote: string;
  rating: number | null;
  sort_order: number;
  is_visible: boolean;
}

export default function Testimonials() {
  const [
    testimonials,
    setTestimonials,
  ] = useState<TestimonialItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function fetchTestimonials() {
      const { data, error } =
        await supabase
          .from("testimonial_items")
          .select(
            `
              id,
              client_name,
              client_title,
              quote,
              rating,
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
          "PUBLIC TESTIMONIAL ERROR:",
          error
        );

        setLoading(false);
        return;
      }

      setTestimonials(
        (data ?? []) as TestimonialItem[]
      );

      setLoading(false);
    }

    fetchTestimonials();
  }, []);

  function renderStars(
    rating: number | null
  ) {
    const count =
      rating ?? 5;

    return "★".repeat(count);
  }

  if (
    !loading &&
    testimonials.length === 0
  ) {
    return null;
  }

  return (
    <section
      id="testimonials"
      className="relative py-24"
    >
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm uppercase tracking-[0.35em] text-zinc-500">
            Testimonials
          </p>

          <h2 className="text-4xl font-bold md:text-6xl">
            What Clients Are Saying
          </h2>

          <p className="mt-6 text-lg leading-relaxed text-zinc-400">
            Real client feedback can be managed directly from the dashboard and
            displayed on the public website.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-500 md:col-span-2 xl:col-span-3">
              Loading testimonials...
            </div>
          ) : (
            testimonials.map(
              (testimonial) => (
                <div
                  key={testimonial.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-8"
                >
                  <p className="text-yellow-400">
                    {renderStars(
                      testimonial.rating
                    )}
                  </p>

                  <p className="mt-6 text-lg leading-relaxed text-zinc-300">
                    “{testimonial.quote}”
                  </p>

                  <div className="mt-8 border-t border-white/10 pt-6">
                    <h3 className="text-xl font-semibold text-white">
                      {testimonial.client_name}
                    </h3>

                    {testimonial.client_title && (
                      <p className="mt-1 text-sm text-zinc-500">
                        {testimonial.client_title}
                      </p>
                    )}
                  </div>
                </div>
              )
            )
          )}
        </div>
      </Container>
    </section>
  );
}