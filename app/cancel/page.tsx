export default function CancelPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-12 text-center">
        <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
          Payment Cancelled
        </p>

        <h1 className="text-5xl font-bold">
          Checkout Incomplete
        </h1>

        <p className="mt-6 text-lg text-zinc-300">
          Your payment was not completed.
          You may return and try again.
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