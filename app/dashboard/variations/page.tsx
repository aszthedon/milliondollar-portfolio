"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

interface Service {
  id: number;
  title: string;
}

interface Variation {
  id: number;
  variation_name: string;
  price: number;
  duration: number;
  service_id: number;
}

export default function VariationsPage() {
  const [services, setServices] = useState<
    Service[]
  >([]);

  const [variations, setVariations] = useState<
    Variation[]
  >([]);

  const [serviceId, setServiceId] =
    useState("");

  const [variationName, setVariationName] =
    useState("");

  const [price, setPrice] = useState("");

  const [duration, setDuration] =
    useState("");

  async function fetchServices() {
    const { data } = await supabase
      .from("services")
      .select("*");

    if (data) {
      setServices(data);
    }
  }

  async function fetchVariations() {
    const { data } = await supabase
      .from("service_variations")
      .select("*")
      .order("id", { ascending: false });

    if (data) {
      setVariations(data);
    }
  }

  useEffect(() => {
    fetchServices();
    fetchVariations();
  }, []);

  async function createVariation() {
    await supabase
      .from("service_variations")
      .insert({
        service_id: Number(serviceId),
        variation_name: variationName,
        price: Number(price),
        duration: Number(duration),
      });

    setVariationName("");
    setPrice("");
    setDuration("");

    fetchVariations();
  }

  async function deleteVariation(id: number) {
    await supabase
      .from("service_variations")
      .delete()
      .eq("id", id);

    fetchVariations();
  }

  function getServiceName(id: number) {
    const service = services.find(
      (service) => service.id === id
    );

    return service?.title || "Unknown Service";
  }

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <h1 className="mb-10 text-5xl font-bold">
        Service Variations
      </h1>

      <div className="mb-12 grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-8">
        <select
          value={serviceId}
          onChange={(e) =>
            setServiceId(e.target.value)
          }
          className="rounded-xl border border-white/10 bg-black px-4 py-3"
        >
          <option value="">
            Select Service
          </option>

          {services.map((service) => (
            <option
              key={service.id}
              value={service.id}
            >
              {service.title}
            </option>
          ))}
        </select>

        <input
          placeholder="Variation Name"
          value={variationName}
          onChange={(e) =>
            setVariationName(e.target.value)
          }
          className="rounded-xl border border-white/10 bg-black px-4 py-3"
        />

        <input
          placeholder="Price"
          value={price}
          onChange={(e) =>
            setPrice(e.target.value)
          }
          className="rounded-xl border border-white/10 bg-black px-4 py-3"
        />

        <input
          placeholder="Duration"
          value={duration}
          onChange={(e) =>
            setDuration(e.target.value)
          }
          className="rounded-xl border border-white/10 bg-black px-4 py-3"
        />

        <button
          onClick={createVariation}
          className="rounded-full bg-white px-6 py-3 text-black"
        >
          Create Variation
        </button>
      </div>

      <div className="grid gap-6">
        {variations.map((variation) => (
          <div
            key={variation.id}
            className="rounded-3xl border border-white/10 bg-white/5 p-8"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="mb-2 text-sm uppercase tracking-[0.2em] text-zinc-500">
                  {getServiceName(
                    variation.service_id
                  )}
                </p>

                <h2 className="text-3xl font-semibold">
                  {variation.variation_name}
                </h2>

                <div className="mt-4 flex gap-6 text-sm text-zinc-500">
                  <span>
                    ${variation.price}
                  </span>

                  <span>
                    {variation.duration} mins
                  </span>
                </div>
              </div>

              <button
                onClick={() =>
                  deleteVariation(variation.id)
                }
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