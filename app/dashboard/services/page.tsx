"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

interface Service {
  id: number;
  title: string;
  description: string;
  price: number;
  duration: number;
}

export default function ServicesDashboardPage() {

  const [services, setServices] =
    useState<Service[]>([]);

  const [loadingId, setLoadingId] =
    useState<number | null>(
      null
    );

  const [title, setTitle] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [price, setPrice] =
    useState("");

  const [duration, setDuration] =
    useState("");

  async function fetchServices() {

    const { data } =
      await supabase
        .from(
          "services"
        )
        .select("*")
        .order(
          "id",
          {
            ascending:
              false,
          }
        );

    if (data) {
      setServices(
        data
      );
    }
  }

  useEffect(() => {
    fetchServices();
  }, []);

  async function createService() {

    if (
      !title ||
      !price ||
      !duration
    ) {
      alert(
        "Please complete required fields."
      );

      return;
    }

    await supabase
      .from(
        "services"
      )
      .insert({
        title,

        description,

        price:
          Number(
            price
          ),

        duration:
          Number(
            duration
          ),
      });

    setTitle("");
    setDescription("");
    setPrice("");
    setDuration("");

    fetchServices();
  }

  async function saveService(
    service: Service
  ) {

    try {

      setLoadingId(
        service.id
      );

      await supabase
        .from(
          "services"
        )
        .update({
          title:
            service.title,

          description:
            service.description,

          price:
            service.price,

          duration:
            service.duration,
        })
        .eq(
          "id",
          service.id
        );

      await fetchServices();

    } catch (
      error
    ) {

      console.error(
        error
      );

      alert(
        "Save failed."
      );
    }

    setLoadingId(
      null
    );
  }

  async function deleteService(
    id: number
  ) {

    try {

      setLoadingId(
        id
      );

      await supabase
        .from(
          "services"
        )
        .delete()
        .eq(
          "id",
          id
        );

      await fetchServices();

    } catch (
      error
    ) {

      console.error(
        error
      );

      alert(
        "Delete failed."
      );
    }

    setLoadingId(
      null
    );
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
          onChange={(e)=>
            setTitle(
              e.target.value
            )
          }
          className="rounded-xl border border-white/10 bg-black px-4 py-3"
        />

        <textarea
          placeholder="Description"
          value={
            description
          }
          onChange={(e)=>
            setDescription(
              e.target.value
            )
          }
          className="rounded-xl border border-white/10 bg-black px-4 py-3"
        />

        <input
          placeholder="Price"
          value={price}
          onChange={(e)=>
            setPrice(
              e.target.value
            )
          }
          className="rounded-xl border border-white/10 bg-black px-4 py-3"
        />

        <input
          placeholder="Duration (minutes)"
          value={
            duration
          }
          onChange={(e)=>
            setDuration(
              e.target.value
            )
          }
          className="rounded-xl border border-white/10 bg-black px-4 py-3"
        />

        <button
          onClick={
            createService
          }
          className="rounded-full bg-white px-6 py-3 text-black"
        >
          Create Service
        </button>

      </div>

      <div className="grid gap-6">

        {services.map(
          (
            service
          ) => (

            <div
              key={
                service.id
              }
              className="rounded-3xl border border-white/10 bg-white/5 p-8"
            >

              <div className="grid gap-4">

                <input
                  value={
                    service.title
                  }
                  onChange={(e)=>
                    setServices(
                      (
                        prev
                      ) =>
                        prev.map(
                          (
                            s
                          ) =>
                            s.id ===
                            service.id
                              ? {
                                  ...s,
                                  title:
                                    e
                                      .target
                                      .value,
                                }
                              : s
                        )
                    )
                  }
                  className="rounded-xl border border-white/10 bg-black px-4 py-3"
                />

                <textarea
                  value={
                    service.description
                  }
                  onChange={(e)=>
                    setServices(
                      (
                        prev
                      ) =>
                        prev.map(
                          (
                            s
                          ) =>
                            s.id ===
                            service.id
                              ? {
                                  ...s,
                                  description:
                                    e
                                      .target
                                      .value,
                                }
                              : s
                        )
                    )
                  }
                  className="rounded-xl border border-white/10 bg-black px-4 py-3"
                />

                <input
                  type="number"
                  value={
                    service.price
                  }
                  onChange={(e)=>
                    setServices(
                      (
                        prev
                      ) =>
                        prev.map(
                          (
                            s
                          ) =>
                            s.id ===
                            service.id
                              ? {
                                  ...s,
                                  price:
                                    Number(
                                      e
                                        .target
                                        .value
                                    ),
                                }
                              : s
                        )
                    )
                  }
                  className="rounded-xl border border-white/10 bg-black px-4 py-3"
                />

                <input
                  type="number"
                  value={
                    service.duration
                  }
                  onChange={(e)=>
                    setServices(
                      (
                        prev
                      ) =>
                        prev.map(
                          (
                            s
                          ) =>
                            s.id ===
                            service.id
                              ? {
                                  ...s,
                                  duration:
                                    Number(
                                      e
                                        .target
                                        .value
                                    ),
                                }
                              : s
                        )
                    )
                  }
                  className="rounded-xl border border-white/10 bg-black px-4 py-3"
                />

                <div className="flex gap-4">

                  <button
                    disabled={
                      loadingId ===
                      service.id
                    }
                    onClick={() =>
                      saveService(
                        service
                      )
                    }
                    className="rounded-full border border-green-500 px-5 py-2 text-green-400 disabled:opacity-50"
                  >
                    {
                      loadingId ===
                      service.id
                        ? "Saving..."
                        : "Save"
                    }
                  </button>

                  <button
                    disabled={
                      loadingId ===
                      service.id
                    }
                    onClick={() =>
                      deleteService(
                        service.id
                      )
                    }
                    className="rounded-full border border-red-500 px-5 py-2 text-red-500 disabled:opacity-50"
                  >
                    Delete
                  </button>

                </div>

              </div>

            </div>

          )
        )}

      </div>

    </main>
  );
}