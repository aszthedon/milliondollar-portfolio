"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

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
  payment_mode: string | null;
  deposit_type: string | null;
  deposit_value: number | null;
}

export default function VariationsPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);

  const [serviceId, setServiceId] = useState("");
  const [variationName, setVariationName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [paymentMode, setPaymentMode] = useState("full");
  const [depositType, setDepositType] = useState("percent");
  const [depositValue, setDepositValue] = useState("50");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function fetchServices() {
    const { data, error } = await supabase
      .from("services")
      .select("id, title")
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error("SERVICES FETCH ERROR:", error);
      setError("Services could not be loaded.");
      return;
    }

    setServices((data ?? []) as Service[]);
  }

  async function fetchVariations() {
    const { data, error } = await supabase
      .from("service_variations")
      .select(
        `
          id,
          variation_name,
          price,
          duration,
          service_id,
          payment_mode,
          deposit_type,
          deposit_value
        `
      )
      .order("id", {
        ascending: false,
      });

    if (error) {
      console.error("VARIATIONS FETCH ERROR:", error);
      setError("Service variations could not be loaded.");
      return;
    }

    setVariations((data ?? []) as Variation[]);
  }

  async function fetchData() {
    try {
      setLoading(true);
      setError("");

      await Promise.all([fetchServices(), fetchVariations()]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function createVariation() {
    try {
      setError("");
      setSuccess("");

      const numericPrice = Number(price);
      const numericDuration = Number(duration);
      const numericDeposit = Number(depositValue);

      if (!serviceId || !variationName.trim()) {
        setError("Please select a service and enter a variation name.");
        return;
      }

      if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
        setError("Please enter a valid price.");
        return;
      }

      if (!Number.isFinite(numericDuration) || numericDuration <= 0) {
        setError("Please enter a valid duration.");
        return;
      }

      if (
        paymentMode === "deposit" &&
        (!Number.isFinite(numericDeposit) || numericDeposit <= 0)
      ) {
        setError("Please enter a valid deposit value.");
        return;
      }

      if (
        paymentMode === "deposit" &&
        depositType === "percent" &&
        numericDeposit > 100
      ) {
        setError("Deposit percent cannot be more than 100%.");
        return;
      }

      if (
        paymentMode === "deposit" &&
        depositType === "amount" &&
        numericDeposit > numericPrice
      ) {
        setError("Deposit amount cannot be more than the full price.");
        return;
      }

      const { error } = await supabase.from("service_variations").insert({
        service_id: Number(serviceId),
        variation_name: variationName.trim(),
        price: numericPrice,
        duration: numericDuration,
        payment_mode: paymentMode,
        deposit_type: depositType,
        deposit_value:
          paymentMode === "deposit" ? numericDeposit : 0,
      });

      if (error) throw error;

      setVariationName("");
      setPrice("");
      setDuration("");
      setPaymentMode("full");
      setDepositType("percent");
      setDepositValue("50");

      setSuccess("Variation created.");
      await fetchVariations();
    } catch (error) {
      console.error("CREATE VARIATION ERROR:", error);
      setError("Variation could not be created.");
    }
  }

  async function updateVariationPaymentSettings(
    variation: Variation,
    nextPaymentMode: string,
    nextDepositType: string,
    nextDepositValue: number
  ) {
    try {
      setError("");
      setSuccess("");

      if (
        nextPaymentMode === "deposit" &&
        nextDepositType === "percent" &&
        nextDepositValue > 100
      ) {
        setError("Deposit percent cannot be more than 100%.");
        return;
      }

      if (
        nextPaymentMode === "deposit" &&
        nextDepositType === "amount" &&
        nextDepositValue > variation.price
      ) {
        setError("Deposit amount cannot be more than the full price.");
        return;
      }

      const { error } = await supabase
        .from("service_variations")
        .update({
          payment_mode: nextPaymentMode,
          deposit_type: nextDepositType,
          deposit_value:
            nextPaymentMode === "deposit" ? nextDepositValue : 0,
        })
        .eq("id", variation.id);

      if (error) throw error;

      setSuccess("Payment settings updated.");
      await fetchVariations();
    } catch (error) {
      console.error("UPDATE PAYMENT SETTINGS ERROR:", error);
      setError("Payment settings could not be updated.");
    }
  }

  async function deleteVariation(id: number) {
    const confirmed = window.confirm("Delete this variation?");

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("service_variations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchVariations();
    } catch (error) {
      console.error("DELETE VARIATION ERROR:", error);
      setError("Variation could not be deleted.");
    }
  }

  function getServiceName(id: number) {
    const service = services.find((service) => service.id === id);

    return service?.title || "Unknown Service";
  }

  function getDepositAmount(variation: Variation) {
    if (variation.payment_mode !== "deposit") return 0;

    const value = Number(variation.deposit_value ?? 0);

    if (variation.deposit_type === "amount") {
      return Math.min(value, variation.price);
    }

    return Math.min((variation.price * value) / 100, variation.price);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            Loading
          </p>

          <h1 className="mt-4 text-3xl font-bold">
            Loading Variations...
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white md:px-10">
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
            Dashboard
          </p>

          <h1 className="text-5xl font-bold">
            Service Variations
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            Create packages with full payment or deposit-only checkout.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white hover:text-black"
        >
          Dashboard Home
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-3xl border border-red-500 bg-red-500/10 p-5 text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-3xl border border-green-500 bg-green-500/10 p-5 text-green-300">
          {success}
        </div>
      )}

      <div className="mb-12 grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-8">
        <h2 className="text-3xl font-bold">
          Create Variation
        </h2>

        <select
          value={serviceId}
          onChange={(event) => setServiceId(event.target.value)}
          className="rounded-xl border border-white/10 bg-black px-4 py-3"
        >
          <option value="">
            Select Service
          </option>

          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.title}
            </option>
          ))}
        </select>

        <input
          placeholder="Variation Name"
          value={variationName}
          onChange={(event) => setVariationName(event.target.value)}
          className="rounded-xl border border-white/10 bg-black px-4 py-3"
        />

        <div className="grid gap-4 md:grid-cols-2">
          <input
            placeholder="Full Price"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="rounded-xl border border-white/10 bg-black px-4 py-3"
          />

          <input
            placeholder="Duration in minutes"
            type="number"
            min="1"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            className="rounded-xl border border-white/10 bg-black px-4 py-3"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <select
            value={paymentMode}
            onChange={(event) => setPaymentMode(event.target.value)}
            className="rounded-xl border border-white/10 bg-black px-4 py-3"
          >
            <option value="full">
              Require Full Payment
            </option>
            <option value="deposit">
              Require Deposit Only
            </option>
          </select>

          <select
            value={depositType}
            onChange={(event) => setDepositType(event.target.value)}
            disabled={paymentMode !== "deposit"}
            className="rounded-xl border border-white/10 bg-black px-4 py-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="percent">
              Deposit Percent
            </option>
            <option value="amount">
              Deposit Dollar Amount
            </option>
          </select>

          <input
            placeholder="Deposit Value"
            type="number"
            min="0"
            step="0.01"
            value={depositValue}
            onChange={(event) => setDepositValue(event.target.value)}
            disabled={paymentMode !== "deposit"}
            className="rounded-xl border border-white/10 bg-black px-4 py-3 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <button
          onClick={createVariation}
          className="rounded-full bg-white px-6 py-3 text-black"
        >
          Create Variation
        </button>
      </div>

      <div className="grid gap-6">
        {variations.map((variation) => {
          const depositAmount = getDepositAmount(variation);
          const remainingBalance =
            variation.payment_mode === "deposit"
              ? Math.max(variation.price - depositAmount, 0)
              : 0;

          return (
            <div
              key={variation.id}
              className="rounded-3xl border border-white/10 bg-white/5 p-8"
            >
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="mb-2 text-sm uppercase tracking-[0.2em] text-zinc-500">
                    {getServiceName(variation.service_id)}
                  </p>

                  <h2 className="text-3xl font-semibold">
                    {variation.variation_name}
                  </h2>

                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    <span className="rounded-full border border-white/10 px-4 py-2 text-zinc-300">
                      Full Price: ${variation.price}
                    </span>

                    <span className="rounded-full border border-white/10 px-4 py-2 text-zinc-300">
                      {variation.duration} mins
                    </span>

                    {variation.payment_mode === "deposit" ? (
                      <>
                        <span className="rounded-full border border-yellow-500 px-4 py-2 text-yellow-300">
                          Deposit: ${depositAmount.toFixed(2)}
                        </span>

                        <span className="rounded-full border border-blue-500 px-4 py-2 text-blue-300">
                          Balance Later: ${remainingBalance.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="rounded-full border border-green-500 px-4 py-2 text-green-300">
                        Full Payment Required
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 md:grid-cols-3 xl:min-w-[520px]">
                  <select
                    defaultValue={variation.payment_mode ?? "full"}
                    onChange={(event) => {
                      const nextPaymentMode = event.target.value;

                      updateVariationPaymentSettings(
                        variation,
                        nextPaymentMode,
                        variation.deposit_type ?? "percent",
                        Number(variation.deposit_value ?? 50)
                      );
                    }}
                    className="rounded-xl border border-white/10 bg-black px-4 py-3"
                  >
                    <option value="full">
                      Full Payment
                    </option>
                    <option value="deposit">
                      Deposit Only
                    </option>
                  </select>

                  <select
                    defaultValue={variation.deposit_type ?? "percent"}
                    onChange={(event) => {
                      updateVariationPaymentSettings(
                        variation,
                        variation.payment_mode ?? "full",
                        event.target.value,
                        Number(variation.deposit_value ?? 50)
                      );
                    }}
                    className="rounded-xl border border-white/10 bg-black px-4 py-3"
                  >
                    <option value="percent">
                      Percent
                    </option>
                    <option value="amount">
                      Amount
                    </option>
                  </select>

                  <input
                    defaultValue={variation.deposit_value ?? 50}
                    type="number"
                    min="0"
                    step="0.01"
                    onBlur={(event) => {
                      updateVariationPaymentSettings(
                        variation,
                        variation.payment_mode ?? "full",
                        variation.deposit_type ?? "percent",
                        Number(event.target.value)
                      );
                    }}
                    className="rounded-xl border border-white/10 bg-black px-4 py-3"
                  />
                </div>

                <button
                  onClick={() => deleteVariation(variation.id)}
                  className="rounded-full border border-red-500 px-4 py-2 text-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}