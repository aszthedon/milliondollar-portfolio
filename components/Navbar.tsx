export default function Navbar() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <h1 className="text-lg font-semibold tracking-wide text-white">
          Million Dollar Ticket Productions
        </h1>

        <div className="hidden gap-6 md:flex">
          <a href="#" className="text-sm text-zinc-300 hover:text-white">
            Home
          </a>

          <a href="#" className="text-sm text-zinc-300 hover:text-white">
            Services
          </a>

          <a href="#" className="text-sm text-zinc-300 hover:text-white">
            Portfolio
          </a>

          <a href="#" className="text-sm text-zinc-300 hover:text-white">
            Contact
          </a>
        </div>
      </div>
    </nav>
  );
}