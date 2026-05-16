import Container from "./Container";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black py-10 text-white">
      <Container>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h3 className="text-lg font-semibold">
              Million Dollar Ticket Productions
            </h3>

            <p className="mt-2 text-sm text-zinc-400">
              Premium digital experiences for modern brands.
            </p>
          </div>

          <div className="flex gap-6 text-sm text-zinc-400">
            <a href="#">Instagram</a>
            <a href="#">TikTok</a>
            <a href="#">LinkedIn</a>
          </div>
        </div>
      </Container>
    </footer>
  );
}