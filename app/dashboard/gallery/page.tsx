"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

interface GalleryImage {
  id: number;
  image_url: string;
}

export default function GalleryDashboardPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);

  async function fetchImages() {
    const { data } = await supabase
      .from("gallery_images")
      .select("*")
      .order("id", { ascending: false });

    if (data) {
      setImages(data);
    }
  }

  useEffect(() => {
    fetchImages();
  }, []);

  async function uploadImage(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    const fileName = `${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from("gallery")
      .upload(fileName, file);

    if (error) {
      alert(error.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("gallery")
      .getPublicUrl(fileName);

    await supabase.from("gallery_images").insert({
      image_url: publicUrl,
    });

    fetchImages();
  }

  async function deleteImage(id: number) {
    await supabase
      .from("gallery_images")
      .delete()
      .eq("id", id);

    fetchImages();
  }

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <h1 className="mb-10 text-5xl font-bold">
        Gallery Dashboard
      </h1>

      <div className="mb-10">
        <input
          type="file"
          onChange={uploadImage}
          className="text-white"
        />
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
              className="h-80 w-full object-cover"
            />

            <div className="p-4">
              <button
                onClick={() => deleteImage(image.id)}
                className="rounded-full border border-red-500 px-4 py-2 text-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}