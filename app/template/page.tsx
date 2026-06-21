export default function TemplatePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto max-w-6xl px-6 py-32">
        <div className="max-w-3xl">
          <p className="mb-4 uppercase tracking-[0.3em] text-zinc-500">
            Website Template
          </p>

          <h1 className="text-6xl font-bold">
            Creative Business Platform
          </h1>

          <p className="mt-8 text-xl text-zinc-300">
            More than a portfolio.
            A complete booking, client management,
            and content management platform for
            creative professionals.
          </p>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-3">

          <div className="rounded-3xl border border-white/10 p-8">
            <h3 className="text-2xl font-semibold">
              Booking System
            </h3>

            <p className="mt-4 text-zinc-400">
              Integrated scheduling and calendar management.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 p-8">
            <h3 className="text-2xl font-semibold">
              Client Portal
            </h3>

            <p className="mt-4 text-zinc-400">
              Secure file sharing and communication.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 p-8">
            <h3 className="text-2xl font-semibold">
              Dashboard CMS
            </h3>

            <p className="mt-4 text-zinc-400">
              Manage services, gallery, branding and content.
            </p>
          </div>

        </div>

        <div className="mt-20 rounded-3xl border border-purple-500/20 bg-purple-500/5 p-12">

          <h2 className="text-4xl font-bold">
            Everything Included
          </h2>

          <ul className="mt-8 space-y-4 text-zinc-300">
            <li>✓ Next.js</li>
            <li>✓ Supabase</li>
            <li>✓ Stripe</li>
            <li>✓ Booking System</li>
            <li>✓ Client Portal</li>
            <li>✓ File Uploads</li>
            <li>✓ Dynamic Services</li>
            <li>✓ Dynamic Gallery</li>
            <li>✓ Dynamic Branding</li>
            <li>✓ Authentication</li>
          </ul>

        </div>
      </section>
    </main>
  );
}