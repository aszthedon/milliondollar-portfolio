export default function SuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-12 text-center">
        <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
          Payment Successful
        </p>

        <h1 className="text-5xl font-bold">
          Booking Confirmed
        </h1>

        <p className="mt-6 text-lg text-zinc-300">
          Your booking request and payment
          have been successfully submitted.
        </p>

        <a
          href="/"
          className="mt-10 inline-flex rounded-full bg-white px-8 py-4 text-black"
        >
          Return Home
        </a>
      </div>
    </main>
  );
}