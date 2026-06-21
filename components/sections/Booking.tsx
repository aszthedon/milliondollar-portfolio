"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import dynamic from "next/dynamic";

import Container from "../Container";
import FadeIn from "../FadeIn";

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
  price: number | null;
  duration: number | null;
}

interface Variation {
  id: number;
  service_id: number;
  variation_name: string;
  price: number | null;
  duration: number | null;
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

interface TimeOption {
  label: string;
  value: string;
  endTime: string;
  windowId: number;
}

export default function Booking() {
  const [mounted, setMounted] =
    useState(false);

  const [services, setServices] =
    useState<Service[]>([]);

  const [variations, setVariations] =
    useState<Variation[]>([]);

  const [availability, setAvailability] =
    useState<Availability[]>([]);

  const [
    existingBookings,
    setExistingBookings,
  ] = useState<ExistingBooking[]>([]);

  const [
    selectedService,
    setSelectedService,
  ] = useState("");

  const [
    selectedVariation,
    setSelectedVariation,
  ] = useState("");

  const [bookingDate, setBookingDate] =
    useState<Date | null>(null);

  const [bookingTime, setBookingTime] =
    useState("");

  const [
    customerEmail,
    setCustomerEmail,
  ] = useState("");

  const [notes, setNotes] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [dataLoading, setDataLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    setMounted(true);

    fetchBookingData();
  }, []);

