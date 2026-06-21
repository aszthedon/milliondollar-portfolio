import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import Hero from "@/components/sections/Hero";
import Services from "@/components/sections/Services";
import Process from "@/components/sections/Process";
import FeaturedWork from "@/components/sections/FeaturedWork";
import Gallery from "@/components/sections/Gallery";
import Booking from "@/components/sections/Booking";
import Testimonials from "@/components/sections/Testimonials";
import FAQ from "@/components/sections/FAQ";
import CTA from "@/components/sections/CTA";

export default function Home() {
  return (
    <main className="relative overflow-hidden bg-black text-white">
      <div className="absolute left-[-200px] top-[300px] h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-3xl" />

      <div className="absolute right-[-200px] top-[900px] h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-3xl" />

      <Navbar />

      <Hero />

      <Services />

      <Process />

      <FeaturedWork />

      <Gallery />

      <Booking />

      <Testimonials />

      <FAQ />

      <CTA />

      <Footer />
    </main>
  );
}