"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

interface Availability {
  id: number;
  available_date: string;
  available_time: string;
}

export default function AvailabilityPage() {
  const [availability, setAvailability] =
    useState<Availability[]>([]);

  const [date, setDate] = useState("");

  const [time, setTime] = useState("");

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
    fetchAvailability();
  }, []);

  async function createAvailability() {
    await supabase
      .from("availability")
      .insert({
        available_date: date,
        available_time: time,
      });

    setDate("");
    setTime("");

    fetchAvailability();
  }

  async function deleteAvailability(
    id: number
  ) {
    await supabase
      .from("availability")
      .delete()
      .eq("id", id);

    fetchAvailability();
  }

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <h1 className="mb-10 text-5xl font-bold">
        Availability
      </h1>

      <div className="mb-12 grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-8">
        <input
          type="date"
          value={date}
          onChange={(e) =>
            setDate(e.target.value)
          }
          className="rounded-xl border border-white/10 bg-black px-4 py-3"
        />

        <input
          type="time"
          value={time}
          onChange={(e) =>
            setTime(e.target.value)
          }
          className="rounded-xl border border-white/10 bg-black px-4 py-3"
        />

        <button
          onClick={createAvailability}
          className="rounded-full bg-white px-6 py-3 text-black"
        >
          Add Availability
        </button>
      </div>

      <div className="grid gap-6">
        {availability.map((slot) => (
          <div
            key={slot.id}
            className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 p-8"
          >
            <div>
              <h2 className="text-2xl font-semibold">
                {slot.available_date}
              </h2>

              <p className="mt-2 text-zinc-400">
                {slot.available_time}
              </p>
            </div>

            <button
              onClick={() =>
                deleteAvailability(slot.id)
              }
              className="rounded-full border border-red-500 px-5 py-3 text-red-500"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}