"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

interface Booking {
  id: number;
  service_id: number;
  booking_date: string;
  booking_time: string;
  notes: string;
  status: string;
}

interface Service {
  id: number;
  title: string;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<
    Booking[]
  >([]);

  const [services, setServices] = useState<
    Service[]
  >([]);

  async function fetchBookings() {
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .order("id", { ascending: false });

    if (data) {
      setBookings(data);
    }
  }

  async function fetchServices() {
    const { data } = await supabase
      .from("services")
      .select("*");

    if (data) {
      setServices(data);
    }
  }

  useEffect(() => {
    fetchBookings();
    fetchServices();
  }, []);

  function getServiceName(id: number) {
    const service = services.find(
      (service) => service.id === id
    );

    return service?.title || "Unknown Service";
  }

  async function updateStatus(
    id: number,
    status: string
  ) {
    await supabase
      .from("bookings")
      .update({
        status,
      })
      .eq("id", id);

    fetchBookings();
  }

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <h1 className="mb-10 text-5xl font-bold">
        Booking Requests
      </h1>

      <div className="grid gap-6">
        {bookings.map((booking) => (
          <div
            key={booking.id}
            className="rounded-3xl border border-white/10 bg-white/5 p-8"
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="mb-2 text-sm uppercase tracking-[0.2em] text-zinc-500">
                  {getServiceName(
                    booking.service_id
                  )}
                </p>

                <h2 className="text-3xl font-semibold">
                  {booking.booking_date}
                </h2>

                <p className="mt-2 text-zinc-400">
                  {booking.booking_time}
                </p>

                <p className="mt-6 whitespace-pre-wrap text-zinc-300">
                  {booking.notes}
                </p>

                <div className="mt-6">
                  <span className="rounded-full border border-white/10 px-4 py-2 text-sm">
                    {booking.status}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() =>
                    updateStatus(
                      booking.id,
                      "approved"
                    )
                  }
                  className="rounded-full bg-green-500 px-5 py-3 text-black"
                >
                  Approve
                </button>

                <button
                  onClick={() =>
                    updateStatus(
                      booking.id,
                      "rejected"
                    )
                  }
                  className="rounded-full bg-red-500 px-5 py-3 text-white"
                >
                  Reject
                </button>

                <button
                  onClick={() =>
                    updateStatus(
                      booking.id,
                      "pending"
                    )
                  }
                  className="rounded-full bg-yellow-500 px-5 py-3 text-black"
                >
                  Pending
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}