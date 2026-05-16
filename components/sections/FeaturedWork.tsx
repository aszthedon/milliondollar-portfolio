import Container from "../Container";
import FadeIn from "../FadeIn";

const projects = [
  {
    title: "Luxury Salon Booking Platform",
    category: "Web Development",
  },
  {
    title: "Creative Agency Portfolio",
    category: "Brand Experience",
  },
  {
    title: "Client Dashboard System",
    category: "Automation",
  },
];

export default function FeaturedWork() {
  return (
    <FadeIn>
      <section
        id="portfolio"
        className="bg-zinc-950 py-32 text-white"
      >
        <Container>
          <div className="mb-16 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
                Featured Work
              </p>

              <h2 className="max-w-2xl text-4xl font-bold md:text-5xl">
                Designed To Leave A Lasting Impression
              </h2>
            </div>

            <button className="rounded-full border border-white/20 px-6 py-3 text-sm transition hover:bg-white hover:text-black">
              View All Projects
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.title}
                className="group overflow-hidden rounded-3xl border border-white/10 bg-black transition duration-300 hover:-translate-y-2"
              >
                <div className="h-80 bg-gradient-to-br from-zinc-800 to-zinc-950 transition duration-500 group-hover:scale-105" />

                <div className="p-6">
                  <p className="mb-2 text-sm uppercase tracking-[0.2em] text-zinc-500">
                    {project.category}
                  </p>

                  <h3 className="text-2xl font-semibold">
                    {project.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </FadeIn>
  );
}