import Link from "next/link";

const quickActions = [
  {
    title: "Launch Checklist",
    description:
      "Track the final steps needed before handing this site to a client or launching publicly.",
    href: "/dashboard/launch",
  },
  {
    title: "Manage Bookings",
    description:
      "Review bookings, payment status, deposits, discounts, tips, balances, meeting links, and invoices.",
    href: "/dashboard/bookings",
  },
  {
    title: "Invoices",
    description:
      "Create standalone payment requests, custom invoices, tips, add-ons, and final balance links.",
    href: "/dashboard/invoices",
  },
  {
    title: "Contracts",
    description:
      "Create contract templates, send signing links, track viewed/signed agreements, and download signed PDFs.",
    href: "/dashboard/contracts",
  },
  {
    title: "Projects",
    description:
      "Manage media projects, deliverables, production status, delivery links, project balances, and internal updates.",
    href: "/dashboard/projects",
  },
  {
    title: "Client CRM",
    description:
      "Manage client records, contact info, notes, status, booking history, invoice history, contracts, and projects.",
    href: "/dashboard/clients",
  },
  {
    title: "Analytics",
    description:
      "View revenue, bookings, invoices, contracts, projects, tips, balances, and business trends.",
    href: "/dashboard/analytics",
  },
  {
    title: "Manage Services",
    description:
      "Create and edit core services, pricing, descriptions, and default durations.",
    href: "/dashboard/services",
  },
  {
    title: "Service Variations",
    description:
      "Create packages, add duration-based pricing, and set full payment or deposit-only checkout.",
    href: "/dashboard/variations",
  },
  {
    title: "Discount Codes",
    description:
      "Create promo codes, launch discounts, usage limits, expiration dates, and active/inactive offers.",
    href: "/dashboard/discounts",
  },
  {
    title: "Manage Availability",
    description:
      "Open, close, and organize booking windows by date, time, and recurring availability.",
    href: "/dashboard/availability",
  },
  {
    title: "Site Settings",
    description:
      "Update business name, hero text, buttons, header branding, and global homepage settings.",
    href: "/dashboard/settings",
  },
  {
    title: "SEO Settings",
    description:
      "Prepare title, description, keywords, social preview text, and search engine metadata.",
    href: "/dashboard/seo",
  },
  {
    title: "Navigation",
    description:
      "Manage header links, menu order, public navigation, and visible site sections.",
    href: "/dashboard/navigation",
  },
  {
    title: "Footer",
    description:
      "Edit footer branding, contact details, social links, copyright, and business info.",
    href: "/dashboard/footer",
  },
  {
    title: "CTA Section",
    description:
      "Update your homepage call-to-action section, conversion copy, and action buttons.",
    href: "/dashboard/cta",
  },
  {
    title: "Contact",
    description:
      "Manage contact section content and review client inquiries sent from the public site.",
    href: "/dashboard/contact",
  },
  {
    title: "Process",
    description:
      "Edit the how-it-works steps that explain your client booking and project process.",
    href: "/dashboard/process",
  },
  {
    title: "FAQs",
    description:
      "Add and organize frequently asked questions for clients before they book.",
    href: "/dashboard/faqs",
  },
  {
    title: "Testimonials",
    description:
      "Manage reviews, client quotes, ratings, and social proof across your homepage.",
    href: "/dashboard/testimonials",
  },
  {
    title: "Gallery",
    description:
      "Upload and organize portfolio images, project examples, and featured work.",
    href: "/dashboard/gallery",
  },
  {
    title: "Messages",
    description:
      "Review client messages connected to bookings, projects, or dashboard communication.",
    href: "/dashboard/messages",
  },
  {
    title: "Files",
    description:
      "View client-uploaded files, project assets, and supporting materials.",
    href: "/dashboard/files",
  },
  {
    title: "Notifications",
    description:
      "Review booking alerts, reminders, client updates, and internal dashboard notices.",
    href: "/dashboard/notifications",
  },
  {
    title: "Client Portal",
    description:
      "Open the public-facing client portal to review the experience from a customer view.",
    href: "/client",
  },
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white md:px-10">
      <section className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-500">
              Million Dollar Dashboard
            </p>

            <h1 className="max-w-4xl text-5xl font-bold leading-tight md:text-7xl">
              Business Control Center
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
              Manage bookings, payments, invoices, contracts, projects, client
              CRM, website content, deposits, discounts, tips, balances, launch
              readiness, and business operations from one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white hover:text-black"
            >
              View Website
            </Link>

            <Link
              href="/#booking"
              className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
            >
              Test Booking
            </Link>
          </div>
        </div>

        <div className="mb-10 grid gap-5 md:grid-cols-2 xl:grid-cols-7">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">
              Core
            </p>

            <h2 className="mt-3 text-3xl font-bold">
              Booking
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Services, availability, bookings, deposits, discounts, Stripe, and
              Google Meet.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">
              Money
            </p>

            <h2 className="mt-3 text-3xl font-bold">
              Payments
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Paid bookings, standalone invoices, tips, discounts, and final
              balance links.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">
              Legal
            </p>

            <h2 className="mt-3 text-3xl font-bold">
              Contracts
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Agreement templates, client signing links, signed PDFs, and
              signature tracking.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">
              Work
            </p>

            <h2 className="mt-3 text-3xl font-bold">
              Projects
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Production boards, deliverables, client updates, delivery links,
              and project status.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">
              Clients
            </p>

            <h2 className="mt-3 text-3xl font-bold">
              CRM
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Client records, notes, statuses, history, paid totals, and
              outstanding balances.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">
              Brand
            </p>

            <h2 className="mt-3 text-3xl font-bold">
              Website
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Homepage sections, SEO, navigation, footer, testimonials, FAQs,
              contact, and gallery.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">
              Launch
            </p>

            <h2 className="mt-3 text-3xl font-bold">
              Ready
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Final checklist, production testing, and client-ready polish before
              delivery.
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded-3xl border border-white/10 bg-white/5 p-7 transition hover:-translate-y-1 hover:border-white/30 hover:bg-white/10"
            >
              <div className="flex items-start justify-between gap-5">
                <div>
                  <h2 className="text-2xl font-semibold">
                    {action.title}
                  </h2>

                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                    {action.description}
                  </p>
                </div>

                <span className="rounded-full border border-white/10 px-3 py-1 text-sm text-zinc-400 transition group-hover:bg-white group-hover:text-black">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}