"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import dynamic from "next/dynamic";

import "react-calendar/dist/Calendar.css";

import Container from "@/components/Container";
import { supabase } from "@/lib/supabase";

const Calendar = dynamic(
  () => import("react-calendar"),
  {
    ssr: false,
  }
);

interface Service {
  id: number;
  title: string;
  description: string | null;
  price: number;
  duration: number | null;
  payment_mode: string | null;
  deposit_type: string | null;
  deposit_value: number | null;
}

interface ServiceVariation {
  id: number;
  service_id: number;
  variation_name: string;
  price: number;
  duration: number;
  payment_mode: string | null;
  deposit_type: string | null;
  deposit_value: number | null;
}

interface Availability {
  id: number;
  available_date: string;
  available_time: string | null;
  start_time: string | null;
  end_time: string | null;
  timezone: string | null;
}

interface ExistingBooking {
  id: number;
  booking_date: string | null;
  booking_time: string | null;
  booking_end_time: string | null;
  status: string | null;
}

interface SelectedOption {
  serviceId: number;
  variationId: number | null;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  paymentMode: string;
  depositType: string;
  depositValue: number;
}

interface DiscountPreview {
  valid: boolean;
  code?: string;
  discount_amount?: number;
  discounted_price?: number;
  message: string;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function timeToMinutes(time: string) {
  const [hourString, minuteString] =
    time.split(":");

  return (
    Number(hourString) * 60 +
    Number(minuteString ?? "0")
  );
}

function minutesToTime(minutes: number) {
  const hours =
    Math.floor(minutes / 60) % 24;

  const mins = minutes % 60;

  return `${String(hours).padStart(
    2,
    "0"
  )}:${String(mins).padStart(2, "0")}`;
}

function addMinutesToTime(
  time: string,
  minutesToAdd: number
) {
  return minutesToTime(
    timeToMinutes(time) + minutesToAdd
  );
}

function formatDisplayTime(time: string) {
  const date =
    new Date(`1970-01-01T${time}`);

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMoney(amount: number) {
  return `$${amount.toFixed(2)}`;
}

function isCancelledStatus(
  status: string | null
) {
  return (
    status === "cancelled" ||
    status === "rejected"
  );
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function calculateDepositAmount({
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
    return Math.min(
      depositValue,
      discountedPrice
    );
  }

  return Math.min(
    (discountedPrice * depositValue) / 100,
    discountedPrice
  );
}

function bookingOverlaps({
  start,
  end,
  existingStart,
  existingEnd,
}: {
  start: string;
  end: string;
  existingStart: string;
  existingEnd: string;
}) {
  const startMinutes =
    timeToMinutes(start);
  const endMinutes =
    timeToMinutes(end);
  const existingStartMinutes =
    timeToMinutes(existingStart);
  const existingEndMinutes =
    timeToMinutes(existingEnd);

  return (
    startMinutes < existingEndMinutes &&
    endMinutes > existingStartMinutes
  );
}

export default function Booking() {
  const [mounted, setMounted] =
    useState(false);

  const [services, setServices] =
    useState<Service[]>([]);

  const [
    variations,
    setVariations,
  ] = useState<ServiceVariation[]>([]);

  const [
    availability,
    setAvailability,
  ] = useState<Availability[]>([]);

  const [
    existingBookings,
    setExistingBookings,
  ] = useState<ExistingBooking[]>([]);

  const [
    selectedServiceId,
    setSelectedServiceId,
  ] = useState("");

  const [
    selectedVariationId,
    setSelectedVariationId,
  ] = useState("");

  const [
    selectedDate,
    setSelectedDate,
  ] = useState<Date | null>(null);

  const [
    selectedTime,
    setSelectedTime,
  ] = useState("");

  const [
    customerEmail,
    setCustomerEmail,
  ] = useState("");

  const [notes, setNotes] =
    useState("");

  const [
    discountCode,
    setDiscountCode,
  ] = useState("");

  const [
    discountPreview,
    setDiscountPreview,
  ] = useState<DiscountPreview | null>(
    null
  );

  const [
    discountChecking,
    setDiscountChecking,
  ] = useState(false);

  const [
    loadingData,
    setLoadingData,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const timezone =
    Intl.DateTimeFormat().resolvedOptions()
      .timeZone || "America/New_York";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchBookingData() {
      try {
        setLoadingData(true);
        setError("");

        const [
          servicesResponse,
          variationsResponse,
          availabilityResponse,
          bookingsResponse,
        ] = await Promise.all([
          supabase
            .from("services")
            .select(
              `
                id,
                title,
                description,
                price,
                duration,
                payment_mode,
                deposit_type,
                deposit_value
              `
            )
            .order("created_at", {
              ascending: true,
            }),

          supabase
            .from("service_variations")
            .select(
              `
                id,
                service_id,
                variation_name,
                price,
                duration,
                payment_mode,
                deposit_type,
                deposit_value
              `
            )
            .order("created_at", {
              ascending: true,
            }),

          supabase
            .from("availability")
            .select(
              `
                id,
                available_date,
                available_time,
                start_time,
                end_time,
                timezone
              `
            )
            .order("available_date", {
              ascending: true,
            }),

          supabase
            .from("bookings")
            .select(
              `
                id,
                booking_date,
                booking_time,
                booking_end_time,
                status
              `
            ),
        ]);

        if (servicesResponse.error) {
          throw servicesResponse.error;
        }

        if (variationsResponse.error) {
          throw variationsResponse.error;
        }

        if (availabilityResponse.error) {
          throw availabilityResponse.error;
        }

        if (bookingsResponse.error) {
          throw bookingsResponse.error;
        }

        setServices(
          (servicesResponse.data ??
            []) as Service[]
        );

        setVariations(
          (variationsResponse.data ??
            []) as ServiceVariation[]
        );

        setAvailability(
          (availabilityResponse.data ??
            []) as Availability[]
        );

        setExistingBookings(
          (bookingsResponse.data ??
            []) as ExistingBooking[]
        );
      } catch (error) {
        console.error(
          "BOOKING DATA FETCH ERROR:",
          error
        );

        setError(
          "Booking information could not be loaded."
        );
      } finally {
        setLoadingData(false);
      }
    }

    fetchBookingData();
  }, []);

  const selectedService =
    useMemo(() => {
      return services.find(
        (service) =>
          service.id ===
          Number(selectedServiceId)
      );
    }, [services, selectedServiceId]);

  const serviceVariations =
    useMemo(() => {
      if (!selectedService) {
        return [];
      }

      return variations.filter(
        (variation) =>
          variation.service_id ===
          selectedService.id
      );
    }, [selectedService, variations]);

  const selectedVariation =
    useMemo(() => {
      return variations.find(
        (variation) =>
          variation.id ===
          Number(selectedVariationId)
      );
    }, [variations, selectedVariationId]);

  const selectedOption:
    | SelectedOption
    | null = useMemo(() => {
    if (!selectedService) {
      return null;
    }

    if (selectedVariation) {
      return {
        serviceId: selectedService.id,
        variationId: selectedVariation.id,
        name: `${selectedService.title} — ${selectedVariation.variation_name}`,
        description:
          selectedService.description,
        price: Number(
          selectedVariation.price
        ),
        duration:
          Number(
            selectedVariation.duration
          ) || 60,
        paymentMode:
          selectedVariation.payment_mode ??
          selectedService.payment_mode ??
          "full",
        depositType:
          selectedVariation.deposit_type ??
          selectedService.deposit_type ??
          "percent",
        depositValue:
          Number(
            selectedVariation.deposit_value ??
              selectedService.deposit_value ??
              0
          ),
      };
    }

    return {
      serviceId: selectedService.id,
      variationId: null,
      name: selectedService.title,
      description:
        selectedService.description,
      price: Number(
        selectedService.price
      ),
      duration:
        Number(
          selectedService.duration
        ) || 60,
      paymentMode:
        selectedService.payment_mode ??
        "full",
      depositType:
        selectedService.deposit_type ??
        "percent",
      depositValue:
        Number(
          selectedService.deposit_value ??
            0
        ),
    };
  }, [selectedService, selectedVariation]);

  const selectedDateKey =
    selectedDate ? formatDateKey(selectedDate) : "";

  const availableDateKeys =
    useMemo(() => {
      return new Set(
        availability.map(
          (item) => item.available_date
        )
      );
    }, [availability]);

  const availableTimes =
    useMemo(() => {
      if (
        !selectedDateKey ||
        !selectedOption
      ) {
        return [];
      }

      const windowsForDate =
        availability.filter(
          (item) =>
            item.available_date ===
            selectedDateKey
        );

      const bookingsForDate =
        existingBookings.filter(
          (booking) =>
            booking.booking_date ===
              selectedDateKey &&
            !isCancelledStatus(
              booking.status
            )
        );

      const slots = new Set<string>();

      windowsForDate.forEach((window) => {
        const windowStart =
          window.start_time ??
          window.available_time;

        const windowEnd =
          window.end_time;

        if (!windowStart || !windowEnd) {
          return;
        }

        const startMinutes =
          timeToMinutes(windowStart);

        const endMinutes =
          timeToMinutes(windowEnd);

        for (
          let minutes = startMinutes;
          minutes + selectedOption.duration <=
          endMinutes;
          minutes += 30
        ) {
          const start =
            minutesToTime(minutes);

          const end =
            addMinutesToTime(
              start,
              selectedOption.duration
            );

          const conflicts =
            bookingsForDate.some(
              (booking) => {
                if (
                  !booking.booking_time ||
                  !booking.booking_end_time
                ) {
                  return false;
                }

                return bookingOverlaps({
                  start,
                  end,
                  existingStart:
                    booking.booking_time,
                  existingEnd:
                    booking.booking_end_time,
                });
              }
            );

          if (!conflicts) {
            slots.add(start);
          }
        }
      });

      return Array.from(slots).sort();
    }, [
      selectedDateKey,
      selectedOption,
      availability,
      existingBookings,
    ]);

  useEffect(() => {
    setSelectedVariationId("");
    setSelectedTime("");
    setDiscountPreview(null);
  }, [selectedServiceId]);

  useEffect(() => {
    setSelectedTime("");
    setDiscountPreview(null);
  }, [selectedVariationId, selectedDateKey]);

  useEffect(() => {
    async function validateDiscount() {
      if (!selectedOption) {
        setDiscountPreview(null);
        return;
      }

      const code =
        discountCode.trim().toUpperCase();

      if (!code) {
        setDiscountPreview(null);
        return;
      }

      try {
        setDiscountChecking(true);

        const response = await fetch(
          "/api/discounts/validate",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              code,
              price: selectedOption.price,
            }),
          }
        );

        const data =
          (await response.json()) as DiscountPreview;

        setDiscountPreview(data);
      } catch (error) {
        console.error(
          "DISCOUNT PREVIEW ERROR:",
          error
        );

        setDiscountPreview({
          valid: false,
          message:
            "Discount could not be checked.",
        });
      } finally {
        setDiscountChecking(false);
      }
    }

    const timeout =
      window.setTimeout(
        validateDiscount,
        500
      );

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    discountCode,
    selectedOption?.price,
  ]);

  const priceSummary =
    useMemo(() => {
      if (!selectedOption) {
        return null;
      }

      const originalPrice =
        roundMoney(selectedOption.price);

      const discountAmount =
        discountPreview?.valid
          ? roundMoney(
              Number(
                discountPreview.discount_amount ??
                  0
              )
            )
          : 0;

      const discountedPrice =
        roundMoney(
          Math.max(
            originalPrice - discountAmount,
            0
          )
        );

      const amountDueNow =
        roundMoney(
          calculateDepositAmount({
            discountedPrice,
            paymentMode:
              selectedOption.paymentMode,
            depositType:
              selectedOption.depositType,
            depositValue:
              selectedOption.depositValue,
          })
        );

      const remainingBalance =
        selectedOption.paymentMode ===
        "deposit"
          ? roundMoney(
              Math.max(
                discountedPrice -
                  amountDueNow,
                0
              )
            )
          : 0;

      return {
        originalPrice,
        discountAmount,
        discountedPrice,
        amountDueNow,
        remainingBalance,
      };
    }, [selectedOption, discountPreview]);

  async function handleCheckout(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      if (!selectedOption) {
        setError(
          "Please select a service."
        );
        return;
      }

      if (!selectedDateKey) {
        setError("Please select a date.");
        return;
      }

      if (!selectedTime) {
        setError("Please select a time.");
        return;
      }

      if (!customerEmail.trim()) {
        setError(
          "Please enter your email address."
        );
        return;
      }

      if (
        discountCode.trim() &&
        discountPreview &&
        discountPreview.valid === false
      ) {
        setError(
          discountPreview.message ||
            "Please remove or correct the discount code."
        );
        return;
      }

      const bookingEndTime =
        addMinutesToTime(
          selectedTime,
          selectedOption.duration
        );

      const response = await fetch(
        "/api/checkout",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            service_id:
              selectedOption.serviceId,
            variation_id:
              selectedOption.variationId,
            service_name:
              selectedOption.name,
            price: selectedOption.price,
            duration:
              selectedOption.duration,
            customer_email:
              customerEmail.trim(),
            booking_date:
              selectedDateKey,
            booking_time:
              selectedTime,
            booking_end_time:
              bookingEndTime,
            notes,
            timezone,
            client_id: null,
            discount_code:
              discountCode
                .trim()
                .toUpperCase(),
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Checkout could not be started."
        );
        return;
      }

      if (!data.url) {
        setError(
          "Stripe checkout URL was not returned."
        );
        return;
      }

      setSuccess(
        "Redirecting to checkout..."
      );

      window.location.href = data.url;
    } catch (error) {
      console.error(
        "CHECKOUT SUBMIT ERROR:",
        error
      );

      setError(
        "Checkout could not be started."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      id="booking"
      className="relative py-24"
    >
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm uppercase tracking-[0.35em] text-zinc-500">
            Book Now
          </p>

          <h2 className="text-4xl font-bold md:text-6xl">
            Reserve Your Time
          </h2>

          <p className="mt-6 text-lg leading-relaxed text-zinc-400">
            Select a service, choose an available time, apply a discount code if
            you have one, and complete checkout securely.
          </p>
        </div>

        <form
          onSubmit={handleCheckout}
          className="mx-auto mt-14 grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr]"
        >
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h3 className="text-2xl font-bold">
              Service Details
            </h3>

            {error && (
              <div className="mt-6 rounded-2xl border border-red-500 bg-red-500/10 p-4 text-red-300">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-6 rounded-2xl border border-green-500 bg-green-500/10 p-4 text-green-300">
                {success}
              </div>
            )}

            {loadingData ? (
              <div className="mt-8 rounded-2xl border border-white/10 bg-black p-6 text-zinc-500">
                Loading booking options...
              </div>
            ) : (
              <div className="mt-8 grid gap-5">
                <label className="grid gap-2">
                  <span className="text-sm text-zinc-400">
                    Service
                  </span>

                  <select
                    value={selectedServiceId}
                    onChange={(event) =>
                      setSelectedServiceId(
                        event.target.value
                      )
                    }
                    className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
                  >
                    <option value="">
                      Select a service
                    </option>

                    {services.map((service) => (
                      <option
                        key={service.id}
                        value={service.id}
                      >
                        {service.title} —{" "}
                        {formatMoney(
                          Number(
                            service.price
                          )
                        )}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedService &&
                  serviceVariations.length >
                    0 && (
                    <label className="grid gap-2">
                      <span className="text-sm text-zinc-400">
                        Package / Variation
                      </span>

                      <select
                        value={
                          selectedVariationId
                        }
                        onChange={(event) =>
                          setSelectedVariationId(
                            event.target.value
                          )
                        }
                        className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
                      >
                        <option value="">
                          Use base service
                        </option>

                        {serviceVariations.map(
                          (variation) => (
                            <option
                              key={variation.id}
                              value={variation.id}
                            >
                              {
                                variation.variation_name
                              }{" "}
                              —{" "}
                              {formatMoney(
                                Number(
                                  variation.price
                                )
                              )}
                            </option>
                          )
                        )}
                      </select>
                    </label>
                  )}

                <label className="grid gap-2">
                  <span className="text-sm text-zinc-400">
                    Email
                  </span>

                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(event) =>
                      setCustomerEmail(
                        event.target.value
                      )
                    }
                    placeholder="you@example.com"
                    className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm text-zinc-400">
                    Discount Code
                  </span>

                  <input
                    value={discountCode}
                    onChange={(event) =>
                      setDiscountCode(
                        event.target.value.toUpperCase()
                      )
                    }
                    placeholder="LAUNCH10"
                    className="rounded-2xl border border-white/10 bg-black px-4 py-3 uppercase text-white outline-none transition focus:border-white/40"
                  />

                  {discountChecking && (
                    <p className="text-sm text-zinc-500">
                      Checking discount...
                    </p>
                  )}

                  {discountPreview && (
                    <p
                      className={`text-sm ${
                        discountPreview.valid
                          ? "text-green-300"
                          : "text-red-300"
                      }`}
                    >
                      {discountPreview.message}
                    </p>
                  )}
                </label>

                <label className="grid gap-2">
                  <span className="text-sm text-zinc-400">
                    Notes
                  </span>

                  <textarea
                    value={notes}
                    onChange={(event) =>
                      setNotes(
                        event.target.value
                      )
                    }
                    rows={5}
                    placeholder="Anything we should know before your appointment?"
                    className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-white/40"
                  />
                </label>

                {selectedOption &&
                  priceSummary && (
                    <div className="rounded-2xl border border-white/10 bg-black p-5">
                      <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">
                        Payment Summary
                      </p>

                      <div className="mt-4 grid gap-2 text-sm text-zinc-300">
                        <div className="flex justify-between gap-4">
                          <span>
                            Original Price
                          </span>
                          <span>
                            {formatMoney(
                              priceSummary.originalPrice
                            )}
                          </span>
                        </div>

                        {priceSummary.discountAmount >
                          0 && (
                          <div className="flex justify-between gap-4 text-green-300">
                            <span>
                              Discount
                            </span>
                            <span>
                              -
                              {formatMoney(
                                priceSummary.discountAmount
                              )}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between gap-4">
                          <span>
                            Adjusted Price
                          </span>
                          <span>
                            {formatMoney(
                              priceSummary.discountedPrice
                            )}
                          </span>
                        </div>

                        <div className="mt-3 border-t border-white/10 pt-3">
                          {selectedOption.paymentMode ===
                          "deposit" ? (
                            <>
                              <div className="flex justify-between gap-4 text-yellow-300">
                                <span>
                                  Deposit Due Now
                                </span>
                                <span>
                                  {formatMoney(
                                    priceSummary.amountDueNow
                                  )}
                                </span>
                              </div>

                              <div className="mt-2 flex justify-between gap-4 text-blue-300">
                                <span>
                                  Remaining Balance
                                </span>
                                <span>
                                  {formatMoney(
                                    priceSummary.remainingBalance
                                  )}
                                </span>
                              </div>

                              <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                                The remaining balance is tracked in your booking
                                record and can be collected after the project is
                                completed.
                              </p>
                            </>
                          ) : (
                            <div className="flex justify-between gap-4 text-green-300">
                              <span>
                                Full Payment Due Now
                              </span>
                              <span>
                                {formatMoney(
                                  priceSummary.amountDueNow
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <h3 className="text-2xl font-bold">
              Choose Date + Time
            </h3>

            <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-black p-4 text-black">
              {mounted && (
                <Calendar
                  onChange={(value) => {
                    if (value instanceof Date) {
                      setSelectedDate(value);
                    }
                  }}
                  value={selectedDate}
                  tileDisabled={({ date }) => {
                    const dateKey =
                      formatDateKey(date);

                    return !availableDateKeys.has(
                      dateKey
                    );
                  }}
                />
              )}
            </div>

            <div className="mt-8">
              <p className="mb-3 text-sm uppercase tracking-[0.25em] text-zinc-500">
                Available Times
              </p>

              {!selectedDate ? (
                <div className="rounded-2xl border border-white/10 bg-black p-5 text-zinc-500">
                  Select a date first.
                </div>
              ) : availableTimes.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black p-5 text-zinc-500">
                  No available times for this date and service duration.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {availableTimes.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() =>
                        setSelectedTime(time)
                      }
                      className={`rounded-2xl border px-4 py-3 text-sm transition ${
                        selectedTime === time
                          ? "border-white bg-white text-black"
                          : "border-white/10 bg-black text-zinc-300 hover:bg-white/10"
                      }`}
                    >
                      {formatDisplayTime(time)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedDate &&
              selectedTime &&
              selectedOption && (
                <div className="mt-8 rounded-2xl border border-white/10 bg-black p-5">
                  <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">
                    Booking Preview
                  </p>

                  <h4 className="mt-3 text-xl font-semibold">
                    {selectedOption.name}
                  </h4>

                  <div className="mt-4 grid gap-2 text-sm text-zinc-400">
                    <p>
                      Date: {selectedDateKey}
                    </p>

                    <p>
                      Time:{" "}
                      {formatDisplayTime(
                        selectedTime
                      )}{" "}
                      —{" "}
                      {formatDisplayTime(
                        addMinutesToTime(
                          selectedTime,
                          selectedOption.duration
                        )
                      )}
                    </p>

                    <p>
                      Duration:{" "}
                      {selectedOption.duration} minutes
                    </p>

                    <p>
                      Timezone: {timezone}
                    </p>
                  </div>
                </div>
              )}

            <button
              type="submit"
              disabled={
                submitting ||
                loadingData ||
                !selectedOption ||
                !selectedDate ||
                !selectedTime
              }
              className="mt-8 w-full rounded-full bg-white px-6 py-4 font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Starting Checkout..."
                : selectedOption?.paymentMode ===
                    "deposit"
                  ? "Pay Deposit"
                  : "Continue to Checkout"}
            </button>
          </div>
        </form>
      </Container>
    </section>
  );
}