export default function DemoPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-24 text-white">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-5xl font-bold">
          Live Demo Access
        </h1>

        <p className="mt-6 text-zinc-400">
          Explore the platform using the demo
          account below.
        </p>

        <div className="mt-10 rounded-3xl border border-white/10 p-8">
          <p>
            Email:
            demo@milliondollarportfolio.com
          </p>

          <p className="mt-3">
            Password:
            DemoPassword123!
          </p>
        </div>
      </div>
    </main>
  );
}