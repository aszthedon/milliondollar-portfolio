import Container from "../Container";
import FadeIn from "../FadeIn";
import Button from "../ui/Button";

export default function CTA() {
  return (
    <FadeIn>
      <section
        id="contact"
        className="bg-black py-32 text-white"
      >
        <Container>
          <div className="rounded-[40px] border border-white/10 bg-white/5 px-8 py-20 text-center md:px-16">
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
              Start Your Project
            </p>

            <h2 className="mx-auto max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
              Build A Brand That People Remember
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-300">
              We partner with ambitious businesses to create premium digital
              experiences that elevate visibility, trust, and growth.
            </p>

            <div className="mt-10">
              <Button variant="primary">
                Book A Consultation
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </FadeIn>
  );
}