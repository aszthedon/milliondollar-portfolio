import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomepageRenderer from "@/components/HomepageRenderer";

export default function Home() {
  return (
    <main className="relative overflow-hidden bg-black text-white">
      <div className="absolute left-[-200px] top-[300px] h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-3xl" />
      <div className="absolute right-[-200px] top-[900px] h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-3xl" />
      <Navbar />
      <HomepageRenderer />
      <Footer />
    </main>
  );
}
