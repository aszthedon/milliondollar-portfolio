"use client";

import { useEffect, useState } from "react";

import Container from "../Container";
import FadeIn from "../FadeIn";

interface GalleryImage {
  id: string;
  image_url: string;
  alt_text?: string | null;
  title?: string | null;
  description?: string | null;
  source?: string;
}

export default function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [heading, setHeading] = useState("Gallery");
  const [description, setDescription] = useState("Explore recent work and featured moments.");
  const [loading, setLoading] = useState(true);

  async function fetchImages() {
    try {
      setLoading(true);
      const response = await fetch("/api/public/gallery", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Gallery could not be loaded.");
      setImages(data.images ?? []);
      setHeading(data.settings?.home_gallery_heading || "Gallery");
      setDescription(data.settings?.home_gallery_description || "Explore recent work and featured moments.");
    } catch (error) {
      console.error("GALLERY LOAD ERROR:", error);
      setImages([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchImages();
  }, []);

  return (
    <FadeIn>
      <section id="gallery" className="bg-zinc-950 py-32 text-white">
        <Container>
          <div className="mb-16 max-w-2xl">
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">Gallery</p>
            <h2 className="text-4xl font-bold md:text-5xl">{heading}</h2>
            <p className="mt-4 text-zinc-400">{description}</p>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-zinc-400">Loading gallery...</div>
          ) : images.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-zinc-400">No gallery images yet. Upload service images from the dashboard.</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {images.map((image) => (
                <article key={image.id} className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
                  <img src={image.image_url} alt={image.alt_text || image.title || "Gallery image"} className="h-80 w-full object-cover transition duration-500 hover:scale-105" />
                  {(image.title || image.description) && (
                    <div className="p-5">
                      {image.title && <h3 className="text-xl font-black">{image.title}</h3>}
                      {image.description && <p className="mt-2 text-sm leading-6 text-zinc-400">{image.description}</p>}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </Container>
      </section>
    </FadeIn>
  );
}
