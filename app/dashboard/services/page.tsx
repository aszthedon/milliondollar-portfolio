"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

interface Service {
  id: number;
  title: string;
  description: string;
  price: number;
  duration: number;
}

export default function ServicesDashboardPage() {
  const [services, setServices] = useState<Service[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");

  async function fetchServices() {
    const { data } = await supabase
      .from("services")
      .select("*")
      .order("id", { ascending: false });

    if (data) {
      setServices(data);
    }
  }

  useEffect(() => {
    fetchServices();
  }, []);

  async function createService() {
    await supabase.from("services").insert({
      title,
      description,
      price: Number(price),
      duration: Number(duration),
    });

    setTitle("");
    setDescription("");
    setPrice("");
    setDuration("");

    fetchServices();
  }

  async function deleteService(id: number) {
    await supabase
      .from("services")
      .delete()
      .eq("id", id);

    fetchServices();
  }

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <h1 className="mb-10 text-5xl font-bold">
        Services Dashboard
      </h1>

      <div className="mb-12 grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-8">
        <input
          placeholder="Service Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-xl border border-white/10 bg-black px-4 py-3"
        />

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-xl border border-white/10 bg-black px-4 py-3"
        />

        <input
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="rounded-xl border border-white/10 bg-black px-4 py-3"
        />

        <input
          placeholder="Duration (minutes)"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="rounded-xl border border-white/10 bg-black px-4 py-3"
        />

        <button
          onClick={createService}
          className="rounded-full bg-white px-6 py-3 text-black"
        >
          Create Service
        </button>
      </div>

      <div className="grid gap-6">
        {services.map((service) => (
          <div
            key={service.id}
            className="rounded-3xl border border-white/10 bg-white/5 p-8"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-semibold">
                  {service.title}
                </h2>

                <p className="mt-3 text-zinc-400">
                  {service.description}
                </p>

                <div className="mt-4 flex gap-6 text-sm text-zinc-500">
                  <span>${service.price}</span>
                  <span>{service.duration} mins</span>
                </div>
              </div>

              <button
                onClick={() => deleteService(service.id)}
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