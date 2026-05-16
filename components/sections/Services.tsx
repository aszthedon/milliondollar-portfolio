import Container from "../Container";
import FadeIn from "../FadeIn";

const services = [
  {
    title: "Website Development",
    description:
      "Modern, responsive websites built for performance and brand elevation.",
  },
  {
    title: "Booking Systems",
    description:
      "Custom scheduling platforms with dashboards, automation, and client management.",
  },
  {
    title: "Multimedia Production",
    description:
      "Creative visuals, digital storytelling, and cinematic brand experiences.",
  },
  {
    title: "Brand Strategy",
    description:
      "Positioning businesses with premium digital identity and direction.",
  },
];

export default function Services() {
  return (
    <FadeIn>
      <section
        id="services"
        className="bg-black py-32 text-white"
      >
        <Container>
          <div className="mb-16 max-w-2xl">
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
              Services
            </p>

            <h2 className="text-4xl font-bold md:text-5xl">
              Built For Modern Businesses
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {services.map((service) => (
              <div
                key={service.title}
                className="rounded-3xl border border-white/10 bg-white/5 p-8 transition duration-300 hover:-translate-y-2 hover:border-white/20 hover:bg-white/10"
              >
                <h3 className="mb-4 text-2xl font-semibold">
                  {service.title}
                </h3>

                <p className="leading-relaxed text-zinc-300">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </FadeIn>
  );
}