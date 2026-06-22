import { NextResponse } from "next/server";
import Stripe from "stripe";

import { supabaseAdmin } from "@/lib/supabase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

function getSiteUrl(request: Request) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    request.headers.get("origin") ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
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

function isCancelledStatus(status: string | null) {
  return status === "cancelled" || status === "rejected";
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function calculateDiscountAmount({
  originalPrice,
  discountType,
  discountValue,
}: {
  originalPrice: number;
  discountType: string;
  discountValue: number;
}) {
  if (discountType === "amount") {
    return Math.min(discountValue, originalPrice);
  }

  return Math.min((originalPrice * discountValue) / 100, originalPrice);
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
    return Math.min(depositValue, discountedPrice);
  }

  return Math.min((discountedPrice * depositValue) / 100, discountedPrice);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      service_id,
      variation_id,
      service_name,
      price,
      duration,
      customer_email,
      booking_date,
      booking_time,
      booking_end_time,
      notes,
      timezone,
      client_id,
      discount_code,
    } = body;

    const numericPrice = Number(price);
    const numericDuration = Number(duration);

    const serviceId = service_id ? Number(service_id) : null;
    const variationId = variation_id ? Number(variation_id) : null;

    if (
      !service_name ||
      !customer_email ||
      !booking_date ||
      !booking_time ||
      !timezone ||
      !Number.isFinite(numericPrice) ||
      numericPrice <= 0
    ) {
      return NextResponse.json(
        {
          error: "Missing required checkout information.",
        },
        {
          status: 400,
        }
      );
    }

    const bookingEndTime =
      booking_end_time ??
      addMinutesToTime(
        booking_time,
        Number.isFinite(numericDuration) && numericDuration > 0
          ? numericDuration
          : 60
      );

    const requestedStart = timeToMinutes(booking_time);
    const requestedEnd = timeToMinutes(bookingEndTime);

    if (requestedEnd <= requestedStart) {
      return NextResponse.json(
        {
          error: "Booking end time must be after the start time.",
        },
        {
          status: 400,
        }
      );
    }

    const { data: availabilityWindows, error: availabilityError } =
      await supabaseAdmin
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
        .eq("available_date", booking_date);

    if (availabilityError) {
      console.error("AVAILABILITY LOOKUP ERROR:", availabilityError);

      return NextResponse.json(
        {
          error: "Availability could not be checked.",
        },
        {
          status: 500,
        }
      );
    }

    const fitsAvailability = (availabilityWindows ?? []).some((window) => {
      const windowStart = window.start_time ?? window.available_time;
      const windowEnd = window.end_time;

      if (!windowStart || !windowEnd) {
        return false;
      }

      const availableStart = timeToMinutes(windowStart);
      const availableEnd = timeToMinutes(windowEnd);

      return requestedStart >= availableStart && requestedEnd <= availableEnd;
    });

    if (!fitsAvailability) {
      return NextResponse.json(
        {
          error: "This time is no longer available.",
        },
        {
          status: 409,
        }
      );
    }

    const { data: existingBookings, error: existingBookingsError } =
      await supabaseAdmin
        .from("bookings")
        .select(
          `
            id,
            booking_time,
            booking_end_time,
            status
          `
        )
        .eq("booking_date", booking_date);

    if (existingBookingsError) {
      console.error("EXISTING BOOKING LOOKUP ERROR:", existingBookingsError);

      return NextResponse.json(
        {
          error: "Existing bookings could not be checked.",
        },
        {
          status: 500,
        }
      );
    }

    const hasConflict = (existingBookings ?? []).some((booking) => {
      if (isCancelledStatus(booking.status)) {
        return false;
      }

      if (!booking.booking_time || !booking.booking_end_time) {
        return false;
      }

      const existingStart = timeToMinutes(booking.booking_time);
      const existingEnd = timeToMinutes(booking.booking_end_time);

      return requestedStart < existingEnd && requestedEnd > existingStart;
    });

    if (hasConflict) {
      return NextResponse.json(
        {
          error: "This time overlaps with an existing booking.",
        },
        {
          status: 409,
        }
      );
    }

    let paymentMode = "full";
    let depositType = "percent";
    let depositValue = 0;

    if (variationId) {
      const { data: variation, error: variationError } = await supabaseAdmin
        .from("service_variations")
        .select("payment_mode, deposit_type, deposit_value")
        .eq("id", variationId)
        .maybeSingle();

      if (variationError) {
        console.error("VARIATION PAYMENT SETTINGS ERROR:", variationError);
      }

      if (variation) {
        paymentMode = variation.payment_mode ?? "full";
        depositType = variation.deposit_type ?? "percent";
        depositValue = Number(variation.deposit_value ?? 0);
      }
    } else if (serviceId) {
      const { data: service, error: serviceError } = await supabaseAdmin
        .from("services")
        .select("payment_mode, deposit_type, deposit_value")
        .eq("id", serviceId)
        .maybeSingle();

      if (serviceError) {
        console.error("SERVICE PAYMENT SETTINGS ERROR:", serviceError);
      }

      if (service) {
        paymentMode = service.payment_mode ?? "full";
        depositType = service.deposit_type ?? "percent";
        depositValue = Number(service.deposit_value ?? 0);
      }
    }

    const cleanDiscountCode =
      typeof discount_code === "string" ? discount_code.trim().toUpperCase() : "";

    let appliedDiscountCode = "";
    let discountAmount = 0;

    if (cleanDiscountCode) {
      const { data: discount, error: discountError } = await supabaseAdmin
        .from("discount_codes")
        .select("*")
        .eq("code", cleanDiscountCode)
        .eq("is_active", true)
        .maybeSingle();

      if (discountError) {
        console.error("DISCOUNT LOOKUP ERROR:", discountError);

        return NextResponse.json(
          {
            error: "Discount code could not be checked.",
          },
          {
            status: 500,
          }
        );
      }

      if (!discount) {
        return NextResponse.json(
          {
            error: "Invalid discount code.",
          },
          {
            status: 400,
          }
        );
      }

      const now = new Date();

      if (discount.starts_at && new Date(discount.starts_at) > now) {
        return NextResponse.json(
          {
            error: "This discount code is not active yet.",
          },
          {
            status: 400,
          }
        );
      }

      if (discount.expires_at && new Date(discount.expires_at) < now) {
        return NextResponse.json(
          {
            error: "This discount code has expired.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        discount.max_uses !== null &&
        discount.max_uses !== undefined &&
        Number(discount.used_count ?? 0) >= Number(discount.max_uses)
      ) {
        return NextResponse.json(
          {
            error: "This discount code has reached its usage limit.",
          },
          {
            status: 400,
          }
        );
      }

      discountAmount = roundMoney(
        calculateDiscountAmount({
          originalPrice: numericPrice,
          discountType: discount.discount_type,
          discountValue: Number(discount.discount_value),
        })
      );

      appliedDiscountCode = discount.code;
    }

    const discountedPrice = roundMoney(Math.max(numericPrice - discountAmount, 0));

    const amountDueNow = roundMoney(
      calculateDepositAmount({
        discountedPrice,
        paymentMode,
        depositType,
        depositValue,
      })
    );

    const depositAmount =
      paymentMode === "deposit" ? amountDueNow : 0;

    const remainingBalance =
      paymentMode === "deposit"
        ? roundMoney(Math.max(discountedPrice - amountDueNow, 0))
        : 0;

    if (amountDueNow <= 0) {
      return NextResponse.json(
        {
          error: "Checkout amount must be greater than $0.",
        },
        {
          status: 400,
        }
      );
    }

    const balanceStatus =
      remainingBalance > 0 ? "balance_due" : "not_applicable";

    const cleanNotes =
      typeof notes === "string" ? notes.trim() : "";

    const normalizedNotes = [
      cleanNotes,
      variationId ? `Variation ID: ${variationId}` : "",
      appliedDiscountCode ? `Discount Code: ${appliedDiscountCode}` : "",
      paymentMode === "deposit"
        ? `Deposit paid upfront. Remaining balance due after project completion: $${remainingBalance.toFixed(2)}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .insert({
        client_id: client_id || null,
        service_id: serviceId,
        customer_email,
        booking_date,
        booking_time,
        booking_end_time: bookingEndTime,
        payment_status: "pending",
        status: "pending",
        notes: normalizedNotes,
        timezone,
        price_paid: amountDueNow,
        original_price: numericPrice,
        discount_code: appliedDiscountCode || null,
        discount_amount: discountAmount,
        amount_due_now: amountDueNow,
        remaining_balance: remainingBalance,
        payment_mode: paymentMode,
        deposit_amount: depositAmount,
        balance_status: balanceStatus,
      })
      .select()
      .single();

    if (bookingError || !booking) {
      console.error("BOOKING CREATION ERROR:", bookingError);

      return NextResponse.json(
        {
          error: "Booking creation failed.",
        },
        {
          status: 500,
        }
      );
    }

    const siteUrl = getSiteUrl(request);

    const checkoutLabel =
      paymentMode === "deposit"
        ? `${service_name} Deposit`
        : service_name;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: checkoutLabel,
              description:
                paymentMode === "deposit"
                  ? `Deposit payment. Remaining balance: $${remainingBalance.toFixed(2)}`
                  : appliedDiscountCode
                    ? `Discount applied: ${appliedDiscountCode}`
                    : undefined,
            },
            unit_amount: Math.round(amountDueNow * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingId: booking.id.toString(),
        serviceId: serviceId ? serviceId.toString() : "",
        variationId: variationId ? variationId.toString() : "",
        bookingDate: booking_date,
        bookingTime: booking_time,
        bookingEndTime,
        originalPrice: numericPrice.toFixed(2),
        discountCode: appliedDiscountCode,
        discountAmount: discountAmount.toFixed(2),
        amountDueNow: amountDueNow.toFixed(2),
        remainingBalance: remainingBalance.toFixed(2),
        paymentMode,
      },
      success_url: `${siteUrl}/success?bookingId=${booking.id}`,
      cancel_url: `${siteUrl}/cancel?bookingId=${booking.id}`,
    });

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error("CHECKOUT ERROR:", error);

    return NextResponse.json(
      {
        error: "Checkout failed.",
      },
      {
        status: 500,
      }
    );
  }
}