"use client";

import {
  Suspense,
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { supabase } from "@/lib/supabase";

interface Booking {
  id: number;
  customer_email: string | null;
  booking_date: string | null;
  booking_time: string | null;
  booking_end_time: string | null;
  payment_status: string | null;
  status: string | null;
  price_paid: number | null;
  timezone: string | null;
}

function formatDate(date: string | null) {
  if (!date) {
    return "Not set";
  }

  const parts = date.split("-");

  if (parts.length !== 3) {
    return date;
  }

  const [year, month, day] =
    parts;

  return `${month}/${day}/${year}`;
}

function formatTime(time: string | null) {
  if (!time) {
    return "Not set";
  }

  const [hourString, minuteString] =
    time.split(":");

  const hour = Number(hourString);
  const minute =
    Number(minuteString ?? "0");

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return time;
  }

  const suffix =
    hour >= 12 ? "PM" : "AM";

  const displayHour =
    hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(
    2,
    "0"
  )} ${suffix}`;
}

function formatCurrency(value: number | null) {
  if (
    value === null ||
    value === undefined
  ) {
    return "Not set";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }
  ).format(Number(value));
}

function CancelContent() {
  const searchParams =
    useSearchParams();

  const bookingId =
    searchParams.get("bookingId");

  const [booking, setBooking] =
    useState<Booking | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function fetchBooking() {
    if (!bookingId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const { data, error } =
        await supabase
          .from("bookings")
          .select(
            `
              id,
              customer_email,
              booking_date,
              booking_time,
              booking_end_time,
              payment_status,
              status,
              price_paid,
              timezone
            `
          )
          .eq("id", bookingId)
          .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setBooking(data as Booking);
      }
    } catch (error) {
      console.error(
        "CANCEL PAGE BOOKING ERROR:",
        error
      );

      setError(
        "The booking details could not be loaded right now."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  const paymentWasCompleted =
    booking?.payment_status === "paid";

  const bookingWasConfirmed =
    booking?.status === "confirmed" ||
    booking?.status === "approved" ||
    booking?.status === "completed";

  return (
    <main className="min-h-screen bg-black px-6 py-20 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 md:p-12">
          <p className="mb-4 text-sm uppercase tracking-[0.3em] text-yellow-400">
            Checkout Cancelled
          </p>

          <h1 className="text-4xl font-bold md:text-6xl">
            Your payment was not completed.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-300">
            No worries — your checkout was cancelled before payment was
            finalized. Your booking is not confirmed unless payment has been
            successfully completed.
          </p>

          {loading && (
            <div className="mt-10 rounded-3xl border border-white/10 bg-black/50 p-6 text-zinc-400">
              Loading booking details...
            </div>
          )}

          {!loading && error && (
            <div className="mt-10 rounded-3xl border border-yellow-500 bg-yellow-500/10 p-6 text-yellow-300">
              {error}
            </div>
          )}

          {!loading &&
            !booking &&
            !error && (
              <div className="mt-10 rounded-3xl border border-white/10 bg-black/50 p-6">
                <h2 className="text-2xl font-semibold">
                  No Booking Found
                </h2>

                <p className="mt-3 text-zinc-400">
                  We could not find booking details for this cancelled checkout.
                  You can return to the booking page and try again whenever
                  you’re ready.
                </p>
              </div>
            )}

          {booking && (
            <div className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="rounded-3xl border border-white/10 bg-black/50 p-6">
                <p className="mb-4 text-sm uppercase tracking-[0.25em] text-zinc-500">
                  Booking Attempt
                </p>

                <div className="grid gap-5">
                  <div>
                    <p className="text-sm text-zinc-500">
                      Booking ID
                    </p>

                    <p className="mt-1 text-xl font-semibold">
                      #{booking.id}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-500">
                      Email
                    </p>

                    <p className="mt-1 text-xl font-semibold">
                      {booking.customer_email ?? "Not provided"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-500">
                      Date
                    </p>

                    <p className="mt-1 text-xl font-semibold">
                      {formatDate(booking.booking_date)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-500">
                      Time
                    </p>

                    <p className="mt-1 text-xl font-semibold">
                      {formatTime(booking.booking_time)}

                      {booking.booking_end_time && (
                        <>
                          {" — "}
                          {formatTime(booking.booking_end_time)}
                        </>
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-500">
                      Price
                    </p>

                    <p className="mt-1 text-xl font-semibold">
                      {formatCurrency(booking.price_paid)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-500">
                      Timezone
                    </p>

                    <p className="mt-1 text-xl font-semibold">
                      {booking.timezone ?? "Not set"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/50 p-6">
                <p className="mb-4 text-sm uppercase tracking-[0.25em] text-zinc-500">
                  Current Status
                </p>

                <div className="grid gap-4">
                  <div
                    className={`rounded-2xl border p-4 ${
                      paymentWasCompleted
                        ? "border-green-500 bg-green-500/10 text-green-300"
                        : "border-yellow-500 bg-yellow-500/10 text-yellow-300"
                    }`}
                  >
                    <p className="text-sm uppercase tracking-[0.2em]">
                      Payment
                    </p>

                    <p className="mt-2 text-2xl font-bold capitalize">
                      {booking.payment_status ?? "Pending"}
                    </p>
                  </div>

                  <div
                    className={`rounded-2xl border p-4 ${
                      bookingWasConfirmed
                        ? "border-green-500 bg-green-500/10 text-green-300"
                        : "border-yellow-500 bg-yellow-500/10 text-yellow-300"
                    }`}
                  >
                    <p className="text-sm uppercase tracking-[0.2em]">
                      Booking
                    </p>

                    <p className="mt-2 text-2xl font-bold capitalize">
                      {booking.status ?? "Pending"}
                    </p>
                  </div>
                </div>

                {paymentWasCompleted ? (
                  <div className="mt-6 rounded-2xl border border-green-500 bg-green-500/10 p-4 text-sm leading-relaxed text-green-300">
                    Payment appears to have completed. Check your success page
                    or dashboard to confirm the booking details.
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-yellow-500 bg-yellow-500/10 p-4 text-sm leading-relaxed text-yellow-300">
                    Since payment was not completed, this booking is not
                    confirmed. You can return to the booking page and submit
                    checkout again.
                  </div>
                )}

                <button
                  onClick={fetchBooking}
                  className="mt-5 w-full rounded-full border border-white/10 px-6 py-3 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
                >
                  Refresh Status
                </button>
              </div>
            </div>
          )}

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/#booking"
              className="rounded-full bg-white px-6 py-3 font-medium text-black transition hover:bg-zinc-200"
            >
              Try Booking Again
            </Link>

            <Link
              href="/"
              className="rounded-full border border-white/10 px-6 py-3 font-medium text-zinc-300 transition hover:bg-white hover:text-black"
            >
              Back Home
            </Link>

            <Link
              href="/dashboard/bookings"
              className="rounded-full border border-white/10 px-6 py-3 font-medium text-zinc-300 transition hover:bg-white hover:text-black"
            >
              View Dashboard Bookings
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function CancelLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Loading
        </p>

        <h1 className="mt-4 text-3xl font-bold">
          Checking Checkout Status...
        </h1>
      </div>
    </main>
  );
}

export default function CancelPage() {
  return (
    <Suspense fallback={<CancelLoading />}>
      <CancelContent />
    </Suspense>
  );
}