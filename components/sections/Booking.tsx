"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import "react-calendar/dist/Calendar.css";

import { getClientSiteSlug } from "@/lib/site/siteConfig";
import { supabase } from "@/lib/supabase";

const Calendar = dynamic(() => import("react-calendar"), {
  ssr: false,
});

type Row = Record<string, any>;

type DiscountResult = {
  valid: boolean;
  code: string;
  discount_amount: number;
  discounted_price: number;
  message: string;
};

const tipOptions = [
  { label: "No Tip", value: "0" },
  { label: "$5", value: "5" },
  { label: "$10", value: "10" },
  { label: "$25", value: "25" },
  { label: "Custom", value: "custom" },
];

function formatDateForDatabase(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function timeToMinutes(time: string) {
  const [hourString, minuteString] = time.split(":");

  return Number(hourString) * 60 + Number(minuteString ?? "0");
}

function minutesToTime(minutes: number) {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function addMinutesToTime(time: string, minutesToAdd: number) {
  return minutesToTime(timeToMinutes(time) + minutesToAdd);
}

function formatTime(time: string) {
  const [hourString, minuteString] = time.split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString ?? "0");

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return time;
  }

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function formatMoney(value: number) {
  return `$${roundMoney(value).toFixed(2)}`;
}

function calculateDepositBaseAmount({
  discountedPrice,
  paymentMode,
  depositType,
  depositValue,
}: {
  discountedPrice: number;
  paymentMode: string;
  depositType: string;
  depositValue: number;
}) {
  if (paymentMode !== "deposit") {
    return discountedPrice;
  }

  if (depositType === "amount") {
    return Math.min(depositValue, discountedPrice);
  }

  return Math.min((discountedPrice * depositValue) / 100, discountedPrice);
}

function isCancelledStatus(status: string | null) {
  return status === "cancelled" || status === "rejected";
}

export default function Booking() {
  const siteSlug = getClientSiteSlug();

  const [services, setServices] = useState<Row[]>([]);
  const [variations, setVariations] = useState<Row[]>([]);
  const [availability, setAvailability] = useState<Row[]>([]);
  const [existingBookings, setExistingBookings] = useState<Row[]>([]);

  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedVariationId, setSelectedVariationId] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountResult | null>(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountMessage, setDiscountMessage] = useState("");
  const [selectedTip, setSelectedTip] = useState("0");
  const [customTip, setCustomTip] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState("");

  const timezone = useMemo(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, []);

  async function fetchBookingData() {
    try {
      setLoading(true);
      setError("");

      const today = formatDateForDatabase(new Date());

      const [servicesResult, variationsResult, availabilityResult, bookingsResult] =
        await Promise.all([
          supabase
            .from("services")
            .select("id,title,description,price,duration,payment_mode,deposit_type,deposit_value")
            .eq("site_slug", siteSlug)
            .order("created_at", {
              ascending: true,
            }),
          supabase
            .from("service_variations")
            .select("id,service_id,variation_name,price,duration,payment_mode,deposit_type,deposit_value")
            .eq("site_slug", siteSlug)
            .order("created_at", {
              ascending: true,
            }),
          supabase
            .from("availability")
            .select("id,available_date,available_time,start_time,end_time,timezone")
            .eq("site_slug", siteSlug)
            .gte("available_date", today)
            .order("available_date", {
              ascending: true,
            }),
          supabase
            .from("bookings")
            .select("id,booking_date,booking_time,booking_end_time,status")
            .eq("site_slug", siteSlug)
            .gte("booking_date", today),
        ]);

      if (servicesResult.error) {
        throw servicesResult.error;
      }

      if (variationsResult.error) {
        throw variationsResult.error;
      }

      if (availabilityResult.error) {
        throw availabilityResult.error;
      }

      if (bookingsResult.error) {
        throw bookingsResult.error;
      }

      setServices(servicesResult.data ?? []);
      setVariations(variationsResult.data ?? []);
      setAvailability(availabilityResult.data ?? []);
      setExistingBookings(bookingsResult.data ?? []);
    } catch (fetchError) {
      console.error("BOOKING DATA FETCH ERROR:", fetchError);
      setError("Booking information could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBookingData();
  }, []);

  const selectedService = useMemo(() => {
    return services.find((service) => String(service.id) === selectedServiceId);
  }, [services, selectedServiceId]);

  const serviceVariations = useMemo(() => {
    if (!selectedService) {
      return [];
    }

    return variations.filter((variation) => variation.service_id === selectedService.id);
  }, [selectedService, variations]);

  const selectedVariation = useMemo(() => {
    return serviceVariations.find((variation) => String(variation.id) === selectedVariationId);
  }, [serviceVariations, selectedVariationId]);

  const activeOption = selectedVariation ?? selectedService ?? null;
  const activePrice = roundMoney(Number(activeOption?.price ?? 0));
  const activeDuration = Number(activeOption?.duration ?? 60);
  const paymentMode = activeOption?.payment_mode ?? "full";
  const depositType = activeOption?.deposit_type ?? "percent";
  const depositValue = Number(activeOption?.deposit_value ?? 0);

  const tipAmount = useMemo(() => {
    if (selectedTip === "custom") {
      return roundMoney(Math.max(Number(customTip || 0), 0));
    }

    return roundMoney(Math.max(Number(selectedTip || 0), 0));
  }, [selectedTip, customTip]);

  const discountAmount = roundMoney(Number(appliedDiscount?.discount_amount ?? 0));
  const discountedPrice = roundMoney(Math.max(activePrice - discountAmount, 0));
  const depositBaseAmount = roundMoney(
    calculateDepositBaseAmount({
      discountedPrice,
      paymentMode,
      depositType,
      depositValue,
    })
  );
  const amountDueNow = roundMoney(depositBaseAmount + tipAmount);
  const remainingBalance =
    paymentMode === "deposit"
      ? roundMoney(Math.max(discountedPrice - depositBaseAmount, 0))
      : 0;

  const selectedDateString = selectedDate ? formatDateForDatabase(selectedDate) : "";

  const availableTimes = useMemo(() => {
    if (!selectedDateString || !activeOption) {
      return [];
    }

    const windowsForDate = availability.filter(
      (window) => window.available_date === selectedDateString
    );

    const bookingsForDate = existingBookings.filter((booking) => {
      return booking.booking_date === selectedDateString && !isCancelledStatus(booking.status);
    });

    const generatedTimes: string[] = [];

    windowsForDate.forEach((window) => {
      const windowStart = window.start_time ?? window.available_time;
      const windowEnd = window.end_time;

      if (!windowStart) {
        return;
      }

      if (!windowEnd) {
        generatedTimes.push(windowStart);
        return;
      }

      let current = timeToMinutes(windowStart);
      const end = timeToMinutes(windowEnd);

      while (current + activeDuration <= end) {
        const candidateStart = minutesToTime(current);
        const candidateEnd = minutesToTime(current + activeDuration);
        const hasConflict = bookingsForDate.some((booking) => {
          if (!booking.booking_time) {
            return false;
          }

          const existingStart = timeToMinutes(booking.booking_time);
          const existingEnd = booking.booking_end_time
            ? timeToMinutes(booking.booking_end_time)
            : existingStart + 60;
          const requestedStart = timeToMinutes(candidateStart);
          const requestedEnd = timeToMinutes(candidateEnd);

          return requestedStart < existingEnd && requestedEnd > existingStart;
        });

        if (!hasConflict) {
          generatedTimes.push(candidateStart);
        }

        current += 30;
      }
    });

    return Array.from(new Set(generatedTimes)).sort(
      (a, b) => timeToMinutes(a) - timeToMinutes(b)
    );
  }, [selectedDateString, activeOption, availability, existingBookings, activeDuration]);

  const availableDates = useMemo(() => {
    return new Set(availability.map((window) => window.available_date));
  }, [availability]);

  function clearDiscount() {
    setAppliedDiscount(null);
    setDiscountCode("");
    setDiscountMessage("");
  }

  function handleServiceChange(value: string) {
    setSelectedServiceId(value);
    setSelectedVariationId("");
    setSelectedTime("");
    clearDiscount();
  }

  function handleVariationChange(value: string) {
    setSelectedVariationId(value);
    setSelectedTime("");
    clearDiscount();
  }

  function handleCalendarChange(value: unknown) {
    if (value instanceof Date) {
      setSelectedDate(value);
      setSelectedTime("");
    }
  }

  function handleDiscountCodeChange(value: string) {
    setDiscountCode(value);
    setAppliedDiscount(null);
    setDiscountMessage("");
  }

  function tileDisabled({ date, view }: { date: Date; view: string }) {
    if (view !== "month") {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    if (targetDate < today) {
      return true;
    }

    return !availableDates.has(formatDateForDatabase(date));
  }

  function tileClassName({ date, view }: { date: Date; view: string }) {
    if (view !== "month") {
      return "";
    }

    if (availableDates.has(formatDateForDatabase(date))) {
      return "booking-calendar-available";
    }

    return "";
  }

  async function applyDiscountCode() {
    try {
      setDiscountLoading(true);
      setDiscountMessage("");
      setAppliedDiscount(null);

      if (!discountCode.trim()) {
        setDiscountMessage("Enter a discount code first.");
        return;
      }

      if (!activeOption || activePrice <= 0) {
        setDiscountMessage("Select a service before applying a discount.");
        return;
      }

      const response = await fetch("/api/discounts/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: discountCode,
          price: activePrice,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        setDiscountMessage(data.message || data.error || "Invalid code.");
        return;
      }

      setAppliedDiscount({
        valid: true,
        code: data.code,
        discount_amount: Number(data.discount_amount ?? 0),
        discounted_price: Number(data.discounted_price ?? 0),
        message: data.message ?? "Discount applied.",
      });

      setDiscountMessage(data.message ?? "Discount applied.");
    } catch (discountError) {
      console.error("DISCOUNT ERROR:", discountError);
      setDiscountMessage("Discount could not be applied.");
    } finally {
      setDiscountLoading(false);
    }
  }

  async function createCheckout() {
    try {
      setCheckoutLoading(true);
      setError("");

      if (!selectedService || !activeOption) {
        setError("Select a service first.");
        return;
      }

      if (!selectedDateString) {
        setError("Select a booking date.");
        return;
      }

      if (!selectedTime) {
        setError("Select a booking time.");
        return;
      }

      if (!customerEmail.trim()) {
        setError("Enter your email address.");
        return;
      }

      if (amountDueNow <= 0) {
        setError("Checkout amount must be greater than $0.");
        return;
      }

      const bookingEndTime = addMinutesToTime(selectedTime, activeDuration);
      const serviceName = selectedVariation
        ? `${selectedService.title} — ${selectedVariation.variation_name}`
        : selectedService.title;

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service_id: selectedService.id,
          variation_id: selectedVariation?.id ?? null,
          service_name: serviceName,
          price: activePrice,
          duration: activeDuration,
          customer_email: customerEmail.trim(),
          booking_date: selectedDateString,
          booking_time: selectedTime,
          booking_end_time: bookingEndTime,
          notes,
          timezone,
          client_id: null,
          discount_code: appliedDiscount?.code ?? "",
          tip_amount: tipAmount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Checkout could not be created.");
      }

      if (!data.url) {
        throw new Error("Stripe did not return a checkout URL.");
      }

      window.location.href = data.url;
    } catch (checkoutError) {
      console.error("CHECKOUT ERROR:", checkoutError);
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Checkout could not be created."
      );
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (loading) {
    return (
      <section id="booking" className="bg-black px-6 py-24 text-white md:px-10">
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Loading</p>
          <h2 className="mt-4 text-3xl font-bold">Loading Booking Calendar...</h2>
        </div>
      </section>
    );
  }

  return (
    <section id="booking" className="bg-black px-6 py-24 text-white md:px-10">
      <style jsx global>{`
        .react-calendar {
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.04);
          color: white;
          padding: 1rem;
          font-family: inherit;
        }

        .react-calendar button {
          color: white;
          border-radius: 12px;
        }

        .react-calendar button:enabled:hover,
        .react-calendar button:enabled:focus {
          background: rgba(255, 255, 255, 0.12);
        }

        .react-calendar__tile--active {
          background: white !important;
          color: black !important;
        }

        .react-calendar__tile:disabled {
          background: transparent;
          color: rgba(255, 255, 255, 0.25);
        }

        .booking-calendar-available {
          border: 1px solid rgba(34, 197, 94, 0.6) !important;
        }
      `}</style>

      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-500">Book Now</p>
          <h2 className="text-5xl font-bold md:text-6xl">Reserve Your Spot</h2>
          <p className="mx-auto mt-5 max-w-2xl text-zinc-400">
            Choose your service, select an available time, apply a discount, add
            an optional tip, and complete checkout securely.
          </p>
        </div>

        {error && (
          <div className="mb-8 rounded-3xl border border-red-500 bg-red-500/10 p-5 text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
            <p className="mb-4 text-sm uppercase tracking-[0.25em] text-zinc-500">Step 1</p>
            <h3 className="mb-6 text-3xl font-bold">Select Service</h3>

            <div className="grid gap-4">
              {services.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/40 p-6 text-zinc-500">
                  No services have been added yet.
                </div>
              ) : (
                services.map((service) => {
                  const isSelected = selectedServiceId === String(service.id);

                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => handleServiceChange(String(service.id))}
                      className={`rounded-3xl border p-5 text-left transition ${
                        isSelected
                          ? "border-white bg-white text-black"
                          : "border-white/10 bg-black/40 hover:border-white/30 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-5">
                        <div>
                          <h4 className="text-2xl font-bold">{service.title}</h4>
                          {service.description && (
                            <p className={`mt-2 text-sm leading-relaxed ${isSelected ? "text-zinc-700" : "text-zinc-400"}`}>
                              {service.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">{formatMoney(Number(service.price ?? 0))}</p>
                          <p className={`mt-1 text-xs ${isSelected ? "text-zinc-700" : "text-zinc-500"}`}>
                            {service.duration ?? 60} min
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {serviceVariations.length > 0 && (
              <div className="mt-8 rounded-3xl border border-white/10 bg-black/40 p-5">
                <p className="mb-4 text-sm uppercase tracking-[0.2em] text-zinc-500">Package Options</p>
                <div className="grid gap-3">
                  <button
                    type="button"
                    onClick={() => handleVariationChange("")}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      selectedVariationId === ""
                        ? "border-white bg-white text-black"
                        : "border-white/10 text-zinc-300 hover:border-white/30"
                    }`}
                  >
                    <div className="flex justify-between gap-4">
                      <span>Base Service</span>
                      <span>{formatMoney(Number(selectedService?.price ?? 0))}</span>
                    </div>
                  </button>

                  {serviceVariations.map((variation) => {
                    const isSelected = selectedVariationId === String(variation.id);

                    return (
                      <button
                        key={variation.id}
                        type="button"
                        onClick={() => handleVariationChange(String(variation.id))}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          isSelected
                            ? "border-white bg-white text-black"
                            : "border-white/10 text-zinc-300 hover:border-white/30"
                        }`}
                      >
                        <div className="flex justify-between gap-4">
                          <div>
                            <p className="font-semibold">{variation.variation_name}</p>
                            <p className={`mt-1 text-xs ${isSelected ? "text-zinc-700" : "text-zinc-500"}`}>
                              {variation.duration ?? 60} min · {variation.payment_mode === "deposit" ? "Deposit accepted" : "Full payment"}
                            </p>
                          </div>
                          <span className="font-bold">{formatMoney(Number(variation.price ?? 0))}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
            <p className="mb-4 text-sm uppercase tracking-[0.25em] text-zinc-500">Step 2</p>
            <h3 className="mb-6 text-3xl font-bold">Choose Date & Time</h3>

            <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
              <Calendar
                onChange={handleCalendarChange}
                value={selectedDate}
                tileDisabled={tileDisabled}
                tileClassName={tileClassName}
              />

              <div>
                <p className="mb-3 text-sm font-semibold text-zinc-400">Available Times</p>
                {!selectedService ? (
                  <EmptyBox text="Select a service first." />
                ) : !selectedDateString ? (
                  <EmptyBox text="Select an available date." />
                ) : availableTimes.length === 0 ? (
                  <EmptyBox text="No available times for this date." />
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {availableTimes.map((time) => {
                      const isSelected = selectedTime === time;

                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setSelectedTime(time)}
                          className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                            isSelected
                              ? "border-white bg-white text-black"
                              : "border-white/10 bg-black/40 text-zinc-300 hover:border-white/30"
                          }`}
                        >
                          {formatTime(time)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 grid gap-5">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-zinc-400">Email Address</span>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-white/40"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-zinc-400">Notes / Details</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Tell us anything helpful about your booking."
                  className="min-h-28 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-white/40"
                />
              </label>

              <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
                <p className="mb-3 text-sm font-semibold text-zinc-400">Discount Code</p>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input
                    value={discountCode}
                    onChange={(event) => handleDiscountCodeChange(event.target.value)}
                    placeholder="Enter discount code"
                    className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white/40"
                  />
                  <button
                    type="button"
                    onClick={applyDiscountCode}
                    disabled={discountLoading}
                    className="rounded-full bg-white px-5 py-3 text-sm font-black text-black disabled:opacity-60"
                  >
                    {discountLoading ? "Checking..." : "Apply"}
                  </button>
                </div>
                {discountMessage && <p className="mt-3 text-sm text-zinc-400">{discountMessage}</p>}
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
                <p className="mb-3 text-sm font-semibold text-zinc-400">Optional Tip</p>
                <div className="flex flex-wrap gap-2">
                  {tipOptions.map((option) => {
                    const isSelected = selectedTip === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSelectedTip(option.value)}
                        className={`rounded-full border px-4 py-2 text-sm font-bold ${
                          isSelected ? "border-white bg-white text-black" : "border-white/10 text-zinc-300"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                {selectedTip === "custom" && (
                  <input
                    type="number"
                    min="0"
                    value={customTip}
                    onChange={(event) => setCustomTip(event.target.value)}
                    placeholder="Custom tip amount"
                    className="mt-3 rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white/40"
                  />
                )}
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
                <div className="grid gap-2 text-sm text-zinc-400">
                  <div className="flex justify-between gap-4">
                    <span>Service Price</span>
                    <span>{formatMoney(activePrice)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between gap-4 text-green-300">
                      <span>Discount</span>
                      <span>-{formatMoney(discountAmount)}</span>
                    </div>
                  )}
                  {tipAmount > 0 && (
                    <div className="flex justify-between gap-4">
                      <span>Tip</span>
                      <span>{formatMoney(tipAmount)}</span>
                    </div>
                  )}
                  {remainingBalance > 0 && (
                    <div className="flex justify-between gap-4 text-yellow-300">
                      <span>Remaining Balance</span>
                      <span>{formatMoney(remainingBalance)}</span>
                    </div>
                  )}
                  <div className="mt-3 flex justify-between gap-4 border-t border-white/10 pt-3 text-lg font-black text-white">
                    <span>Due Today</span>
                    <span>{formatMoney(amountDueNow)}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={createCheckout}
                disabled={checkoutLoading}
                className="rounded-full bg-white px-6 py-4 text-base font-black text-black disabled:opacity-60"
              >
                {checkoutLoading ? "Opening Checkout..." : "Continue to Checkout"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-black/40 p-5 text-sm text-zinc-500">
      {text}
    </div>
  );
}
