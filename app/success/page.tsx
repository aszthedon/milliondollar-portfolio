export default function SuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="max-w-xl rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
        <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
          Payment Successful
        </p>

        <h1 className="text-5xl font-bold">
          Booking Confirmed
        </h1>

        <p className="mt-6 text-zinc-300">
          Your payment was successfully processed.
        </p>

        <p className="mt-2 text-zinc-400">
          A confirmation email and meeting details
          should arrive shortly.
        </p>

        <a
          href="/client"
          className="mt-10 inline-block rounded-full bg-white px-6 py-3 text-black transition hover:opacity-80"
        >
          Go To Client Dashboard
        </a>
      </div>
    </main>
  );
}