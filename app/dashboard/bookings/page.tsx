"use client";

import { useEffect, useMemo, useState } from "react";

import AdminUnlockGate from "@/components/admin/AdminUnlockGate";
import { getDashboardAuthHeaders } from "@/lib/security/dashboardClientAuth";
import { supabase } from "@/lib/supabase";

type BookingRow = Record<string, any>;

function formatMoney(value: unknown) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function getBookingLabel(booking: BookingRow) {
  return (
    booking.service_name ||
    booking.service_title ||
    booking.title ||
    booking.event_title ||
    `Booking #${booking.id}`
  );
}

function getBookingClient(booking: BookingRow) {
  return (
    booking.customer_name ||
    booking.client_name ||
    booking.name ||
    booking.customer_email ||
    booking.email ||
    "Unknown client"
  );
}

function getBookingDate(booking: BookingRow) {
  return (
    booking.booking_date ||
    booking.event_date ||
    booking.scheduled_date ||
    booking.date ||
    "No date"
  );
}

function getBookingTime(booking: BookingRow) {
  return (
    booking.booking_time ||
    booking.event_time ||
    booking.scheduled_time ||
    booking.time ||
    ""
  );
}

export default function DashboardBookingsPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(
    null
  );
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  async function fetchBookings() {
    try {
      setLoading(true);
      setError("");

      const { data, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", {
          ascending: false,
        })
        .limit(300);

      if (bookingsError) {
        throw bookingsError;
      }

      setBookings(data ?? []);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Bookings could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  async function cancelBooking(booking: BookingRow) {
    const confirmed = window.confirm(
      `Cancel ${getBookingLabel(booking)} for ${getBookingClient(booking)}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(`cancel-${booking.id}`);
      setError("");
      setSuccess("");

      const response = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getDashboardAuthHeaders(),
        },
        body: JSON.stringify({
          booking_id: booking.id,
          reason: cancelReason || "Cancelled from dashboard.",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Booking could not be cancelled.");
      }

      setSuccess(data.message ?? "Booking cancelled.");
      setCancelReason("");
      await fetchBookings();
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Booking could not be cancelled."
      );
    } finally {
      setActionLoading("");
    }
  }

  async function rescheduleBooking(booking: BookingRow) {
    if (!rescheduleDate || !rescheduleTime) {
      setError("Choose a new date and time before rescheduling.");
      return;
    }

    try {
      setActionLoading(`reschedule-${booking.id}`);
      setError("");
      setSuccess("");

      const response = await fetch("/api/bookings/reschedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getDashboardAuthHeaders(),
        },
        body: JSON.stringify({
          booking_id: booking.id,
          booking_date: rescheduleDate,
          booking_time: rescheduleTime,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Booking could not be rescheduled.");
      }

      setSuccess(data.message ?? "Booking rescheduled.");
      setSelectedBookingId(null);
      setRescheduleDate("");
      setRescheduleTime("");
      await fetchBookings();
    } catch (rescheduleError) {
      setError(
        rescheduleError instanceof Error
          ? rescheduleError.message
          : "Booking could not be rescheduled."
      );
    } finally {
      setActionLoading("");
    }
  }

  async function createBalanceCheckout(booking: BookingRow) {
    try {
      setActionLoading(`balance-${booking.id}`);
      setError("");
      setSuccess("");

      const response = await fetch("/api/bookings/create-balance-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getDashboardAuthHeaders(),
        },
        body: JSON.stringify({
          booking_id: booking.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Balance checkout could not be created."
        );
      }

      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }

      setSuccess(data.message ?? "Balance checkout created.");
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Balance checkout could not be created."
      );
    } finally {
      setActionLoading("");
    }
  }

  async function createProjectFromBooking(booking: BookingRow) {
    try {
      setActionLoading(`project-${booking.id}`);
      setError("");
      setSuccess("");

      const response = await fetch("/api/projects/create-from-booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getDashboardAuthHeaders(),
        },
        body: JSON.stringify({
          booking_id: booking.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Project could not be created.");
      }

      setSuccess(data.message ?? "Project created from booking.");
    } catch (projectError) {
      setError(
        projectError instanceof Error
          ? projectError.message
          : "Project could not be created."
      );
    } finally {
      setActionLoading("");
    }
  }

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const status = String(
        booking.status || booking.booking_status || booking.payment_status || ""
      ).toLowerCase();

      const matchesStatus = statusFilter === "all" || status === statusFilter;

      const searchableText = [
        getBookingLabel(booking),
        getBookingClient(booking),
        booking.customer_email,
        booking.email,
        booking.notes,
        booking.status,
        booking.payment_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!query || searchableText.includes(query));
    });
  }, [bookings, search, statusFilter]);

  useEffect(() => {
    fetchBookings();
  }, []);

  return (
    <AdminUnlockGate title="Bookings Dashboard">
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto grid max-w-7xl gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                Dashboard
              </p>

              <h1 className="mt-3 text-4xl font-black">Bookings</h1>

              <p className="mt-2 text-sm text-zinc-400">
                View, reschedule, cancel, collect balances, and create projects
                from bookings.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchBookings}
              disabled={loading}
              className="rounded-full bg-white px-5 py-3 text-sm font-black text-black disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-200">
              {success}
            </div>
          )}

          <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 md:grid-cols-[1fr_180px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search bookings..."
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="grid gap-4">
            {loading ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">
                Loading bookings...
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">
                No bookings found.
              </div>
            ) : (
              filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
                          #{booking.id}
                        </span>

                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
                          {String(
                            booking.status ||
                              booking.booking_status ||
                              "unknown"
                          ).replaceAll("_", " ")}
                        </span>

                        <span className="rounded-full border border-green-500/30 px-3 py-1 text-xs text-green-300">
                          {booking.payment_status || "payment unknown"}
                        </span>
                      </div>

                      <h2 className="mt-3 text-xl font-black">
                        {getBookingLabel(booking)}
                      </h2>

                      <div className="mt-2 grid gap-1 text-sm text-zinc-400">
                        <p>{getBookingClient(booking)}</p>
                        <p>
                          {getBookingDate(booking)} {getBookingTime(booking)}
                        </p>
                        <p>
                          Paid:{" "}
                          {formatMoney(
                            booking.amount_paid || booking.amount_due_now
                          )}{" "}
                          · Balance:{" "}
                          {formatMoney(
                            booking.remaining_balance || booking.balance_due
                          )}
                        </p>
                        {booking.google_meet_link && (
                          <a
                            href={booking.google_meet_link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-300 underline"
                          >
                            Google Meet Link
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-2 sm:flex sm:flex-wrap xl:grid xl:min-w-52">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedBookingId(
                            selectedBookingId === booking.id
                              ? null
                              : Number(booking.id)
                          )
                        }
                        className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold"
                      >
                        Reschedule
                      </button>

                      <button
                        type="button"
                        onClick={() => createBalanceCheckout(booking)}
                        disabled={actionLoading === `balance-${booking.id}`}
                        className="rounded-full bg-blue-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                      >
                        Balance Link
                      </button>

                      <button
                        type="button"
                        onClick={() => createProjectFromBooking(booking)}
                        disabled={actionLoading === `project-${booking.id}`}
                        className="rounded-full bg-green-500 px-4 py-2 text-sm font-bold text-black disabled:opacity-60"
                      >
                        Make Project
                      </button>

                      <button
                        type="button"
                        onClick={() => cancelBooking(booking)}
                        disabled={actionLoading === `cancel-${booking.id}`}
                        className="rounded-full bg-red-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  {selectedBookingId === booking.id && (
                    <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-black p-4 md:grid-cols-[1fr_1fr_auto]">
                      <input
                        type="date"
                        value={rescheduleDate}
                        onChange={(event) =>
                          setRescheduleDate(event.target.value)
                        }
                        className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white"
                      />

                      <input
                        type="time"
                        value={rescheduleTime}
                        onChange={(event) =>
                          setRescheduleTime(event.target.value)
                        }
                        className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white"
                      />

                      <button
                        type="button"
                        onClick={() => rescheduleBooking(booking)}
                        disabled={
                          actionLoading === `reschedule-${booking.id}`
                        }
                        className="rounded-full bg-white px-4 py-2 text-sm font-black text-black disabled:opacity-60"
                      >
                        Save
                      </button>
                    </div>
                  )}

                  <textarea
                    value={cancelReason}
                    onChange={(event) => setCancelReason(event.target.value)}
                    placeholder="Optional cancellation reason..."
                    className="mt-4 min-h-20 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none"
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </AdminUnlockGate>
  );
}