  async function fetchBookingData() {
    try {
      setError("");

      const [
        servicesResult,
        variationsResult,
        availabilityResult,
        bookingsResult,
      ] = await Promise.all([
        supabase
          .from("services")
          .select(
            "id, title, description, price, duration"
          )
          .order("created_at", {
            ascending: true,
          }),

        supabase
          .from("service_variations")
          .select(
            "id, service_id, variation_name, price, duration"
          )
          .order("created_at", {
            ascending: true,
          }),

        supabase
          .from("availability")
          .select(
            "id, available_date, available_time, start_time, end_time, timezone"
          )
          .order("available_date", {
            ascending: true,
          })
          .order("start_time", {
            ascending: true,
          }),

        supabase
          .from("bookings")
          .select(
            "id, booking_date, booking_time, booking_end_time, status"
          )
          .neq("status", "cancelled")
          .neq("status", "rejected"),
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

      setServices(
        (servicesResult.data ??
          []) as Service[]
      );

      setVariations(
        (variationsResult.data ??
          []) as Variation[]
      );

      setAvailability(
        (availabilityResult.data ??
          []) as Availability[]
      );

      setExistingBookings(
        (bookingsResult.data ??
          []) as ExistingBooking[]
      );
    } catch (error) {
      console.error(
        "BOOKING DATA ERROR:",
        error
      );

      setError(
        "Booking information could not be loaded."
      );
    } finally {
      setDataLoading(false);
    }
  }

  const selectedServiceData =
    useMemo(() => {
      return services.find(
        (service) =>
          service.id ===
          Number(selectedService)
      );
    }, [
      services,
      selectedService,
    ]);

  const filteredVariations =
    useMemo(() => {
      return variations.filter(
        (variation) =>
          variation.service_id ===
          Number(selectedService)
      );
    }, [
      variations,
      selectedService,
    ]);

  const selectedVariationData =
    useMemo(() => {
      return variations.find(
        (variation) =>
          variation.id ===
          Number(selectedVariation)
      );
    }, [
      variations,
      selectedVariation,
    ]);

  const selectedDuration =
    selectedVariationData?.duration ??
    selectedServiceData?.duration ??
    60;

  const selectedPrice =
    selectedVariationData?.price ??
    selectedServiceData?.price ??
    0;

  const selectedServiceName =
    selectedVariationData?.variation_name ??
    selectedServiceData?.title ??
    "Selected Service";

  const formattedBookingDate =
    bookingDate
      ? formatDateForDatabase(
          bookingDate
        )
      : "";

  const availableDates =
    useMemo(() => {
      const today =
        getTodayDateString();

      return [
        ...new Set(
          availability
            .filter(
              (slot) =>
                slot.available_date >=
                today
            )
            .map(
              (slot) =>
                slot.available_date
            )
        ),
      ];
    }, [availability]);

  const availableWindowsForDate =
    useMemo(() => {
      if (!formattedBookingDate) {
        return [];
      }

      return availability.filter(
        (slot) =>
          slot.available_date ===
          formattedBookingDate
      );
    }, [
      availability,
      formattedBookingDate,
    ]);

  const bookedWindowsForDate =
    useMemo(() => {
      if (!formattedBookingDate) {
        return [];
      }

      return existingBookings.filter(
        (booking) =>
          booking.booking_date ===
            formattedBookingDate &&
          booking.booking_time
      );
    }, [
      existingBookings,
      formattedBookingDate,
    ]);

  const availableTimeOptions =
    useMemo(() => {
      if (
        !formattedBookingDate ||
        !selectedDuration
      ) {
        return [];
      }

      const options: TimeOption[] = [];

      availableWindowsForDate.forEach(
        (window) => {
          const windowStart =
            window.start_time ??
            window.available_time;

          const windowEnd =
            window.end_time;

          if (
            !windowStart ||
            !windowEnd
          ) {
            return;
          }

          const startMinutes =
            timeToMinutes(
              windowStart
            );

          const endMinutes =
            timeToMinutes(
              windowEnd
            );

          if (
            endMinutes <=
            startMinutes
          ) {
            return;
          }

          for (
            let current =
              startMinutes;
            current +
              selectedDuration <=
            endMinutes;
            current += 30
          ) {
            const startTime =
              minutesToTime(
                current
              );

            const endTime =
              minutesToTime(
                current +
                  selectedDuration
              );

            const hasConflict =
              bookedWindowsForDate.some(
                (booking) => {
                  if (
                    !booking.booking_time
                  ) {
                    return false;
                  }

                  const existingStart =
                    timeToMinutes(
                      booking.booking_time
                    );

                  const existingEnd =
                    booking.booking_end_time
                      ? timeToMinutes(
                          booking.booking_end_time
                        )
                      : existingStart +
                        60;

                  return (
                    current <
                      existingEnd &&
                    current +
                      selectedDuration >
                      existingStart
                  );
                }
              );

            if (!hasConflict) {
              options.push({
                label: `${formatTime(
                  startTime
                )} — ${formatTime(
                  endTime
                )}`,
                value: startTime,
                endTime,
                windowId: window.id,
              });
            }
          }
        }
      );

      return options;
    }, [
      availableWindowsForDate,
      bookedWindowsForDate,
      formattedBookingDate,
      selectedDuration,
    ]);

  const selectedTimeOption =
    availableTimeOptions.find(
      (option) =>
        option.value ===
        bookingTime
    );

  function getTodayDateString() {
    const today =
      new Date();

    return formatDateForDatabase(
      today
    );
  }

  function formatDateForDatabase(
    date: Date
  ) {
    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        date.getDate()
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function timeToMinutes(
    time: string
  ) {
    const [
      hourString,
      minuteString,
    ] = time.split(":");

    return (
      Number(hourString) * 60 +
      Number(minuteString ?? "0")
    );
  }

  function minutesToTime(
    totalMinutes: number
  ) {
    const hours =
      Math.floor(
        totalMinutes / 60
      ) % 24;

    const minutes =
      totalMinutes % 60;

    return `${String(hours).padStart(
      2,
      "0"
    )}:${String(minutes).padStart(
      2,
      "0"
    )}`;
  }

  function formatTime(
    time: string
  ) {
    const [
      hourString,
      minuteString,
    ] = time.split(":");

    const hour =
      Number(hourString);

    const minute =
      Number(
        minuteString ?? "0"
      );

    if (
      Number.isNaN(hour) ||
      Number.isNaN(minute)
    ) {
      return time;
    }

    const suffix =
      hour >= 12
        ? "PM"
        : "AM";

    const displayHour =
      hour % 12 || 12;

    return `${displayHour}:${String(
      minute
    ).padStart(2, "0")} ${suffix}`;
  }

  function formatDateLabel(
    date: string
  ) {
    const [
      year,
      month,
      day,
    ] = date.split("-");

    if (
      !year ||
      !month ||
      !day
    ) {
      return date;
    }

    return `${month}/${day}/${year}`;
  }

  function handleServiceChange(
    serviceId: string
  ) {
    setSelectedService(serviceId);
    setSelectedVariation("");
    setBookingDate(null);
    setBookingTime("");
  }

  function handleVariationChange(
    variationId: string
  ) {
    setSelectedVariation(variationId);
    setBookingTime("");
  }

  function handleDateChange(
    value: Date
  ) {
    setBookingDate(value);
    setBookingTime("");
  }

  async function startCheckout() {
    if (loading) {
      return;
    }

    if (
      !selectedService ||
      !selectedVariation ||
      !bookingDate ||
      !bookingTime ||
      !customerEmail
    ) {
      alert(
        "Please complete all required fields."
      );

      return;
    }

    if (!selectedTimeOption) {
      alert(
        "Please select an available time."
      );

      return;
    }

    if (!selectedVariationData) {
      alert(
        "Please select a service variation."
      );

      return;
    }

    if (
      !customerEmail.includes("@")
    ) {
      alert(
        "Please enter a valid email address."
      );

      return;
    }

    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const response =
        await fetch(
          "/api/checkout",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              service_id:
                Number(
                  selectedService
                ),

              variation_id:
                Number(
                  selectedVariation
                ),

              service_name:
                selectedServiceName,

              price:
                selectedPrice,

              duration:
                selectedDuration,

              customer_email:
                customerEmail,

              booking_date:
                formattedBookingDate,

              booking_time:
                bookingTime,

              booking_end_time:
                selectedTimeOption.endTime,

              notes,

              timezone:
                Intl.DateTimeFormat()
                  .resolvedOptions()
                  .timeZone,

              client_id:
                user?.id ?? null,
            }),
          }
        );

      const rawResponse =
        await response.text();

      let data: {
        url?: string;
        error?: string;
      };

      try {
        data =
          JSON.parse(
            rawResponse
          );
      } catch (error) {
        console.error(
          "JSON PARSE ERROR:",
          error
        );

        console.error(
          "RAW CHECKOUT RESPONSE:",
          rawResponse
        );

        alert(
          "Server returned invalid JSON."
        );

        return;
      }

      if (!response.ok) {
        alert(
          data.error ??
            "Checkout failed."
        );

        return;
      }

      if (data.url) {
        window.location.href =
          data.url;

        return;
      }

      alert(
        data.error ??
          "Checkout failed."
      );
    } catch (error) {
      console.error(
        "CHECKOUT ERROR:",
        error
      );

      alert(
        "Something went wrong while starting checkout."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <FadeIn>
      <section
        id="booking"
        className="bg-black py-32 text-white"
      >
        <Container>
          <div className="mb-16 max-w-2xl">
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
              Booking
            </p>

            <h2 className="text-4xl font-bold md:text-5xl">
              Request A Booking
            </h2>

            <p className="mt-5 text-zinc-400">
              Select a service, choose an available date and time,
              then continue to secure checkout.
            </p>
          </div>

          <div className="grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-8">
            {error && (
              <div className="rounded-2xl border border-red-500 bg-red-500/10 p-4 text-sm text-red-300">
                {error}
              </div>
            )}

            {dataLoading ? (
              <div className="rounded-2xl border border-white/10 bg-black p-6 text-center text-zinc-400">
                Loading booking options...
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-zinc-400">
                      Service
                    </label>

                    <select
                      value={
                        selectedService
                      }
                      onChange={(e) =>
                        handleServiceChange(
                          e.target
                            .value
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
                    >
                      <option value="">
                        Select Service
                      </option>

                      {services.map(
                        (service) => (
                          <option
                            key={
                              service.id
                            }
                            value={
                              service.id
                            }
                          >
                            {
                              service.title
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-zinc-400">
                      Variation
                    </label>

                    <select
                      value={
                        selectedVariation
                      }
                      onChange={(e) =>
                        handleVariationChange(
                          e.target
                            .value
                        )
                      }
                      disabled={
                        !selectedService
                      }
                      className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">
                        {selectedService
                          ? "Select Variation"
                          : "Select Service First"}
                      </option>

                      {filteredVariations.map(
                        (variation) => (
                          <option
                            key={
                              variation.id
                            }
                            value={
                              variation.id
                            }
                          >
                            {
                              variation.variation_name
                            }
                            {" — $"}
                            {variation.price ??
                              0}
                            {" — "}
                            {variation.duration ??
                              selectedServiceData?.duration ??
                              60}
                            {" min"}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                {selectedService &&
                  filteredVariations.length ===
                    0 && (
                    <div className="rounded-2xl border border-yellow-500 bg-yellow-500/10 p-4 text-sm text-yellow-300">
                      This service does not have any variations yet.
                      Add one in the dashboard before clients book it.
                    </div>
                  )}

                {selectedVariationData && (
                  <div className="rounded-2xl border border-white/10 bg-black/60 p-5">
                    <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                      Selected Package
                    </p>

                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-zinc-300">
                      <span className="rounded-full border border-white/10 px-4 py-2">
                        {
                          selectedServiceName
                        }
                      </span>

                      <span className="rounded-full border border-green-500 px-4 py-2 text-green-400">
                        ${selectedPrice}
                      </span>

                      <span className="rounded-full border border-blue-500 px-4 py-2 text-blue-400">
                        {selectedDuration} minutes
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm text-zinc-400">
                    Date
                  </label>

                  <div className="rounded-3xl border border-white/10 bg-black p-4">
                    {mounted ? (
                      <Calendar
                        onChange={(value) =>
                          handleDateChange(
                            value as Date
                          )
                        }
                        value={
                          bookingDate
                        }
                        minDate={
                          new Date()
                        }
                        tileDisabled={({
                          date,
                        }) => {
                          const formatted =
                            formatDateForDatabase(
                              date
                            );

                          return !availableDates.includes(
                            formatted
                          );
                        }}
                      />
                    ) : (
                      <div className="p-8 text-center text-zinc-500">
                        Loading calendar...
                      </div>
                    )}
                  </div>

                  {availableDates.length ===
                    0 && (
                    <p className="mt-3 text-sm text-yellow-400">
                      No upcoming availability has been added yet.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-400">
                    Available Time
                  </label>

                  <select
                    value={bookingTime}
                    onChange={(e) =>
                      setBookingTime(
                        e.target.value
                      )
                    }
                    disabled={
                      !bookingDate ||
                      !selectedVariation
                    }
                    className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">
                      {!selectedVariation
                        ? "Select Variation First"
                        : !bookingDate
                          ? "Select Date First"
                          : "Select Time"}
                    </option>

                    {availableTimeOptions.map(
                      (option) => (
                        <option
                          key={`${option.windowId}-${option.value}`}
                          value={
                            option.value
                          }
                        >
                          {
                            option.label
                          }
                        </option>
                      )
                    )}
                  </select>

                  {bookingDate &&
                    selectedVariation &&
                    availableTimeOptions.length ===
                      0 && (
                      <p className="mt-3 text-sm text-yellow-400">
                        No open times are available for{" "}
                        {formatDateLabel(
                          formattedBookingDate
                        )}
                        . Try another date.
                      </p>
                    )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-zinc-400">
                      Email Address
                    </label>

                    <input
                      type="email"
                      placeholder="client@email.com"
                      value={
                        customerEmail
                      }
                      onChange={(e) =>
                        setCustomerEmail(
                          e.target
                            .value
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none placeholder:text-zinc-600"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-zinc-400">
                      Timezone
                    </label>

                    <input
                      value={
                        Intl.DateTimeFormat()
                          .resolvedOptions()
                          .timeZone
                      }
                      readOnly
                      className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-zinc-400 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-400">
                    Additional Notes
                  </label>

                  <textarea
                    placeholder="Tell us anything helpful about your project..."
                    value={notes}
                    onChange={(e) =>
                      setNotes(
                        e.target.value
                      )
                    }
                    rows={5}
                    className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none placeholder:text-zinc-600"
                  />
                </div>

                <button
                  onClick={startCheckout}
                  disabled={
                    loading ||
                    !selectedService ||
                    !selectedVariation ||
                    !bookingDate ||
                    !bookingTime ||
                    !customerEmail
                  }
                  className="rounded-full bg-white px-6 py-3 font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Redirecting..."
                    : "Continue To Payment"}
                </button>
              </>
            )}
          </div>
        </Container>
      </section>
    </FadeIn>
  );
}