"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { supabase } from "@/lib/supabase";

interface Booking {
  id: number;
  payment_status: string;
  status: string;
  booking_date: string;
  notes: string;
}

interface Variation {
  id: number;
  price: number;
}

interface ChartData {
  date: string;
  revenue: number;
}

export default function AnalyticsPage() {
  const [totalBookings, setTotalBookings] =
    useState(0);

  const [paidBookings, setPaidBookings] =
    useState(0);

  const [cancelledBookings, setCancelledBookings] =
    useState(0);

  const [estimatedRevenue, setEstimatedRevenue] =
    useState(0);

  const [chartData, setChartData] =
    useState<ChartData[]>([]);

  async function fetchAnalytics() {
    const { data: bookings } =
      await supabase
        .from("bookings")
        .select("*");

    const { data: variations } =
      await supabase
        .from("service_variations")
        .select("*");

    if (!bookings || !variations) return;

    setTotalBookings(
      bookings.length
    );

    setPaidBookings(
      bookings.filter(
        (booking) =>
          booking.payment_status ===
          "paid"
      ).length
    );

    setCancelledBookings(
      bookings.filter(
        (booking) =>
          booking.status ===
          "cancelled"
      ).length
    );

    let revenue = 0;

    const revenueMap:
      Record<
        string,
        number
      > = {};

    bookings.forEach((booking) => {
      const variationIdMatch =
        booking.notes.match(
          /Variation ID: (\d+)/
        );

      if (!variationIdMatch)
        return;

      const variationId =
        Number(
          variationIdMatch[1]
        );

      const variation =
        variations.find(
          (v) =>
            v.id === variationId
        );

      if (
        variation &&
        booking.payment_status ===
          "paid"
      ) {
        revenue += variation.price;

        if (
          !revenueMap[
            booking.booking_date
          ]
        ) {
          revenueMap[
            booking.booking_date
          ] = 0;
        }

        revenueMap[
          booking.booking_date
        ] += variation.price;
      }
    });

    setEstimatedRevenue(
      revenue
    );

    const formattedChartData =
      Object.entries(
        revenueMap
      ).map(
        ([date, revenue]) => ({
          date,
          revenue,
        })
      );

    setChartData(
      formattedChartData
    );
  }

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <div className="mb-12">
        <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
          Dashboard
        </p>

        <h1 className="text-5xl font-bold">
          Analytics
        </h1>
      </div>

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
            Cancelled
          </p>

          <h2 className="mt-4 text-5xl font-bold text-red-400">
            {cancelledBookings}
          </h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">
            Revenue
          </p>

          <h2 className="mt-4 text-5xl font-bold text-blue-400">
            $
            {estimatedRevenue}
          </h2>
        </div>
      </div>

      <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">
            Revenue Growth
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            Revenue Overview
          </h2>
        </div>

        <div className="h-[400px]">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={chartData}
            >
              <XAxis
                dataKey="date"
              />

              <YAxis />

              <Tooltip />

              <Bar
                dataKey="revenue"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  );
}