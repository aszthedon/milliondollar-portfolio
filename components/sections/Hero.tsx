import Container from "../Container";
import Button from "../ui/Button";

export default function Hero() {
  return (
    <section
      id="home"
      className="relative flex min-h-screen items-center overflow-hidden bg-black text-white"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_40%)]" />

      <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />

      <div className="absolute right-0 top-0 h-[300px] w-[300px] rounded-full bg-purple-500/20 blur-3xl" />

      <Container>
        <div className="relative z-10 max-w-4xl py-40">
          <p className="mb-6 text-sm uppercase tracking-[0.4em] text-zinc-400">
            Million Dollar Ticket Productions
          </p>

          <h1 className="text-5xl font-bold leading-tight md:text-7xl">
            Premium Digital Experiences For Ambitious Brands
          </h1>

          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-zinc-300">
            We build modern websites, booking systems, multimedia experiences,
            and scalable digital platforms designed to elevate businesses into
            unforgettable brands.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Button variant="primary">
              View Services
            </Button>

            <Button variant="secondary">
              Start A Project
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}