"use client";

import {
  useEffect,
  useState,
} from "react";

import jsPDF from "jspdf";

import { supabase } from "@/lib/supabase";

interface Booking {
  id: number;
  booking_date: string;
  booking_time: string;
  payment_status: string;
  status: string;
  customer_email: string;
  notes: string;
  service_id: number;
}

export default function DashboardBookingsPage() {
  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [loadingId, setLoadingId] =
    useState<number | null>(
      null
    );

  async function fetchBookings() {
    const { data } =
      await supabase
        .from("bookings")
        .select("*")
        .order("id", {
          ascending: false,
        });

    if (data) {
      setBookings(data);
    }
  }

  async function updateStatus(
    bookingId: number,
    status: string
  ) {
    try {
      setLoadingId(
        bookingId
      );

      if (
        status ===
        "rejected"
      ) {
        const confirmed =
          window.confirm(
            "Reject this booking?"
          );

        if (!confirmed) {
          setLoadingId(
            null
          );

          return;
        }

        const response =
          await fetch(
            "/api/bookings/cancel",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  {
                    bookingId,
                  }
                ),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok
        ) {
          throw new Error(
            data.error ??
              "Rejection failed."
          );
        }

        await fetchBookings();

        setLoadingId(
          null
        );

        return;
      }

      await supabase
        .from("bookings")
        .update({
          status,
        })
        .eq(
          "id",
          bookingId
        );

      await fetchBookings();

      setLoadingId(
        null
      );
    } catch (error) {
      console.error(
        error
      );

      alert(
        "Action failed."
      );

      setLoadingId(
        null
      );
    }
  }

  function downloadInvoice(
    booking: Booking
  ) {
    const doc =
      new jsPDF();

    doc.setFontSize(
      24
    );

    doc.text(
      "Invoice",
      20,
      30
    );

    doc.setFontSize(
      14
    );

    doc.text(
      `Client: ${booking.customer_email}`,
      20,
      60
    );

    doc.text(
      `Booking Date: ${booking.booking_date}`,
      20,
      80
    );

    doc.text(
      `Booking Time: ${booking.booking_time}`,
      20,
      100
    );

    doc.text(
      `Payment Status: ${booking.payment_status}`,
      20,
      120
    );

    doc.text(
      `Booking Status: ${booking.status}`,
      20,
      140
    );

    doc.text(
      `Notes: ${booking.notes}`,
      20,
      170
    );

    doc.save(
      `invoice-${booking.id}.pdf`
    );
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
          Booking Management
        </h1>
      </div>

      <div className="grid gap-6">
        {bookings.map(
          (booking) => (
            <div
              key={
                booking.id
              }
              className="rounded-3xl border border-white/10 bg-white/5 p-8"
            >
              <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-3xl font-semibold">
                    {
                      booking.customer_email
                    }
                  </h2>

                  <p className="mt-2 text-zinc-400">
                    {
                      booking.booking_date
                    }{" "}
                    at{" "}
                    {
                      booking.booking_time
                    }
                  </p>

                  <p className="mt-6 whitespace-pre-wrap text-zinc-300">
                    {
                      booking.notes
                    }
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="rounded-full border border-white/10 px-4 py-2 text-sm">
                    Status:{" "}
                    {
                      booking.status
                    }
                  </div>

                  <div className="rounded-full border border-green-500 px-4 py-2 text-sm text-green-400">
                    Payment:{" "}
                    {
                      booking.payment_status
                    }
                  </div>

                  <button
                    onClick={() =>
                      downloadInvoice(
                        booking
                      )
                    }
                    className="rounded-full border border-white/10 px-4 py-2 text-sm transition hover:bg-white hover:text-black"
                  >
                    Download Invoice
                  </button>

                  <button
                    disabled={
                      loadingId ===
                      booking.id
                    }
                    onClick={() =>
                      updateStatus(
                        booking.id,
                        "approved"
                      )
                    }
                    className="rounded-full border border-green-500 px-4 py-2 text-sm text-green-400 transition hover:bg-green-500 hover:text-white disabled:opacity-50"
                  >
                    Approve
                  </button>

                  <button
                    disabled={
                      loadingId ===
                      booking.id
                    }
                    onClick={() =>
                      updateStatus(
                        booking.id,
                        "completed"
                      )
                    }
                    className="rounded-full border border-blue-500 px-4 py-2 text-sm text-blue-400 transition hover:bg-blue-500 hover:text-white disabled:opacity-50"
                  >
                    Mark Completed
                  </button>

                  <button
                    disabled={
                      loadingId ===
                      booking.id
                    }
                    onClick={() =>
                      updateStatus(
                        booking.id,
                        "rejected"
                      )
                    }
                    className="rounded-full border border-red-500 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500 hover:text-white disabled:opacity-50"
                  >
                    {loadingId ===
                    booking.id
                      ? "Processing..."
                      : "Reject"}
                  </button>
                </div>
              </div>
            </div>
          )
        )}

        {bookings.length ===
          0 && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
            <p className="text-zinc-400">
              No bookings
              found.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}