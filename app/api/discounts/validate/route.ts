import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

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

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const code =
      typeof body.code === "string"
        ? body.code.trim().toUpperCase()
        : "";

    const originalPrice = Number(body.price);

    if (!code) {
      return NextResponse.json(
        {
          valid: false,
          message: "Please enter a discount code.",
        },
        {
          status: 400,
        }
      );
    }

    if (!Number.isFinite(originalPrice) || originalPrice <= 0) {
      return NextResponse.json(
        {
          valid: false,
          message: "A valid price is required.",
        },
        {
          status: 400,
        }
      );
    }

    const { data: discount, error } =
      await supabaseAdmin
        .from("discount_codes")
        .select("*")
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();

    if (error) {
      console.error(
        "DISCOUNT VALIDATION ERROR:",
        error
      );

      return NextResponse.json(
        {
          valid: false,
          message:
            "Discount code could not be checked.",
        },
        {
          status: 500,
        }
      );
    }

    if (!discount) {
      return NextResponse.json(
        {
          valid: false,
          message: "Invalid discount code.",
        },
        {
          status: 404,
        }
      );
    }

    const now = new Date();

    if (
      discount.starts_at &&
      new Date(discount.starts_at) > now
    ) {
      return NextResponse.json(
        {
          valid: false,
          message:
            "This discount code is not active yet.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      discount.expires_at &&
      new Date(discount.expires_at) < now
    ) {
      return NextResponse.json(
        {
          valid: false,
          message:
            "This discount code has expired.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      discount.max_uses !== null &&
      discount.max_uses !== undefined &&
      Number(discount.used_count ?? 0) >=
        Number(discount.max_uses)
    ) {
      return NextResponse.json(
        {
          valid: false,
          message:
            "This discount code has reached its usage limit.",
        },
        {
          status: 400,
        }
      );
    }

    const discountAmount = roundMoney(
      calculateDiscountAmount({
        originalPrice,
        discountType:
          discount.discount_type,
        discountValue: Number(
          discount.discount_value
        ),
      })
    );

    const discountedPrice = roundMoney(
      Math.max(
        originalPrice - discountAmount,
        0
      )
    );

    return NextResponse.json({
      valid: true,
      code: discount.code,
      discount_type:
        discount.discount_type,
      discount_value:
        discount.discount_value,
      discount_amount: discountAmount,
      discounted_price: discountedPrice,
      message: "Discount applied.",
    });
  } catch (error) {
    console.error(
      "DISCOUNT VALIDATE ROUTE ERROR:",
      error
    );

    return NextResponse.json(
      {
        valid: false,
        message:
          "Discount validation failed.",
      },
      {
        status: 500,
      }
    );
  }
}