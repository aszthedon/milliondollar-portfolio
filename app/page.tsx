import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
          Million Dollar Ticket Productions
        </p>

        <h1 className="max-w-4xl text-5xl font-bold leading-tight md:text-7xl">
          Premium Digital Experiences For Modern Brands
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-zinc-300">
          Websites, booking systems, multimedia production, and scalable
          digital platforms designed to elevate ambitious businesses.
        </p>

        <div className="mt-10 flex gap-4">
          <button className="rounded-full bg-white px-6 py-3 text-black transition hover:bg-zinc-200">
            View Services
          </button>

          <button className="rounded-full border border-white px-6 py-3 transition hover:bg-white hover:text-black">
            Contact Us
          </button>
        </div>
      </section>
    </main>
  );
}