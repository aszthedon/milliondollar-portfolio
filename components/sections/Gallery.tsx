"use client";

import { useEffect, useState } from "react";

import Container from "../Container";
import FadeIn from "../FadeIn";

import { supabase } from "@/lib/supabase";

interface GalleryImage {
  id: number;
  image_url: string;
}

export default function Gallery() {
  const [images, setImages] = useState<
    GalleryImage[]
  >([]);

  async function fetchImages() {
    const { data, error } = await supabase
      .from("gallery_images")
      .select("*")
      .order("id", { ascending: false });

    console.log("GALLERY DATA:", data);
    console.log("GALLERY ERROR:", error);

    if (data) {
      setImages(data);
    }
  }

  useEffect(() => {
    fetchImages();
  }, []);

  return (
    <FadeIn>
      <section className="bg-zinc-950 py-32 text-white">
        <Container>
          <div className="mb-16 max-w-2xl">
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
              Gallery
            </p>

            <h2 className="text-4xl font-bold md:text-5xl">
              Creative Work & Brand Experiences
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {images.map((image) => (
              <div
                key={image.id}
                className="overflow-hidden rounded-3xl border border-white/10 bg-white/5"
              >
                <img
                  src={image.image_url}
                  alt=""
                  className="h-80 w-full object-cover transition duration-500 hover:scale-105"
                />
              </div>
            ))}
          </div>
        </Container>
      </section>
    </FadeIn>
  );
}