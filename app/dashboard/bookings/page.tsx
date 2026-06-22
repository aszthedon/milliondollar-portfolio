"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import jsPDF from "jspdf";

import { supabase } from "@/lib/supabase";

interface Booking {
  id: number;
  booking_date: string | null;
  booking_time: string | null;
  booking_end_time: string | null;
  payment_status: string | null;
  status: string | null;
  customer_email: string | null;
  notes: string | null;
  service_id: number | null;
  meeting_link: string | null;
  calendar_event_id: string | null;
  timezone: string | null;
  created_at: string | null;

  price_paid: number | null;
  original_price: number | null;
  discount_code: string | null;
  discount_amount: number | null;
  amount_due_now: number | null;
  remaining_balance: number | null;
  payment_mode: string | null;
  deposit_amount: number | null;
  balance_status: string | null;
}

interface RescheduleInput {
  date: string;
  time: string;
}

const statusOptions = [
  "all",
  "pending",
  "approved",
  "completed",
  "rescheduled",
  "rejected",
  "cancelled",
];

export default function DashboardBookingsPage() {
  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadingId, setLoadingId] =
    useState<number | null>(null);

  const [error, setError] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [
    rescheduleInputs,
    setRescheduleInputs,
  ] = useState<
    Record<number, RescheduleInput>
  >({});

  async function fetchBookings() {
    try {
      setError("");

      const { data, error } =
        await supabase
          .from("bookings")
          .select(
            `
              id,
              booking_date,
              booking_time,
              booking_end_time,
              payment_status,
              status,
              customer_email,
              notes,
              service_id,
              meeting_link,
              calendar_event_id,
              timezone,
              created_at,
              price_paid,
              original_price,
              discount_code,
              discount_amount,
              amount_due_now,
              remaining_balance,
              payment_mode,
              deposit_amount,
              balance_status
            `
          )
          .order("created_at", {
            ascending: false,
          });

      if (error) {
        console.error(
          "BOOKINGS FETCH ERROR:",
          error
        );

        setError(
          "Bookings could not be loaded."
        );

        return;
      }

      setBookings((data ?? []) as Booking[]);
    } catch (error) {
      console.error(error);

      setError(
        "Something went wrong while loading bookings."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBookings();
  }, []);

  const filteredBookings =
    useMemo(() => {
      return bookings.filter(
        (booking) => {
          const email =
            booking.customer_email ??
            "";

          const status =
            booking.status ?? "";

          const discountCode =
            booking.discount_code ?? "";

          const matchesSearch =
            email
              .toLowerCase()
              .includes(
                searchTerm.toLowerCase()
              ) ||
            discountCode
              .toLowerCase()
              .includes(
                searchTerm.toLowerCase()
              ) ||
            String(booking.id).includes(
              searchTerm
            );

          const matchesStatus =
            statusFilter === "all" ||
            status === statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      bookings,
      searchTerm,
      statusFilter,
    ]);

  function toNumber(value: number | null) {
    const number = Number(value ?? 0);

    return Number.isFinite(number)
      ? number
      : 0;
  }

  function formatMoney(
    value: number | null
  ) {
    return `$${toNumber(value).toFixed(2)}`;
  }

  function getCollectedAmount(
    booking: Booking
  ) {
    return (
      toNumber(booking.price_paid) ||
      toNumber(booking.amount_due_now)
    );
  }

  const totalCollected =
    useMemo(() => {
      return bookings.reduce(
        (total, booking) =>
          total +
          getCollectedAmount(booking),
        0
      );
    }, [bookings]);

  const totalBalanceDue =
    useMemo(() => {
      return bookings.reduce(
        (total, booking) => {
          if (
            booking.balance_status ===
              "balance_paid" ||
            booking.balance_status ===
              "not_applicable"
          ) {
            return total;
          }

          return (
            total +
            toNumber(
              booking.remaining_balance
            )
          );
        },
        0
      );
    }, [bookings]);

  function getStatusCount(
    status: string
  ) {
    return bookings.filter(
      (booking) =>
        booking.status === status
    ).length;
  }

  function getPaymentCount(
    status: string
  ) {
    return bookings.filter(
      (booking) =>
        booking.payment_status ===
        status
    ).length;
  }

  function getDepositCount() {
    return bookings.filter(
      (booking) =>
        booking.payment_mode ===
        "deposit"
    ).length;
  }

  function getDiscountCount() {
    return bookings.filter(
      (booking) =>
        Boolean(booking.discount_code)
    ).length;
  }

  function updateRescheduleInput(
    bookingId: number,
    field: keyof RescheduleInput,
    value: string
  ) {
    setRescheduleInputs(
      (prev) => {
        const current =
          prev[bookingId] ?? {
            date: "",
            time: "",
          };

        return {
          ...prev,
          [bookingId]: {
            ...current,
            [field]: value,
          },
        };
      }
    );
  }

  async function rescheduleBooking(
    booking: Booking
  ) {
    const input =
      rescheduleInputs[
        booking.id
      ];

    if (
      !input?.date ||
      !input?.time
    ) {
      alert(
        "Select a new date and time."
      );

      return;
    }

    try {
      setLoadingId(booking.id);

      const response =
        await fetch(
          "/api/bookings/reschedule",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              bookingId: booking.id,
              newDate: input.date,
              newTime: input.time,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Reschedule failed."
        );
      }

      setRescheduleInputs(
        (prev) => ({
          ...prev,
          [booking.id]: {
            date: "",
            time: "",
          },
        })
      );

      await fetchBookings();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Reschedule failed."
      );
    } finally {
      setLoadingId(null);
    }
  }

  async function updateStatus(
    bookingId: number,
    status: string
  ) {
    try {
      setLoadingId(bookingId);

      if (status === "rejected") {
        const confirmed =
          window.confirm(
            "Reject this booking?"
          );

        if (!confirmed) {
          return;
        }

        const response =
          await fetch(
            "/api/bookings/cancel",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                bookingId,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ??
              "Rejection failed."
          );
        }

        await fetchBookings();

        return;
      }

      const updatePayload: {
        status: string;
        balance_status?: string;
      } = {
        status,
      };

      const booking = bookings.find(
        (booking) =>
          booking.id === bookingId
      );

      if (
        status === "completed" &&
        booking?.payment_mode ===
          "deposit" &&
        toNumber(
          booking.remaining_balance
        ) > 0 &&
        booking.balance_status !==
          "balance_paid"
      ) {
        updatePayload.balance_status =
          "ready_to_collect";
      }

      const { error } =
        await supabase
          .from("bookings")
          .update(updatePayload)
          .eq(
            "id",
            bookingId
          );

      if (error) {
        throw error;
      }

      await fetchBookings();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Action failed."
      );
    } finally {
      setLoadingId(null);
    }
  }

  async function markBalanceStatus(
    booking: Booking,
    balanceStatus: string
  ) {
    try {
      setLoadingId(booking.id);

      const updatePayload: {
        balance_status: string;
        remaining_balance?: number;
      } = {
        balance_status: balanceStatus,
      };

      if (
        balanceStatus ===
        "balance_paid"
      ) {
        updatePayload.remaining_balance = 0;
      }

      const { error } =
        await supabase
          .from("bookings")
          .update(updatePayload)
          .eq("id", booking.id);

      if (error) {
        throw error;
      }

      await fetchBookings();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Balance status could not be updated."
      );
    } finally {
      setLoadingId(null);
    }
  }

  function formatDate(
    date: string | null
  ) {
    if (!date) {
      return "Not set";
    }

    const parts =
      date.split("-");

    if (parts.length !== 3) {
      return date;
    }

    const [year, month, day] =
      parts;

    return `${month}/${day}/${year}`;
  }

  function formatTime(
    time: string | null
  ) {
    if (!time) {
      return "Not set";
    }

    const [
      hourString,
      minuteString,
    ] = time.split(":");

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
      return time;
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

  function statusClass(
    status: string | null
  ) {
    if (status === "approved") {
      return "border-green-500 text-green-400";
    }

    if (status === "completed") {
      return "border-blue-500 text-blue-400";
    }

    if (status === "rescheduled") {
      return "border-yellow-500 text-yellow-400";
    }

    if (status === "rejected") {
      return "border-red-500 text-red-400";
    }

    if (status === "cancelled") {
      return "border-zinc-500 text-zinc-400";
    }

    return "border-white/10 text-zinc-300";
  }

  function paymentClass(
    status: string | null
  ) {
    if (status === "paid") {
      return "border-green-500 text-green-400";
    }

    if (status === "failed") {
      return "border-red-500 text-red-400";
    }

    return "border-yellow-500 text-yellow-400";
  }

  function balanceClass(
    status: string | null
  ) {
    if (
      status === "balance_paid" ||
      status === "not_applicable"
    ) {
      return "border-green-500 text-green-400";
    }

    if (
      status === "ready_to_collect"
    ) {
      return "border-blue-500 text-blue-400";
    }

    return "border-yellow-500 text-yellow-400";
  }

  function downloadInvoice(
    booking: Booking
  ) {
    const doc =
      new jsPDF();

    const notes =
      booking.notes?.trim()
        ? booking.notes
        : "No notes provided.";

    const originalPrice =
      toNumber(booking.original_price);

    const discountAmount =
      toNumber(booking.discount_amount);

    const amountPaid =
      getCollectedAmount(booking);

    const remainingBalance =
      toNumber(booking.remaining_balance);

    doc.setFontSize(24);
    doc.text(
      "Invoice",
      20,
      30
    );

    doc.setFontSize(12);

    let y = 50;

    const writeLine = (text: string) => {
      doc.text(text, 20, y);
      y += 15;
    };

    writeLine(`Booking ID: ${booking.id}`);

    writeLine(
      `Client: ${
        booking.customer_email ??
        "No email"
      }`
    );

    writeLine(
      `Booking Date: ${formatDate(
        booking.booking_date
      )}`
    );

    writeLine(
      `Booking Time: ${formatTime(
        booking.booking_time
      )}${
        booking.booking_end_time
          ? ` - ${formatTime(
              booking.booking_end_time
            )}`
          : ""
      }`
    );

    writeLine(
      `Booking Status: ${
        booking.status ??
        "unknown"
      }`
    );

    writeLine(
      `Payment Status: ${
        booking.payment_status ??
        "unknown"
      }`
    );

    writeLine(
      `Payment Mode: ${
        booking.payment_mode ===
        "deposit"
          ? "Deposit"
          : "Full Payment"
      }`
    );

    writeLine(
      `Original Price: ${formatMoney(
        originalPrice
      )}`
    );

    writeLine(
      `Discount Code: ${
        booking.discount_code ??
        "None"
      }`
    );

    writeLine(
      `Discount Amount: ${formatMoney(
        discountAmount
      )}`
    );

    writeLine(
      `Amount Paid Now: ${formatMoney(
        amountPaid
      )}`
    );

    writeLine(
      `Remaining Balance: ${formatMoney(
        remainingBalance
      )}`
    );

    writeLine(
      `Balance Status: ${
        booking.balance_status ??
        "not_applicable"
      }`
    );

    writeLine(
      `Timezone: ${
        booking.timezone ??
        "Not set"
      }`
    );

    if (booking.meeting_link) {
      writeLine(
        `Meeting Link: ${booking.meeting_link}`
      );
    }

    y += 5;

    doc.text(
      "Notes:",
      20,
      y
    );

    y += 10;

    const wrappedNotes =
      doc.splitTextToSize(
        notes,
        170
      );

    doc.text(
      wrappedNotes,
      20,
      y
    );

    doc.save(
      `invoice-${booking.id}.pdf`
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            Loading
          </p>

          <h1 className="mt-4 text-3xl font-bold">
            Loading Bookings...
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
            Dashboard
          </p>

          <h1 className="text-5xl font-bold">
            Booking Management
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            Review bookings, payment status, deposits, discounts, balances, calendar links, and invoices.
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
            onClick={fetchBookings}
            className="rounded-full bg-white px-5 py-3 text-sm text-black transition hover:bg-zinc-200"
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

      <section className="mb-10 grid gap-6 md:grid-cols-2 xl:grid-cols-8">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Total
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {bookings.length}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Pending
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {getStatusCount("pending")}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Approved
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {getStatusCount("approved")}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Paid
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {getPaymentCount("paid")}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Deposits
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {getDepositCount()}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Discounts
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {getDiscountCount()}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Collected
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            ${totalCollected.toFixed(2)}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Balance Due
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            ${totalBalanceDue.toFixed(2)}
          </h2>
        </div>
      </section>

      <section className="mb-10 rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="grid gap-4 md:grid-cols-[1fr_240px]">
          <input
            type="text"
            placeholder="Search by email, booking ID, or discount code..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value
              )
            }
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none placeholder:text-zinc-600"
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          >
            {statusOptions.map(
              (status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status === "all"
                    ? "All Statuses"
                    : status}
                </option>
              )
            )}
          </select>
        </div>
      </section>

      <section className="grid gap-6">
        {filteredBookings.map(
          (booking) => {
            const input =
              rescheduleInputs[
                booking.id
              ] ?? {
                date: "",
                time: "",
              };

            const paymentMode =
              booking.payment_mode ===
              "deposit"
                ? "Deposit"
                : "Full Payment";

            const amountPaid =
              getCollectedAmount(booking);

            const originalPrice =
              toNumber(
                booking.original_price
              );

            const discountAmount =
              toNumber(
                booking.discount_amount
              );

            const remainingBalance =
              toNumber(
                booking.remaining_balance
              );

            return (
              <div
                key={booking.id}
                className="rounded-3xl border border-white/10 bg-white/5 p-8"
              >
                <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-3xl font-semibold">
                        {booking.customer_email ??
                          "No email"}
                      </h2>

                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.15em] text-zinc-400">
                        #{booking.id}
                      </span>
                    </div>

                    <p className="mt-3 text-zinc-400">
                      {formatDate(
                        booking.booking_date
                      )}{" "}
                      at{" "}
                      {formatTime(
                        booking.booking_time
                      )}

                      {booking.booking_end_time && (
                        <>
                          {" "}
                          —{" "}
                          {formatTime(
                            booking.booking_end_time
                          )}
                        </>
                      )}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <span
                        className={`rounded-full border px-4 py-2 text-sm capitalize ${statusClass(
                          booking.status
                        )}`}
                      >
                        Status:{" "}
                        {booking.status ??
                          "unknown"}
                      </span>

                      <span
                        className={`rounded-full border px-4 py-2 text-sm capitalize ${paymentClass(
                          booking.payment_status
                        )}`}
                      >
                        Payment:{" "}
                        {booking.payment_status ??
                          "unknown"}
                      </span>

                      <span className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300">
                        {paymentMode}
                      </span>

                      {booking.payment_mode ===
                        "deposit" && (
                        <span
                          className={`rounded-full border px-4 py-2 text-sm capitalize ${balanceClass(
                            booking.balance_status
                          )}`}
                        >
                          Balance:{" "}
                          {booking.balance_status ??
                            "balance_due"}
                        </span>
                      )}

                      {booking.timezone && (
                        <span className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300">
                          {booking.timezone}
                        </span>
                      )}
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                          Original Price
                        </p>

                        <p className="mt-2 text-2xl font-bold">
                          {formatMoney(
                            originalPrice
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                          Discount
                        </p>

                        <p className="mt-2 text-2xl font-bold text-green-300">
                          -
                          {formatMoney(
                            discountAmount
                          )}
                        </p>

                        {booking.discount_code && (
                          <p className="mt-2 text-sm text-zinc-400">
                            Code:{" "}
                            {
                              booking.discount_code
                            }
                          </p>
                        )}
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                          Paid Now
                        </p>

                        <p className="mt-2 text-2xl font-bold text-yellow-300">
                          {formatMoney(
                            amountPaid
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                          Remaining
                        </p>

                        <p className="mt-2 text-2xl font-bold text-blue-300">
                          {formatMoney(
                            remainingBalance
                          )}
                        </p>
                      </div>
                    </div>

                    {booking.notes && (
                      <p className="mt-6 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/40 p-5 text-zinc-300">
                        {booking.notes}
                      </p>
                    )}

                    {(booking.meeting_link ||
                      booking.calendar_event_id) && (
                      <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-5">
                        <p className="mb-3 text-sm uppercase tracking-[0.2em] text-zinc-500">
                          Calendar Details
                        </p>

                        {booking.meeting_link && (
                          <a
                            href={
                              booking.meeting_link
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-sm text-blue-400 underline"
                          >
                            Open Meeting Link
                          </a>
                        )}

                        {booking.calendar_event_id && (
                          <p className="mt-2 break-all text-sm text-zinc-400">
                            Event ID:{" "}
                            {
                              booking.calendar_event_id
                            }
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-black/40 p-5">
                    <p className="mb-4 text-sm uppercase tracking-[0.2em] text-zinc-500">
                      Actions
                    </p>

                    <div className="grid gap-3">
                      <input
                        type="date"
                        value={input.date}
                        onChange={(event) =>
                          updateRescheduleInput(
                            booking.id,
                            "date",
                            event.target.value
                          )
                        }
                        className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white"
                      />

                      <input
                        type="time"
                        value={input.time}
                        onChange={(event) =>
                          updateRescheduleInput(
                            booking.id,
                            "time",
                            event.target.value
                          )
                        }
                        className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white"
                      />

                      <button
                        disabled={
                          loadingId ===
                          booking.id
                        }
                        onClick={() =>
                          rescheduleBooking(
                            booking
                          )
                        }
                        className="rounded-full border border-yellow-500 px-4 py-2 text-sm text-yellow-400 transition hover:bg-yellow-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {loadingId ===
                        booking.id
                          ? "Processing..."
                          : "Reschedule"}
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
                        className="rounded-full border border-green-500 px-4 py-2 text-sm text-green-400 transition hover:bg-green-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
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
                        className="rounded-full border border-blue-500 px-4 py-2 text-sm text-blue-400 transition hover:bg-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Mark Completed
                      </button>

                      {booking.payment_mode ===
                        "deposit" &&
                        remainingBalance > 0 && (
                          <>
                            <button
                              disabled={
                                loadingId ===
                                booking.id
                              }
                              onClick={() =>
                                markBalanceStatus(
                                  booking,
                                  "ready_to_collect"
                                )
                              }
                              className="rounded-full border border-purple-500 px-4 py-2 text-sm text-purple-400 transition hover:bg-purple-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Mark Ready To Collect
                            </button>

                            <button
                              disabled={
                                loadingId ===
                                booking.id
                              }
                              onClick={() =>
                                markBalanceStatus(
                                  booking,
                                  "balance_paid"
                                )
                              }
                              className="rounded-full border border-cyan-500 px-4 py-2 text-sm text-cyan-400 transition hover:bg-cyan-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Mark Balance Paid
                            </button>
                          </>
                        )}

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
                        className="rounded-full border border-red-500 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Reject
                      </button>

                      <button
                        onClick={() =>
                          downloadInvoice(
                            booking
                          )
                        }
                        className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
                      >
                        Download Invoice
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          }
        )}

        {filteredBookings.length ===
          0 && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
            <p className="text-zinc-400">
              No bookings found.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}