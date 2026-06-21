"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/lib/supabase";

interface Booking {
  id: number;
  service_id: number | null;
  payment_status: string | null;
  status: string | null;
  booking_date: string | null;
  booking_time: string | null;
  booking_end_time: string | null;
  notes: string | null;
  created_at: string | null;
  price_paid: number | null;
}

interface Service {
  id: number;
  title: string | null;
  price: number | null;
}

interface Variation {
  id: number;
  service_id: number | null;
  variation_name: string | null;
  price: number | null;
}

interface RevenueChartData {
  date: string;
  revenue: number;
}

interface StatusChartData {
  status: string;
  count: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }
  ).format(value);
}

function formatDate(date: string | null) {
  if (!date) {
    return "Unknown";
  }

  const parts = date.split("-");

  if (parts.length !== 3) {
    return date;
  }

  const [year, month, day] =
    parts;

  return `${month}/${day}/${year}`;
}

function getVariationIdFromNotes(
  notes: string | null
) {
  if (!notes) {
    return null;
  }

  const match =
    notes.match(
      /Variation ID:\s*(\d+)/i
    );

  if (!match) {
    return null;
  }

  return Number(match[1]);
}

export default function AnalyticsPage() {
  const [mounted, setMounted] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [services, setServices] =
    useState<Service[]>([]);

  const [variations, setVariations] =
    useState<Variation[]>([]);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      setError("");

      const [
        bookingsResponse,
        servicesResponse,
        variationsResponse,
      ] = await Promise.all([
        supabase
          .from("bookings")
          .select(
            `
              id,
              service_id,
              payment_status,
              status,
              booking_date,
              booking_time,
              booking_end_time,
              notes,
              created_at,
              price_paid
            `
          )
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("services")
          .select(
            `
              id,
              title,
              price
            `
          ),

        supabase
          .from("service_variations")
          .select(
            `
              id,
              service_id,
              variation_name,
              price
            `
          ),
      ]);

      if (bookingsResponse.error) {
        throw bookingsResponse.error;
      }

      if (servicesResponse.error) {
        throw servicesResponse.error;
      }

      if (variationsResponse.error) {
        throw variationsResponse.error;
      }

      setBookings(
        (bookingsResponse.data ??
          []) as Booking[]
      );

      setServices(
        (servicesResponse.data ??
          []) as Service[]
      );

      setVariations(
        (variationsResponse.data ??
          []) as Variation[]
      );
    } catch (error) {
      console.error(
        "ANALYTICS FETCH ERROR:",
        error
      );

      setError(
        "Analytics could not be loaded right now."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    fetchAnalytics();
  }, []);

  const serviceMap =
    useMemo(() => {
      const map =
        new Map<number, Service>();

      services.forEach((service) => {
        map.set(
          service.id,
          service
        );
      });

      return map;
    }, [services]);

  const variationMap =
    useMemo(() => {
      const map =
        new Map<number, Variation>();

      variations.forEach(
        (variation) => {
          map.set(
            variation.id,
            variation
          );
        }
      );

      return map;
    }, [variations]);

  function getBookingRevenue(
    booking: Booking
  ) {
    if (
      booking.payment_status !==
      "paid"
    ) {
      return 0;
    }

    if (
      booking.price_paid !==
        null &&
      booking.price_paid !==
        undefined
    ) {
      return Number(
        booking.price_paid
      );
    }

    const variationId =
      getVariationIdFromNotes(
        booking.notes
      );

    if (variationId) {
      const variation =
        variationMap.get(
          variationId
        );

      if (
        variation?.price !==
          null &&
        variation?.price !==
          undefined
      ) {
        return Number(
          variation.price
        );
      }
    }

    if (booking.service_id) {
      const service =
        serviceMap.get(
          booking.service_id
        );

      if (
        service?.price !==
          null &&
        service?.price !==
          undefined
      ) {
        return Number(
          service.price
        );
      }
    }

    return 0;
  }

  const totalBookings =
    bookings.length;

  const paidBookings =
    bookings.filter(
      (booking) =>
        booking.payment_status ===
        "paid"
    ).length;

  const confirmedBookings =
    bookings.filter(
      (booking) =>
        booking.status ===
        "confirmed"
    ).length;

  const cancelledBookings =
    bookings.filter(
      (booking) =>
        booking.status ===
          "cancelled" ||
        booking.status ===
          "rejected"
    ).length;

  const pendingBookings =
    bookings.filter(
      (booking) =>
        booking.status ===
          "pending" ||
        !booking.status
    ).length;

  const estimatedRevenue =
    bookings.reduce(
      (total, booking) =>
        total +
        getBookingRevenue(booking),
      0
    );

  const averageBookingValue =
    paidBookings > 0
      ? estimatedRevenue /
        paidBookings
      : 0;

  const conversionRate =
    totalBookings > 0
      ? Math.round(
          (paidBookings /
            totalBookings) *
            100
        )
      : 0;

  const revenueChartData =
    useMemo<RevenueChartData[]>(
      () => {
        const revenueMap:
          Record<string, number> = {};

        bookings.forEach(
          (booking) => {
            if (
              booking.payment_status !==
              "paid"
            ) {
              return;
            }

            const date =
              booking.booking_date ??
              booking.created_at?.slice(
                0,
                10
              ) ??
              "Unknown";

            if (!revenueMap[date]) {
              revenueMap[date] = 0;
            }

            revenueMap[date] +=
              getBookingRevenue(
                booking
              );
          }
        );

        return Object.entries(
          revenueMap
        )
          .map(
            ([
              date,
              revenue,
            ]) => ({
              date:
                date ===
                "Unknown"
                  ? "Unknown"
                  : formatDate(
                      date
                    ),
              revenue,
            })
          )
          .sort((a, b) =>
            a.date.localeCompare(
              b.date
            )
          );
      },
      [
        bookings,
        serviceMap,
        variationMap,
      ]
    );

  const statusChartData =
    useMemo<StatusChartData[]>(
      () => [
        {
          status: "Paid",
          count: paidBookings,
        },
        {
          status: "Confirmed",
          count: confirmedBookings,
        },
        {
          status: "Pending",
          count: pendingBookings,
        },
        {
          status: "Cancelled",
          count: cancelledBookings,
        },
      ],
      [
        paidBookings,
        confirmedBookings,
        pendingBookings,
        cancelledBookings,
      ]
    );

  const recentPaidBookings =
    bookings
      .filter(
        (booking) =>
          booking.payment_status ===
          "paid"
      )
      .slice(0, 5);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white md:px-10">
      <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
            Dashboard
          </p>

          <h1 className="text-5xl font-bold">
            Analytics
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            Track bookings, paid revenue, conversion, and recent client activity.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="rounded-full border border-white/10 px-6 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Refreshing..."
            : "Refresh Analytics"}
        </button>
      </div>

      {error && (
        <div className="mb-8 rounded-3xl border border-red-500 bg-red-500/10 p-5 text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">
            Total Bookings
          </p>

          <h2 className="mt-4 text-5xl font-bold">
            {totalBookings}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">
            Paid Bookings
          </p>

          <h2 className="mt-4 text-5xl font-bold text-green-400">
            {paidBookings}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">
            Conversion
          </p>

          <h2 className="mt-4 text-5xl font-bold text-blue-400">
            {conversionRate}%
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">
            Revenue
          </p>

          <h2 className="mt-4 text-5xl font-bold text-purple-400">
            {formatCurrency(
              estimatedRevenue
            )}
          </h2>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">
            Confirmed
          </p>

          <h2 className="mt-4 text-4xl font-bold text-green-300">
            {confirmedBookings}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">
            Pending
          </p>

          <h2 className="mt-4 text-4xl font-bold text-yellow-300">
            {pendingBookings}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">
            Avg. Booking Value
          </p>

          <h2 className="mt-4 text-4xl font-bold text-blue-300">
            {formatCurrency(
              averageBookingValue
            )}
          </h2>
        </div>
      </div>

      <div className="mt-10 grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">
              Revenue Growth
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              Revenue Overview
            </h2>
          </div>

          <div className="h-[360px] min-h-[360px] min-w-0">
            {mounted &&
            revenueChartData.length >
              0 ? (
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
              >
                <BarChart
                  data={
                    revenueChartData
                  }
                  margin={{
                    top: 10,
                    right: 10,
                    left: 0,
                    bottom: 20,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    opacity={0.15}
                  />

                  <XAxis
                    dataKey="date"
                    tick={{
                      fill: "#a1a1aa",
                      fontSize: 12,
                    }}
                  />

                  <YAxis
                    tick={{
                      fill: "#a1a1aa",
                      fontSize: 12,
                    }}
                    tickFormatter={(
                      value
                    ) => `$${value}`}
                  />

                  <Tooltip
                    cursor={{
                      fill: "rgba(255,255,255,0.06)",
                    }}
                    contentStyle={{
                      background:
                        "#09090b",
                      border:
                        "1px solid rgba(255,255,255,0.12)",
                      borderRadius:
                        "16px",
                      color: "#fff",
                    }}
                    formatter={(
                      value
                    ) => [
                      formatCurrency(
                        Number(value)
                      ),
                      "Revenue",
                    ]}
                  />

                  <Bar
                    dataKey="revenue"
                    radius={[
                      8, 8, 0, 0,
                    ]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-white/10 bg-black/30 text-center text-zinc-500">
                No paid revenue data yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">
              Booking Status
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              Status Overview
            </h2>
          </div>

          <div className="h-[360px] min-h-[360px] min-w-0">
            {mounted &&
            statusChartData.some(
              (item) =>
                item.count > 0
            ) ? (
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
              >
                <BarChart
                  data={
                    statusChartData
                  }
                  margin={{
                    top: 10,
                    right: 10,
                    left: 0,
                    bottom: 20,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    opacity={0.15}
                  />

                  <XAxis
                    dataKey="status"
                    tick={{
                      fill: "#a1a1aa",
                      fontSize: 12,
                    }}
                  />

                  <YAxis
                    allowDecimals={
                      false
                    }
                    tick={{
                      fill: "#a1a1aa",
                      fontSize: 12,
                    }}
                  />

                  <Tooltip
                    cursor={{
                      fill: "rgba(255,255,255,0.06)",
                    }}
                    contentStyle={{
                      background:
                        "#09090b",
                      border:
                        "1px solid rgba(255,255,255,0.12)",
                      borderRadius:
                        "16px",
                      color: "#fff",
                    }}
                  />

                  <Bar
                    dataKey="count"
                    radius={[
                      8, 8, 0, 0,
                    ]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-white/10 bg-black/30 text-center text-zinc-500">
                No booking status data yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">
            Recent Paid Bookings
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            Latest Revenue Activity
          </h2>
        </div>

        {recentPaidBookings.length ===
        0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-black/30 p-8 text-center text-zinc-500">
            No paid bookings yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-white/10">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead className="bg-white/5 text-sm uppercase tracking-[0.2em] text-zinc-500">
                <tr>
                  <th className="p-4">
                    Booking
                  </th>

                  <th className="p-4">
                    Date
                  </th>

                  <th className="p-4">
                    Status
                  </th>

                  <th className="p-4">
                    Price Paid
                  </th>
                </tr>
              </thead>

              <tbody>
                {recentPaidBookings.map(
                  (booking) => (
                    <tr
                      key={booking.id}
                      className="border-t border-white/10"
                    >
                      <td className="p-4 font-semibold">
                        #{booking.id}
                      </td>

                      <td className="p-4 text-zinc-300">
                        {formatDate(
                          booking.booking_date
                        )}
                      </td>

                      <td className="p-4">
                        <span className="rounded-full border border-green-500 bg-green-500/10 px-3 py-1 text-sm capitalize text-green-300">
                          {booking.status ??
                            "confirmed"}
                        </span>
                      </td>

                      <td className="p-4 font-semibold text-green-300">
                        {formatCurrency(
                          getBookingRevenue(
                            booking
                          )
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}