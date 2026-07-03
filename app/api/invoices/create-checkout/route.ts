import { NextResponse } from "next/server";
import Stripe from "stripe";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { getServerSiteSlug } from "@/lib/site/siteConfig";
import { supabaseAdmin } from "@/lib/supabase-admin";

function getStripe() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  return new Stripe(stripeSecretKey);
}

function getSiteUrl(request: Request) {
  const fallbackUrl = new URL(request.url);

  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${fallbackUrl.protocol}//${fallbackUrl.host}`
  ).replace(/\/$/, "");
}

function getInvoiceId(body: Record<string, unknown>) {
  return Number(body.invoice_id ?? body.invoiceId ?? body.id);
}

function getInvoiceAmount(invoice: Record<string, unknown>) {
  const possibleValues = [
    invoice.balance_due,
    invoice.remaining_balance,
    invoice.total_amount,
    invoice.amount,
    invoice.price,
  ];

  for (const value of possibleValues) {
    const numberValue = Number(value);

    if (Number.isFinite(numberValue) && numberValue > 0) {
      return numberValue;
    }
  }

  return 0;
}

function getInvoiceTitle(invoice: Record<string, unknown>) {
  return String(
    invoice.title ||
      invoice.invoice_title ||
      invoice.invoice_number ||
      `Invoice #${invoice.id}`
  );
}

function getCustomerEmail(invoice: Record<string, unknown>) {
  const email = String(
    invoice.customer_email ||
      invoice.client_email ||
      invoice.email ||
      ""
  ).trim();

  return email || undefined;
}

async function updateInvoiceAfterCheckout({
  invoiceId,
  sessionId,
  url,
  siteSlug,
}: {
  invoiceId: number;
  sessionId: string;
  url: string | null;
  siteSlug: string;
}) {
  const richUpdate = {
    stripe_checkout_session_id: sessionId,
    checkout_url: url,
    invoice_status: "sent",
    payment_status: "pending",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from("admin_invoices")
    .update(richUpdate)
    .eq("site_slug", siteSlug)
    .eq("id", invoiceId);

  if (!error) {
    return;
  }

  await supabaseAdmin
    .from("admin_invoices")
    .update({
      stripe_session_id: sessionId,
    })
    .eq("site_slug", siteSlug)
    .eq("id", invoiceId);
}

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const siteSlug = getServerSiteSlug();
    const invoiceId = getInvoiceId(body);

    if (!Number.isFinite(invoiceId)) {
      return NextResponse.json(
        {
          error: "A valid invoice ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("admin_invoices")
      .select("*")
      .eq("site_slug", siteSlug)
      .eq("id", invoiceId)
      .maybeSingle();

    if (invoiceError) {
      throw invoiceError;
    }

    if (!invoice) {
      return NextResponse.json(
        {
          error: "Invoice was not found for this site.",
        },
        {
          status: 404,
        }
      );
    }

    const amountInDollars = getInvoiceAmount(invoice);

    if (!Number.isFinite(amountInDollars) || amountInDollars <= 0) {
      return NextResponse.json(
        {
          error: "This invoice does not have a valid amount.",
        },
        {
          status: 400,
        }
      );
    }

    const stripe = getStripe();
    const siteUrl = getSiteUrl(request);
    const amountInCents = Math.round(amountInDollars * 100);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: getCustomerEmail(invoice),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountInCents,
            product_data: {
              name: getInvoiceTitle(invoice),
              description: `Invoice payment for invoice #${invoiceId}`,
            },
          },
        },
      ],
      success_url: `${siteUrl}/invoice-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/dashboard/invoices`,
      metadata: {
        siteSlug,
        type: "invoice_payment",
        invoice_id: String(invoiceId),
      },
      payment_intent_data: {
        metadata: {
          siteSlug,
          type: "invoice_payment",
          invoice_id: String(invoiceId),
        },
      },
    });

    await updateInvoiceAfterCheckout({
      invoiceId,
      sessionId: session.id,
      url: session.url,
      siteSlug,
    });

    return NextResponse.json({
      session_id: session.id,
      url: session.url,
      message: "Invoice checkout created.",
    });
  } catch (error) {
    console.error("CREATE INVOICE CHECKOUT ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Invoice checkout could not be created.",
      },
      {
        status: 500,
      }
    );
  }
}
