export default function RoadmapPage() {
  const roadmap = [
    {
      status: "Completed",
      title: "Dynamic Website Content",
    },
    {
      status: "Completed",
      title: "Booking Platform",
    },
    {
      status: "Completed",
      title: "Client Portal",
    },
    {
      status: "In Progress",
      title: "Multi-Industry Templates",
    },
    {
      status: "Planned",
      title: "White Label Licensing",
    },
    {
      status: "Planned",
      title: "Team Accounts",
    },
    {
      status: "Planned",
      title: "CRM Integration",
    },
    {
      status: "Planned",
      title: "Email Marketing Tools",
    },
  ];

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-24">
        <h1 className="text-5xl font-bold">
          Product Roadmap
        </h1>

        <p className="mt-4 text-zinc-400">
          Follow the development of the Million Dollar Portfolio
          platform and upcoming features.
        </p>

        <div className="mt-12 space-y-6">
          {roadmap.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 p-6"
            >
              <p className="text-sm text-purple-400">
                {item.status}
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                {item.title}
              </h2>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
