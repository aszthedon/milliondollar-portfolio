"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

interface Booking {
  id: number;
  customer_email: string | null;
  booking_date: string | null;
  booking_time: string | null;
  booking_end_time: string | null;
  status: string | null;
  payment_status: string | null;
  created_at: string | null;
}

interface StatCard {
  label: string;
  value: number | string;
  description: string;
}

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [servicesCount, setServicesCount] = useState(0);
  const [availabilityCount, setAvailabilityCount] = useState(0);
  const [error, setError] = useState("");

  async function fetchDashboardData() {
    setError("");

    const { data: bookingsData, error: bookingsError } = await supabase
      .from("bookings")
      .select(
        "id, customer_email, booking_date, booking_time, booking_end_time, status, payment_status, created_at"
      )
      .order("created_at", {
        ascending: false,
      });

    if (bookingsError) {
      console.error("BOOKINGS FETCH ERROR:", bookingsError);
      setError("Some dashboard data could not be loaded.");
    } else if (bookingsData) {
      setBookings(bookingsData as Booking[]);
    }

    const { data: servicesData, error: servicesError } = await supabase
      .from("services")
      .select("id");

    if (servicesError) {
      console.error("SERVICES FETCH ERROR:", servicesError);
    } else {
      setServicesCount(servicesData?.length ?? 0);
    }

    const { data: availabilityData, error: availabilityError } = await supabase
      .from("availability")
      .select("id");

    if (availabilityError) {
      console.error("AVAILABILITY FETCH ERROR:", availabilityError);
    } else {
      setAvailabilityCount(availabilityData?.length ?? 0);
    }
  }

  useEffect(() => {
    async function loadDashboard() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      await fetchDashboardData();
      setLoading(false);
    }

    loadDashboard();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function getStatusCount(status: string) {
    return bookings.filter((booking) => booking.status === status).length;
  }

  function getPaymentCount(status: string) {
    return bookings.filter((booking) => booking.payment_status === status)
      .length;
  }

  function formatTime(time: string | null) {
    if (!time) return "Not set";

    const date = new Date(`1970-01-01T${time}`);

    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatDate(date: string | null) {
    if (!date) return "Not set";
    return date;
  }

  function statusClass(status: string | null) {
    if (status === "approved" || status === "confirmed") {
      return "border-green-500 text-green-400";
    }

    if (status === "completed") {
      return "border-blue-500 text-blue-400";
    }

    if (status === "cancelled") {
      return "border-zinc-500 text-zinc-400";
    }

    if (status === "rejected") {
      return "border-red-500 text-red-400";
    }

    if (status === "rescheduled") {
      return "border-yellow-500 text-yellow-400";
    }

    return "border-white/10 text-zinc-300";
  }

  const recentBookings = bookings.slice(0, 5);

  const statCards: StatCard[] = [
    {
      label: "Total Bookings",
      value: bookings.length,
      description: "All booking requests in the system.",
    },
    {
      label: "Pending",
      value: getStatusCount("pending"),
      description: "Bookings waiting for action.",
    },
    {
      label: "Approved",
      value: getStatusCount("approved"),
      description: "Bookings approved by admin.",
    },
    {
      label: "Confirmed",
      value: getStatusCount("confirmed"),
      description: "Bookings confirmed after successful payment.",
    },
    {
      label: "Completed",
      value: getStatusCount("completed"),
      description: "Finished client bookings.",
    },
    {
      label: "Cancelled",
      value: getStatusCount("cancelled"),
      description: "Bookings cancelled by client or admin.",
    },
    {
      label: "Rescheduled",
      value: getStatusCount("rescheduled"),
      description: "Bookings moved to another time.",
    },
    {
      label: "Paid",
      value: getPaymentCount("paid"),
      description: "Bookings marked as paid.",
    },
    {
      label: "Pending Payment",
      value: getPaymentCount("pending"),
      description: "Bookings awaiting payment.",
    },
    {
      label: "Services",
      value: servicesCount,
      description: "Active services in your template.",
    },
    {
      label: "Availability",
      value: availabilityCount,
      description: "Availability records currently saved.",
    },
  ];

  const quickActions = [
    {
      title: "Launch Checklist",
      description:
        "Track final testing, deployment, and launch preparation tasks.",
      href: "/dashboard/launch",
    },
    {
      title: "Manage Bookings",
      description:
        "Approve, reject, reschedule, and review booking requests.",
      href: "/dashboard/bookings",
    },
    {
      title: "Analytics",
      description:
        "Review revenue, paid bookings, conversion, and booking activity.",
      href: "/dashboard/analytics",
    },
    {
      title: "Manage Services",
      description:
        "Edit service names, prices, descriptions, and durations.",
      href: "/dashboard/services",
    },
    {
      title: "Service Variations",
      description:
        "Manage service packages, upgraded options, prices, and durations.",
      href: "/dashboard/variations",
    },
    {
      title: "Manage Availability",
      description:
        "Add availability windows for bookable days and times.",
      href: "/dashboard/availability",
    },
    {
      title: "Site Settings",
      description: "Edit homepage, branding content, and header buttons.",
      href: "/dashboard/settings",
    },
    {
      title: "SEO Settings",
      description:
        "Edit page title, search description, keywords, and social preview.",
      href: "/dashboard/seo",
    },
    {
      title: "Navigation",
      description:
        "Edit public menu links, labels, order, visibility, and external links.",
      href: "/dashboard/navigation",
    },
    {
      title: "Footer",
      description:
        "Edit footer branding, contact details, social links, and copyright.",
      href: "/dashboard/footer",
    },
    {
      title: "CTA Section",
      description:
        "Edit the final call-to-action section shown near the bottom of the public website.",
      href: "/dashboard/cta",
    },
    {
      title: "Contact",
      description:
        "Edit the public contact form and review incoming inquiries.",
      href: "/dashboard/contact",
    },
    {
      title: "Process",
      description:
        "Edit the public How It Works steps shown on the website.",
      href: "/dashboard/process",
    },
    {
      title: "FAQs",
      description:
        "Add and manage frequently asked questions shown on the public website.",
      href: "/dashboard/faqs",
    },
    {
      title: "Testimonials",
      description:
        "Add and manage client reviews shown on the public website.",
      href: "/dashboard/testimonials",
    },
    {
      title: "Gallery",
      description: "Upload and manage portfolio images.",
      href: "/dashboard/gallery",
    },
    {
      title: "Messages",
      description: "Review client messages and booking communication.",
      href: "/dashboard/messages",
    },
    {
      title: "Files",
      description: "Manage client files and uploaded project documents.",
      href: "/dashboard/files",
    },
    {
      title: "Notifications",
      description: "View reminders, booking updates, and platform alerts.",
      href: "/dashboard/notifications",
    },
    {
      title: "Client Portal",
      description: "View the client-facing dashboard experience.",
      href: "/client",
    },
  ];

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            Loading
          </p>

          <h1 className="mt-4 text-3xl font-bold">
            Preparing Dashboard...
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
            Million Dollar Ticket Productions
          </p>

          <h1 className="text-5xl font-bold">Dashboard</h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            Manage bookings, services, availability, launch prep, SEO, contact
            inquiries, footer content, CTA content, navigation, process steps,
            FAQs, testimonials, analytics, and client activity from one central
            admin hub.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-full bg-white px-6 py-3 text-black transition hover:bg-zinc-200"
        >
          Logout
        </button>
      </div>

      {error && (
        <div className="mt-8 rounded-3xl border border-red-500 bg-red-500/10 p-6 text-red-300">
          {error}
        </div>
      )}

      <section className="mt-12">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
              Overview
            </p>

            <h2 className="mt-2 text-3xl font-bold">Platform Analytics</h2>
          </div>

          <button
            onClick={fetchDashboardData}
            className="rounded-full border border-white/10 px-5 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
          >
            Refresh
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-3xl border border-white/10 bg-white/5 p-6"
            >
              <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                {card.label}
              </p>

              <h3 className="mt-4 text-4xl font-bold">{card.value}</h3>

              <p className="mt-3 text-sm text-zinc-400">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            Admin Tools
          </p>

          <h2 className="mt-2 text-3xl font-bold">Quick Actions</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-3xl border border-white/10 bg-white/5 p-8 transition hover:bg-white/10"
            >
              <h3 className="text-2xl font-semibold">{action.title}</h3>

              <p className="mt-4 text-zinc-400">{action.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
              Activity
            </p>

            <h2 className="mt-2 text-3xl font-bold">Recent Bookings</h2>
          </div>

          <Link
            href="/dashboard/bookings"
            className="rounded-full border border-white/10 px-5 py-2 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
          >
            View All Bookings
          </Link>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          {recentBookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-left text-sm uppercase tracking-[0.2em] text-zinc-500">
                    <th className="px-6 py-4">Client</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Time</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Payment</th>
                  </tr>
                </thead>

                <tbody>
                  {recentBookings.map((booking) => (
                    <tr
                      key={booking.id}
                      className="border-b border-white/5 last:border-0"
                    >
                      <td className="px-6 py-5">
                        <div>
                          <p className="font-medium">
                            {booking.customer_email ?? "No email"}
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            Booking #{booking.id}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-zinc-300">
                        {formatDate(booking.booking_date)}
                      </td>

                      <td className="px-6 py-5 text-zinc-300">
                        {formatTime(booking.booking_time)}

                        {booking.booking_end_time && (
                          <>
                            {" — "}
                            {formatTime(booking.booking_end_time)}
                          </>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${statusClass(
                            booking.status
                          )}`}
                        >
                          {booking.status ?? "unknown"}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.15em] text-zinc-300">
                          {booking.payment_status ?? "unknown"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center">
              <p className="text-zinc-400">No recent bookings found.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}