"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

interface Availability {
  id: number;
  available_date: string;
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
    useState(false);

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
    1,2,3,4,5,
  ]);

  async function fetchAvailability() {

    const { data } =
      await supabase
        .from(
          "availability"
        )
        .select("*")
        .order(
          "available_date",
          {
            ascending:
              true,
          }
        );

    if (data) {
      setAvailability(
        data
      );
    }
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

    try {

      setLoading(
        true
      );

      const timezone =
        Intl.DateTimeFormat()
          .resolvedOptions()
          .timeZone;

      const { error } =
        await supabase
          .from(
            "availability"
          )
          .insert({
            available_date:
              date,

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

    } catch (
      error
    ) {

      console.error(
        error
      );

      alert(
        "Creation failed."
      );
    }

    setLoading(
      false
    );
  }

  async function createBulkAvailability() {

    if (
      !bulkStartDate ||
      !bulkEndDate ||
      !bulkStartTime ||
      !bulkEndTime
    ) {

      alert(
        "Complete all bulk fields."
      );

      return;
    }

    try {

      setLoading(
        true
      );

      const timezone =
        Intl.DateTimeFormat()
          .resolvedOptions()
          .timeZone;

      const windows = [];

      const start =
        new Date(
          bulkStartDate
        );

      const end =
        new Date(
          bulkEndDate
        );

      for (
        let day =
          new Date(
            start
          );

        day <= end;

        day.setDate(
          day.getDate() +
            1
        )
      ) {

        if (
          !selectedDays.includes(
            day.getDay()
          )
        ) {
          continue;
        }

        windows.push({

          available_date:
            day
              .toISOString()
              .split(
                "T"
              )[0],

          start_time:
            bulkStartTime,

          end_time:
            bulkEndTime,

          timezone,
        });
      }

      if (
        windows.length ===
        0
      ) {

        alert(
          "No windows generated."
        );

        setLoading(
          false
        );

        return;
      }

      const {
        data:
          existingAvailability,
      } =
        await supabase
          .from(
            "availability"
          )
          .select(
            "available_date,start_time,end_time"
          );

      const blockedSet =
        new Set(
          (
            existingAvailability ??
            []
          ).map(
            (
              row
            ) =>
              `${row.available_date}_${row.start_time}_${row.end_time}`
          )
        );

      const cleanWindows =
        windows.filter(
          (
            row
          ) =>
            !blockedSet.has(
              `${row.available_date}_${row.start_time}_${row.end_time}`
            )
        );

      if (
        cleanWindows.length ===
        0
      ) {

        alert(
          "All windows already exist."
        );

        setLoading(
          false
        );

        return;
      }

      const { error } =
        await supabase
          .from(
            "availability"
          )
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

    } catch (
      error
    ) {

      console.error(
        error
      );

      alert(
        "Bulk generation failed."
      );
    }

    setLoading(
      false
    );
  }

  async function deleteAvailability(
    id: number
  ) {

    await supabase
      .from(
        "availability"
      )
      .delete()
      .eq(
        "id",
        id
      );

    fetchAvailability();
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
          Availability Windows
        </h1>

      </div>

      <div className="mb-10 grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-8 md:grid-cols-4">

        <input
          type="date"
          value={date}
          onChange={(e)=>
            setDate(
              e.target.value
            )
          }
          className="rounded-xl border border-white/10 bg-black px-4 py-3"
        />

        <input
          type="time"
          value={startTime}
          onChange={(e)=>
            setStartTime(
              e.target.value
            )
          }
          className="rounded-xl border border-white/10 bg-black px-4 py-3"
        />

        <input
          type="time"
          value={endTime}
          onChange={(e)=>
            setEndTime(
              e.target.value
            )
          }
          className="rounded-xl border border-white/10 bg-black px-4 py-3"
        />

        <button
          disabled={
            loading
          }
          onClick={
            createAvailability
          }
          className="rounded-xl bg-white px-6 py-3 text-black disabled:opacity-50"
        >
          {
            loading
              ? "Adding..."
              : "Add Window"
          }
        </button>

      </div>

      <div className="mb-10 rounded-3xl border border-white/10 bg-white/5 p-8">

        <h2 className="mb-6 text-2xl font-bold">
          Recurring Windows
        </h2>

        <div className="grid gap-4 md:grid-cols-4">

          <input
            type="date"
            value={
              bulkStartDate
            }
            onChange={(e)=>
              setBulkStartDate(
                e.target.value
              )
            }
            className="rounded-xl border border-white/10 bg-black px-4 py-3"
          />

          <input
            type="date"
            value={
              bulkEndDate
            }
            onChange={(e)=>
              setBulkEndDate(
                e.target.value
              )
            }
            className="rounded-xl border border-white/10 bg-black px-4 py-3"
          />

          <input
            type="time"
            value={
              bulkStartTime
            }
            onChange={(e)=>
              setBulkStartTime(
                e.target.value
              )
            }
            className="rounded-xl border border-white/10 bg-black px-4 py-3"
          />

          <input
            type="time"
            value={
              bulkEndTime
            }
            onChange={(e)=>
              setBulkEndTime(
                e.target.value
              )
            }
            className="rounded-xl border border-white/10 bg-black px-4 py-3"
          />

        </div>

        <div className="mt-6 flex flex-wrap gap-3">

          {weekdays.map(
            (
              day,
              index
            ) => (

              <button
                key={day}
                onClick={()=>
                  setSelectedDays(
                    (
                      prev
                    ) =>
                      prev.includes(
                        index
                      )
                        ? prev.filter(
                            (
                              d
                            ) =>
                              d !==
                              index
                          )
                        : [
                            ...prev,
                            index,
                          ]
                  )
                }
                className={`rounded-full px-4 py-2 text-sm ${
                  selectedDays.includes(
                    index
                  )
                    ? "bg-white text-black"
                    : "border border-white/10"
                }`}
              >
                {day}
              </button>

            )
          )}

        </div>

        <button
          disabled={
            loading
          }
          onClick={
            createBulkAvailability
          }
          className="mt-8 rounded-xl bg-green-500 px-6 py-3 text-black"
        >
          {
            loading
              ? "Generating..."
              : "Generate Windows"
          }
        </button>

      </div>

      <div className="grid gap-4">

        {availability.map(
          (
            row
          ) => (

            <div
              key={
                row.id
              }
              className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 p-6"
            >

              <div>

                <h2 className="text-2xl font-semibold">
                  {
                    row.available_date
                  }
                </h2>

                <p className="mt-2 text-zinc-400">
                  {
                    row.start_time
                  }
                  {" — "}
                  {
                    row.end_time
                  }
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  {
                    row.timezone
                  }
                </p>

              </div>

              <button
                onClick={() =>
                  deleteAvailability(
                    row.id
                  )
                }
                className="rounded-full border border-red-500 px-4 py-2 text-red-500"
              >
                Delete
              </button>

            </div>

          )
        )}

      </div>

    </main>
  );
}