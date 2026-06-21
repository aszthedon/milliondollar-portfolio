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
  meeting_link: string | null;
  calendar_event_id: string | null;
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

  const [year, month, day] = parts;

  return `${month}/${day}/${year}`;
}

function formatTime(time: string | null) {
  if (!time) {
    return "Not set";
  }

  const [hourString, minuteString] =
    time.split(":");

  const hour = Number(hourString);
  const minute = Number(minuteString ?? "0");

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

function SuccessContent() {
  const searchParams =
    useSearchParams();

  const bookingId =
    searchParams.get("bookingId");

  const [booking, setBooking] =
    useState<Booking | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [
    pollingComplete,
    setPollingComplete,
  ] = useState(false);

  const [pollAttempts, setPollAttempts] =
    useState(0);

  const [error, setError] =
    useState("");

  async function fetchBooking(
    showRefreshing = false
  ) {
    if (!bookingId) {
      setLoading(false);
      return;
    }

    try {
      setError("");

      if (showRefreshing) {
        setRefreshing(true);
      }

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
              meeting_link,
              calendar_event_id,
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
        "SUCCESS PAGE BOOKING ERROR:",
        error
      );

      setError(
        "Payment was successful, but the booking details could not be loaded yet."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId) {
      return;
    }

    let attempts = 0;

    const interval =
      window.setInterval(async () => {
        attempts += 1;

        setPollAttempts(attempts);

        await fetchBooking();

        if (attempts >= 30) {
          setPollingComplete(true);
          window.clearInterval(interval);
        }
      }, 4000);

    return () => {
      window.clearInterval(interval);
    };
  }, [bookingId]);

  const paymentConfirmed =
    booking?.payment_status === "paid";

  const bookingConfirmed =
    booking?.status === "confirmed" ||
    booking?.status === "approved" ||
    booking?.status === "completed";

  const meetingReady =
    Boolean(
      booking?.meeting_link &&
        booking?.calendar_event_id
    );

  const fullyConfirmed =
    paymentConfirmed &&
    bookingConfirmed &&
    meetingReady;

  const stillProcessing =
    booking &&
    !fullyConfirmed;

  return (
    <main className="min-h-screen bg-black px-6 py-20 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 md:p-12">
          <p className="mb-4 text-sm uppercase tracking-[0.3em] text-green-400">
            Payment Submitted
          </p>

          <h1 className="text-4xl font-bold md:text-6xl">
            {fullyConfirmed
              ? "Your booking is confirmed."
              : "We’re finalizing your booking."}
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-300">
            Thank you for booking with Million Dollar Ticket Productions.
            Your payment has been processed by Stripe, and your booking details
            are being finalized through our system.
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

          {!loading && !booking && !error && (
            <div className="mt-10 rounded-3xl border border-yellow-500 bg-yellow-500/10 p-6 text-yellow-300">
              Your payment was successful, but your booking details are still
              processing. Please refresh this page in a few seconds.
            </div>
          )}

          {booking && (
            <>
              {fullyConfirmed && (
                <div className="mt-10 rounded-3xl border border-green-500 bg-green-500/10 p-6 text-green-300">
                  <h2 className="text-2xl font-bold">
                    Booking Confirmed
                  </h2>

                  <p className="mt-3 text-sm leading-relaxed">
                    Your payment is marked paid, your booking is confirmed,
                    and your Google Meet link has been generated.
                  </p>
                </div>
              )}

              {stillProcessing && (
                <div className="mt-10 rounded-3xl border border-yellow-500 bg-yellow-500/10 p-6 text-yellow-300">
                  <h2 className="text-2xl font-bold">
                    Finalizing Booking...
                  </h2>

                  <p className="mt-3 text-sm leading-relaxed">
                    Your booking exists, but the webhook may still be updating
                    payment status, booking status, Google Calendar, and the
                    Meet link. This page will keep checking automatically.
                  </p>

                  <p className="mt-3 text-xs text-yellow-200/80">
                    Auto-check attempt {pollAttempts}/30
                  </p>

                  {pollingComplete && (
                    <p className="mt-4 rounded-2xl border border-yellow-400/40 bg-black/30 p-4 text-sm">
                      This is taking longer than expected. Your payment may have
                      completed, but the booking system has not finished updating
                      yet. Please check your dashboard booking record.
                    </p>
                  )}
                </div>
              )}

              <div className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
                <div className="rounded-3xl border border-white/10 bg-black/50 p-6">
                  <p className="mb-4 text-sm uppercase tracking-[0.25em] text-zinc-500">
                    Booking Details
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
                    Status
                  </p>

                  <div className="grid gap-4">
                    <div
                      className={`rounded-2xl border p-4 ${
                        paymentConfirmed
                          ? "border-green-500 bg-green-500/10 text-green-300"
                          : "border-yellow-500 bg-yellow-500/10 text-yellow-300"
                      }`}
                    >
                      <p className="text-sm uppercase tracking-[0.2em]">
                        Payment
                      </p>

                      <p className="mt-2 text-2xl font-bold capitalize">
                        {booking.payment_status ?? "Processing"}
                      </p>
                    </div>

                    <div
                      className={`rounded-2xl border p-4 ${
                        bookingConfirmed
                          ? "border-green-500 bg-green-500/10 text-green-300"
                          : "border-yellow-500 bg-yellow-500/10 text-yellow-300"
                      }`}
                    >
                      <p className="text-sm uppercase tracking-[0.2em]">
                        Booking
                      </p>

                      <p className="mt-2 text-2xl font-bold capitalize">
                        {booking.status ?? "Processing"}
                      </p>
                    </div>

                    <div
                      className={`rounded-2xl border p-4 ${
                        meetingReady
                          ? "border-green-500 bg-green-500/10 text-green-300"
                          : "border-yellow-500 bg-yellow-500/10 text-yellow-300"
                      }`}
                    >
                      <p className="text-sm uppercase tracking-[0.2em]">
                        Google Meet
                      </p>

                      <p className="mt-2 text-2xl font-bold">
                        {meetingReady
                          ? "Ready"
                          : "Processing"}
                      </p>
                    </div>
                  </div>

                  {booking.meeting_link ? (
                    <a
                      href={booking.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-6 block rounded-full bg-white px-6 py-3 text-center font-medium text-black transition hover:bg-zinc-200"
                    >
                      Open Google Meet Link
                    </a>
                  ) : (
                    <div className="mt-6 rounded-2xl border border-yellow-500 bg-yellow-500/10 p-4 text-sm text-yellow-300">
                      Your meeting link is still being generated.
                    </div>
                  )}

                  {booking.calendar_event_id && (
                    <p className="mt-4 break-all text-xs text-zinc-500">
                      Calendar Event ID: {booking.calendar_event_id}
                    </p>
                  )}

                  <button
                    onClick={() =>
                      fetchBooking(true)
                    }
                    disabled={refreshing}
                    className="mt-5 w-full rounded-full border border-white/10 px-6 py-3 text-sm text-zinc-300 transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {refreshing
                      ? "Refreshing..."
                      : "Refresh Booking Details"}
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/"
              className="rounded-full bg-white px-6 py-3 font-medium text-black transition hover:bg-zinc-200"
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

function SuccessLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Loading
        </p>

        <h1 className="mt-4 text-3xl font-bold">
          Preparing Confirmation...
        </h1>
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<SuccessLoading />}>
      <SuccessContent />
    </Suspense>
  );
}