"use client";

import { useEffect, useState } from "react";

import dynamic from "next/dynamic";

import Container from "../Container";
import FadeIn from "../FadeIn";

import { supabase } from "@/lib/supabase";

const Calendar = dynamic(
  () => import("react-calendar"),
  {
    ssr: false,
  }
);

interface Service {
  id: number;
  title: string;
}

interface Variation {
  id: number;
  variation_name: string;
  service_id: number;
  price: number;
}

interface Availability {
  id: number;
  available_date: string;
  available_time: string;
}

export default function Booking() {
  const [services, setServices] = useState<
    Service[]
  >([]);

  const [variations, setVariations] =
    useState<Variation[]>([]);

  const [availability, setAvailability] =
    useState<Availability[]>([]);

  const [selectedService, setSelectedService] =
    useState("");

  const [selectedVariation, setSelectedVariation] =
    useState("");

  const [bookingDate, setBookingDate] =
    useState<Date | null>(null);

  const [bookingTime, setBookingTime] =
    useState("");

  const [customerEmail, setCustomerEmail] =
    useState("");

  const [notes, setNotes] = useState("");

  async function fetchServices() {
    const { data } = await supabase
      .from("services")
      .select("*");

    if (data) {
      setServices(data);
    }
  }

  async function fetchVariations() {
    const { data } = await supabase
      .from("service_variations")
      .select("*");

    if (data) {
      setVariations(data);
    }
  }

  async function fetchAvailability() {
    const { data } = await supabase
      .from("availability")
      .select("*")
      .order("available_date", {
        ascending: true,
      });

    if (data) {
      setAvailability(data);
    }
  }

  useEffect(() => {
    fetchServices();
    fetchVariations();
    fetchAvailability();
  }, []);

  const filteredVariations =
    variations.filter(
      (variation) =>
        variation.service_id ===
        Number(selectedService)
    );

  const selectedVariationData =
    variations.find(
      (variation) =>
        variation.id ===
        Number(selectedVariation)
    );

  const availableDates = [
    ...new Set(
      availability.map(
        (slot) => slot.available_date
      )
    ),
  ];

  const formattedBookingDate =
    bookingDate
      ? bookingDate
          .toISOString()
          .split("T")[0]
      : "";

  const availableTimes = availability.filter(
    (slot) =>
      slot.available_date ===
      formattedBookingDate
  );

  async function startCheckout(
    bookingId: number
  ) {
    if (!selectedVariationData) {
      alert("Please select a variation.");
      return;
    }

    console.log(
      "STARTING CHECKOUT"
    );

    const response = await fetch(
      "/api/checkout",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          bookingId,

          serviceName:
            selectedVariationData.variation_name,

          amount:
            selectedVariationData.price,
        }),
      }
    );

    console.log(
      "RESPONSE STATUS:",
      response.status
    );

    const data = await response.json();

    console.log(
      "CHECKOUT RESPONSE:",
      data
    );

    if (data.url) {
      console.log(
        "REDIRECTING TO:",
        data.url
      );

      window.location.href = data.url;
    } else {
      console.log(
        "NO URL RETURNED"
      );
    }
  }

  async function submitBooking() {
    if (
      !selectedService ||
      !selectedVariation ||
      !bookingDate ||
      !bookingTime ||
      !customerEmail
    ) {
      alert("Please complete all fields.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const {
      data: bookingData,
      error,
    } = await supabase
      .from("bookings")
      .insert({
        client_id: user?.id || null,

        customer_email:
          customerEmail,

        service_id:
          Number(selectedService),

        booking_date:
          formattedBookingDate,

        booking_time: bookingTime,

        notes: `
Variation ID: ${selectedVariation}

${notes}
        `,
      })
      .select()
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    await supabase
      .from("availability")
      .delete()
      .eq(
        "available_date",
        formattedBookingDate
      )
      .eq("available_time", bookingTime);

    alert("Booking request submitted!");

    fetchAvailability();

    setSelectedService("");
    setSelectedVariation("");
    setBookingDate(null);
    setBookingTime("");
    setCustomerEmail("");
    setNotes("");

    return bookingData;
  }

  return (
    <FadeIn>
      <section
        id="booking"
        className="bg-black py-32 text-white"
      >
        <Container>
          <div className="mb-16 max-w-2xl">
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
              Booking
            </p>

            <h2 className="text-4xl font-bold md:text-5xl">
              Request A Booking
            </h2>
          </div>

          <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-8">
            <select
              value={selectedService}
              onChange={(e) =>
                setSelectedService(
                  e.target.value
                )
              }
              className="rounded-xl border border-white/10 bg-black px-4 py-3"
            >
              <option value="">
                Select Service
              </option>

              {services.map((service) => (
                <option
                  key={service.id}
                  value={service.id}
                >
                  {service.title}
                </option>
              ))}
            </select>

            <select
              value={selectedVariation}
              onChange={(e) =>
                setSelectedVariation(
                  e.target.value
                )
              }
              className="rounded-xl border border-white/10 bg-black px-4 py-3"
            >
              <option value="">
                Select Variation
              </option>

              {filteredVariations.map(
                (variation) => (
                  <option
                    key={variation.id}
                    value={variation.id}
                  >
                    {variation.variation_name}
                    {" — $"}
                    {variation.price}
                  </option>
                )
              )}
            </select>

            <div className="rounded-3xl border border-white/10 bg-black p-4">
              <Calendar
                onChange={(value) =>
                  setBookingDate(value as Date)
                }
                value={bookingDate}
                tileDisabled={({ date }) => {
                  const formatted =
                    date
                      .toISOString()
                      .split("T")[0];

                  return !availableDates.includes(
                    formatted
                  );
                }}
              />
            </div>

            <select
              value={bookingTime}
              onChange={(e) =>
                setBookingTime(e.target.value)
              }
              className="rounded-xl border border-white/10 bg-black px-4 py-3"
            >
              <option value="">
                Select Time
              </option>

              {availableTimes.map((slot) => (
                <option
                  key={slot.id}
                  value={slot.available_time}
                >
                  {slot.available_time}
                </option>
              ))}
            </select>

            <input
              type="email"
              placeholder="Email Address"
              value={customerEmail}
              onChange={(e) =>
                setCustomerEmail(
                  e.target.value
                )
              }
              className="rounded-xl border border-white/10 bg-black px-4 py-3"
            />

            <textarea
              placeholder="Additional Notes"
              value={notes}
              onChange={(e) =>
                setNotes(e.target.value)
              }
              className="rounded-xl border border-white/10 bg-black px-4 py-3"
            />

            <button
              onClick={async () => {
                const booking =
                  await submitBooking();

                if (booking) {
                  await startCheckout(
                    booking.id
                  );
                }
              }}
              className="rounded-full bg-white px-6 py-3 text-black"
            >
              Continue To Payment
            </button>
          </div>
        </Container>
      </section>
    </FadeIn>
  );
}