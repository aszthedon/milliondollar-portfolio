"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

interface Booking {
  id: number;
  customer_email: string;
}

export default function FilesPage() {
  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [selectedBooking, setSelectedBooking] =
    useState("");

  const [file, setFile] =
    useState<File | null>(null);

  async function fetchBookings() {
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .order("id", {
        ascending: false,
      });

    if (data) {
      setBookings(data);
    }
  }

  async function uploadFile() {
    if (
      !file ||
      !selectedBooking
    ) {
      alert(
        "Select booking and file."
      );

      return;
    }

    const filePath = `${Date.now()}-${
      file.name
    }`;

    const { error } =
      await supabase.storage
        .from("client-files")
        .upload(
          filePath,
          file
        );

    if (error) {
      alert(error.message);
      return;
    }

    const {
      data: publicUrlData,
    } = supabase.storage
      .from("client-files")
      .getPublicUrl(filePath);

    await supabase
      .from("client_files")
      .insert({
        booking_id:
          Number(
            selectedBooking
          ),

        file_name:
          file.name,

        file_url:
          publicUrlData.publicUrl,
      });

    alert(
      "File uploaded successfully!"
    );

    setFile(null);
    setSelectedBooking("");
  }

  useEffect(() => {
    fetchBookings();
  }, []);

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <div className="mb-12">
        <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
          Dashboard
        </p>

        <h1 className="text-5xl font-bold">
          File Uploads
        </h1>
      </div>

      <div className="max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="grid gap-4">
          <select
            value={selectedBooking}
            onChange={(e) =>
              setSelectedBooking(
                e.target.value
              )
            }
            className="rounded-xl border border-white/10 bg-black px-4 py-3"
          >
            <option value="">
              Select Booking
            </option>

            {bookings.map(
              (booking) => (
                <option
                  key={booking.id}
                  value={booking.id}
                >
                  {
                    booking.customer_email
                  }
                </option>
              )
            )}
          </select>

          <input
            type="file"
            onChange={(e) =>
              setFile(
                e.target
                  .files?.[0] ||
                  null
              )
            }
            className="rounded-xl border border-white/10 bg-black px-4 py-3"
          />

          <button
            onClick={uploadFile}
            className="rounded-full bg-white px-6 py-3 text-black"
          >
            Upload File
          </button>
        </div>
      </div>
    </main>
  );
}