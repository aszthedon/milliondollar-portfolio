"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

import Container from "./Container";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur">
      <Container>
        <div className="flex items-center justify-between py-4">
          <h1 className="text-lg font-semibold uppercase tracking-[0.2em] text-white">
            MDT Productions
          </h1>

          <div className="hidden gap-8 md:flex">
            <a
              href="#home"
              className="text-sm text-zinc-300 hover:text-white"
            >
              Home
            </a>

            <a
              href="#services"
              className="text-sm text-zinc-300 hover:text-white"
            >
              Services
            </a>

            <a
              href="#portfolio"
              className="text-sm text-zinc-300 hover:text-white"
            >
              Portfolio
            </a>

            <a
              href="#contact"
              className="text-sm text-zinc-300 hover:text-white"
            >
              Contact
            </a>
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-white md:hidden"
          >
            {menuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {menuOpen && (
          <div className="flex flex-col gap-6 border-t border-white/10 py-6 md:hidden">
            <a
              href="#home"
              className="text-zinc-300 hover:text-white"
            >
              Home
            </a>

            <a
              href="#services"
              className="text-zinc-300 hover:text-white"
            >
              Services
            </a>

            <a
              href="#portfolio"
              className="text-zinc-300 hover:text-white"
            >
              Portfolio
            </a>

            <a
              href="#contact"
              className="text-zinc-300 hover:text-white"
            >
              Contact
            </a>
          </div>
        )}
      </Container>
    </nav>
  );
}