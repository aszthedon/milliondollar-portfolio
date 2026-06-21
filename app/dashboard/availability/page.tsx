"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import { supabase } from "@/lib/supabase";

interface Availability {
  id: number;
  available_date: string;
  available_time: string | null;
  start_time: string | null;
  end_time: string | null;
  timezone: string | null;
}

interface NewWindow {
  available_date: string;
  available_time: string;
  start_time: string;
  end_time: string;
  timezone: string;
}

const weekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function AvailabilityPage() {
  const [date, setDate] =
    useState("");

  const [startTime, setStartTime] =
    useState("");

  const [endTime, setEndTime] =
    useState("");

  const [availability, setAvailability] =
    useState<Availability[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [bulkStartDate, setBulkStartDate] =
    useState("");

  const [bulkEndDate, setBulkEndDate] =
    useState("");

  const [
    bulkStartTime,
    setBulkStartTime,
  ] = useState("");

  const [
    bulkEndTime,
    setBulkEndTime,
  ] = useState("");

  const [
    selectedDays,
    setSelectedDays,
  ] = useState<number[]>([
    1,
    2,
    3,
    4,
    5,
  ]);

  const [dateFilter, setDateFilter] =
    useState("");

  const totalWindows =
    availability.length;

  const upcomingWindows =
    useMemo(() => {
      const today =
        getTodayDateString();

      return availability.filter(
        (row) =>
          row.available_date >= today
      ).length;
    }, [availability]);

  const filteredAvailability =
    useMemo(() => {
      if (!dateFilter) {
        return availability;
      }

      return availability.filter(
        (row) =>
          row.available_date ===
          dateFilter
      );
    }, [
      availability,
      dateFilter,
    ]);

  async function fetchAvailability() {
    try {
      setError("");

      const { data, error } =
        await supabase
          .from("availability")
          .select(
            "id, available_date, available_time, start_time, end_time, timezone"
          )
          .order("available_date", {
            ascending: true,
          })
          .order("start_time", {
            ascending: true,
          });

      if (error) {
        throw error;
      }

      setAvailability(
        (data ?? []) as Availability[]
      );
    } catch (error) {
      console.error(
        "AVAILABILITY FETCH ERROR:",
        error
      );

      setError(
        "Availability could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAvailability();
  }, []);

  function getTodayDateString() {
    const today =
      new Date();

    const year =
      today.getFullYear();

    const month =
      String(
        today.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        today.getDate()
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function timeToMinutes(
    time: string
  ) {
    const [
      hourString,
      minuteString,
    ] = time.split(":");

    return (
      Number(hourString) * 60 +
      Number(minuteString)
    );
  }

  function isEndAfterStart(
    start: string,
    end: string
  ) {
    return (
      timeToMinutes(end) >
      timeToMinutes(start)
    );
  }

  function formatDate(
    value: string
  ) {
    const parts =
      value.split("-");

    if (parts.length !== 3) {
      return value;
    }

    const [year, month, day] =
      parts;

    return `${month}/${day}/${year}`;
  }

  function formatTime(
    value: string | null
  ) {
    if (!value) {
      return "Not set";
    }

    const [
      hourString,
      minuteString,
    ] = value.split(":");

    const hour =
      Number(hourString);

    const minute =
      Number(
        minuteString ?? "0"
      );

    if (
      Number.isNaN(hour) ||
      Number.isNaN(minute)
    ) {
      return value;
    }

    const suffix =
      hour >= 12
        ? "PM"
        : "AM";

    const displayHour =
      hour % 12 || 12;

    return `${displayHour}:${String(
      minute
    ).padStart(2, "0")} ${suffix}`;
  }

  function getDateFromString(
    value: string
  ) {
    const [year, month, day] =
      value
        .split("-")
        .map(Number);

    return new Date(
      year,
      month - 1,
      day
    );
  }

  function getDateString(
    value: Date
  ) {
    const year =
      value.getFullYear();

    const month =
      String(
        value.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        value.getDate()
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function windowKey(
    row: {
      available_date: string;
      start_time: string | null;
      end_time: string | null;
    }
  ) {
    return `${row.available_date}_${row.start_time}_${row.end_time}`;
  }

  function toggleDay(
    index: number
  ) {
    setSelectedDays((prev) =>
      prev.includes(index)
        ? prev.filter(
            (day) =>
              day !== index
          )
        : [
            ...prev,
            index,
          ]
    );
  }

  function generateBulkWindows() {
    const timezone =
      Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone;

    const windows: NewWindow[] = [];

    const start =
      getDateFromString(
        bulkStartDate
      );

    const end =
      getDateFromString(
        bulkEndDate
      );

    for (
      let day =
        new Date(start);
      day <= end;
      day.setDate(
        day.getDate() + 1
      )
    ) {
      if (
        !selectedDays.includes(
          day.getDay()
        )
      ) {
        continue;
      }

      const availableDate =
        getDateString(day);

      windows.push({
        available_date:
          availableDate,

        available_time:
          bulkStartTime,

        start_time:
          bulkStartTime,

        end_time:
          bulkEndTime,

        timezone,
      });
    }

    return windows;
  }

  async function createAvailability() {
    if (
      !date ||
      !startTime ||
      !endTime
    ) {
      alert(
        "Please complete all fields."
      );

      return;
    }

    if (
      !isEndAfterStart(
        startTime,
        endTime
      )
    ) {
      alert(
        "End time must be after start time."
      );

      return;
    }

    const duplicate =
      availability.some(
        (row) =>
          row.available_date ===
            date &&
          row.start_time ===
            startTime &&
          row.end_time ===
            endTime
      );

    if (duplicate) {
      alert(
        "This availability window already exists."
      );

      return;
    }

    try {
      setSaving(true);
      setError("");

      const timezone =
        Intl.DateTimeFormat()
          .resolvedOptions()
          .timeZone;

      const { error } =
        await supabase
          .from("availability")
          .insert({
            available_date:
              date,

            available_time:
              startTime,

            start_time:
              startTime,

            end_time:
              endTime,

            timezone,
          });

      if (error) {
        throw error;
      }

      setDate("");
      setStartTime("");
      setEndTime("");

      await fetchAvailability();
    } catch (error) {
      console.error(
        "CREATE AVAILABILITY ERROR:",
        error
      );

      alert(
        "Creation failed."
      );
    } finally {
      setSaving(false);
    }
  }

  async function createBulkAvailability() {
    if (
      !bulkStartDate ||
      !bulkEndDate ||
      !bulkStartTime ||
      !bulkEndTime
    ) {
      alert(
        "Complete all recurring fields."
      );

      return;
    }

    if (
      selectedDays.length === 0
    ) {
      alert(
        "Select at least one weekday."
      );

      return;
    }

    if (
      bulkEndDate <
      bulkStartDate
    ) {
      alert(
        "End date must be after start date."
      );

      return;
    }

    if (
      !isEndAfterStart(
        bulkStartTime,
        bulkEndTime
      )
    ) {
      alert(
        "End time must be after start time."
      );

      return;
    }

    try {
      setSaving(true);
      setError("");

      const windows =
        generateBulkWindows();

      if (
        windows.length === 0
      ) {
        alert(
          "No windows generated."
        );

        return;
      }

      const existingKeys =
        new Set(
          availability.map(
            (row) =>
              windowKey(row)
          )
        );

      const cleanWindows =
        windows.filter(
          (row) =>
            !existingKeys.has(
              windowKey(row)
            )
        );

      if (
        cleanWindows.length ===
        0
      ) {
        alert(
          "All generated windows already exist."
        );

        return;
      }

      const { error } =
        await supabase
          .from("availability")
          .insert(
            cleanWindows
          );

      if (error) {
        throw error;
      }

      await fetchAvailability();

      alert(
        `${cleanWindows.length} availability windows created.`
      );
    } catch (error) {
      console.error(
        "BULK AVAILABILITY ERROR:",
        error
      );

      alert(
        "Bulk generation failed."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteAvailability(
    id: number
  ) {
    const confirmed =
      window.confirm(
        "Delete this availability window?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);

      const { error } =
        await supabase
          .from("availability")
          .delete()
          .eq(
            "id",
            id
          );

      if (error) {
        throw error;
      }

      await fetchAvailability();
    } catch (error) {
      console.error(
        "DELETE AVAILABILITY ERROR:",
        error
      );

      alert(
        "Delete failed."
      );
    } finally {
      setSaving(false);
    }
  }

  async function clearPastAvailability() {
    const confirmed =
      window.confirm(
        "Delete all availability windows before today?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);

      const { error } =
        await supabase
          .from("availability")
          .delete()
          .lt(
            "available_date",
            getTodayDateString()
          );

      if (error) {
        throw error;
      }

      await fetchAvailability();
    } catch (error) {
      console.error(
        "CLEAR PAST AVAILABILITY ERROR:",
        error
      );

      alert(
        "Past availability could not be cleared."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            Loading
          </p>

          <h1 className="mt-4 text-3xl font-bold">
            Loading Availability...
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
            Admin Dashboard
          </p>

          <h1 className="text-5xl font-bold">
            Availability Windows
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            Create one-time or recurring availability windows
            that clients can use when requesting bookings.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-full border border-white/10 px-5 py-3 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
          >
            Back To Dashboard
          </Link>

          <button
            onClick={fetchAvailability}
            disabled={saving}
            className="rounded-full bg-white px-5 py-3 text-sm text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-8 rounded-3xl border border-red-500 bg-red-500/10 p-6 text-red-300">
          {error}
        </div>
      )}

      <section className="mb-10 grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Total Windows
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {totalWindows}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Upcoming
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {upcomingWindows}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Selected Days
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {selectedDays.length}
          </h2>
        </div>
      </section>

      <section className="mb-10 rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            Single Window
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Add One Availability Window
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <input
            type="date"
            value={date}
            onChange={(e) =>
              setDate(
                e.target.value
              )
            }
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          />

          <input
            type="time"
            value={startTime}
            onChange={(e) =>
              setStartTime(
                e.target.value
              )
            }
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          />

          <input
            type="time"
            value={endTime}
            onChange={(e) =>
              setEndTime(
                e.target.value
              )
            }
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          />

          <button
            disabled={saving}
            onClick={createAvailability}
            className="rounded-xl bg-white px-6 py-3 text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : "Add Window"}
          </button>
        </div>
      </section>

      <section className="mb-10 rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            Recurring Windows
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Generate Multiple Availability Windows
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <input
            type="date"
            value={bulkStartDate}
            onChange={(e) =>
              setBulkStartDate(
                e.target.value
              )
            }
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          />

          <input
            type="date"
            value={bulkEndDate}
            onChange={(e) =>
              setBulkEndDate(
                e.target.value
              )
            }
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          />

          <input
            type="time"
            value={bulkStartTime}
            onChange={(e) =>
              setBulkStartTime(
                e.target.value
              )
            }
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          />

          <input
            type="time"
            value={bulkEndTime}
            onChange={(e) =>
              setBulkEndTime(
                e.target.value
              )
            }
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {weekdays.map(
            (day, index) => (
              <button
                key={day}
                type="button"
                onClick={() =>
                  toggleDay(index)
                }
                className={`rounded-full px-4 py-2 text-sm transition ${
                  selectedDays.includes(
                    index
                  )
                    ? "bg-white text-black"
                    : "border border-white/10 text-zinc-300 hover:bg-white/10"
                }`}
              >
                {day}
              </button>
            )
          )}
        </div>

        <button
          disabled={saving}
          onClick={createBulkAvailability}
          className="mt-8 rounded-xl bg-green-500 px-6 py-3 text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? "Generating..."
            : "Generate Windows"}
        </button>
      </section>

      <section className="mb-10 rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) =>
              setDateFilter(
                e.target.value
              )
            }
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          />

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() =>
                setDateFilter("")
              }
              className="rounded-full border border-white/10 px-5 py-3 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
            >
              Clear Filter
            </button>

            <button
              onClick={clearPastAvailability}
              disabled={saving}
              className="rounded-full border border-red-500 px-5 py-3 text-sm text-red-400 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear Past
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        {filteredAvailability.map(
          (row) => (
            <div
              key={row.id}
              className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/5 p-6 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold">
                    {formatDate(
                      row.available_date
                    )}
                  </h2>

                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.15em] text-zinc-400">
                    Window #{row.id}
                  </span>
                </div>

                <p className="mt-2 text-zinc-400">
                  {formatTime(
                    row.start_time ??
                      row.available_time
                  )}
                  {" — "}
                  {formatTime(
                    row.end_time
                  )}
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  {row.timezone ??
                    "No timezone saved"}
                </p>
              </div>

              <button
                disabled={saving}
                onClick={() =>
                  deleteAvailability(
                    row.id
                  )
                }
                className="rounded-full border border-red-500 px-5 py-2 text-sm text-red-400 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          )
        )}

        {filteredAvailability.length ===
          0 && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
            <p className="text-zinc-400">
              No availability windows found.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}