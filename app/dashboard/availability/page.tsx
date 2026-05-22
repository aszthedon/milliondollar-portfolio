"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

interface Availability {
  id: number;
  available_date: string;
  available_time: string;
  timezone: string;
}

export default function AvailabilityPage() {
  const [date, setDate] =
    useState("");

  const [time, setTime] =
    useState("");

  const [availability, setAvailability] =
    useState<Availability[]>([]);

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

  async function createAvailability() {
    if (!date || !time) {
      alert(
        "Please select a date and time."
      );

      return;
    }

    const timezone =
      Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone;

    const { error } =
      await supabase
        .from("availability")
        .insert({
          available_date: date,

          available_time: time,

          timezone,
        });

    if (error) {
      alert(error.message);

      return;
    }

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

  function formatTime(
    time: string
  ) {
    const date =
      new Date(
        `1970-01-01T${time}`
      );

    return date.toLocaleTimeString(
      [],
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );
  }

  useEffect(() => {
    fetchAvailability();
  }, []);

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <div className="mb-12">
        <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
          Admin Dashboard
        </p>

        <h1 className="text-5xl font-bold">
          Availability
        </h1>
      </div>

      <div className="mb-10 grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-8 md:grid-cols-4">
        <input
          type="date"
          value={date}
          onChange={(e) =>
            setDate(
              e.target.value
            )
          }
          className="rounded-xl border border-white/10 bg-black px-4 py-3"
        />

        <input
          type="time"
          value={time}
          onChange={(e) =>
            setTime(
              e.target.value
            )
          }
          className="rounded-xl border border-white/10 bg-black px-4 py-3"
        />

        <div className="flex items-center rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-zinc-400">
          {
            Intl.DateTimeFormat()
              .resolvedOptions()
              .timeZone
          }
        </div>

        <button
          onClick={
            createAvailability
          }
          className="rounded-xl bg-white px-6 py-3 text-black"
        >
          Add Availability
        </button>
      </div>

      <div className="grid gap-4">
        {availability.map((slot) => (
          <div
            key={slot.id}
            className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <h2 className="text-2xl font-semibold">
                {
                  slot.available_date
                }
              </h2>

              <p className="mt-2 text-zinc-400">
                {formatTime(
                  slot.available_time
                )}
              </p>

              <p className="mt-2 text-sm text-zinc-500">
                {slot.timezone}
              </p>
            </div>

            <button
              onClick={() =>
                deleteAvailability(
                  slot.id
                )
              }
              className="rounded-full border border-red-500 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500 hover:text-white"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}