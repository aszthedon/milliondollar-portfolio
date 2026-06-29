import { NextResponse } from "next/server";
import Stripe from "stripe";

import { supabaseAdmin } from "@/lib/supabase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

function getSiteUrl(request: Request) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    request.headers.get("origin") ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

interface IncomingLineItem {
  item_name?: string;
  description?: string;
  quantity?: number | string;
  unit_amount?: number | string;
}

async function upsertCrmClient({
  clientEmail,
  clientName,
}: {
  clientEmail: string;
  clientName: string;
}) {
  const cleanEmail = clientEmail.trim().toLowerCase();

  if (!cleanEmail) {
    return null;
  }

  const payload: Record<string, unknown> = {
    email: cleanEmail,
    source: "invoice",
    last_contacted_at: new Date().toISOString(),
  };

  if (clientName.trim()) {
    payload.full_name = clientName.trim();
  }

  const { data, error } = await supabaseAdmin
    .from("crm_clients")
    .upsert(payload, {
      onConflict: "email",
    })
    .select("id")
    .single();

  if (error) {
    console.error("CRM CLIENT UPSERT ERROR:", error);
    return null;
  }

  return data?.id ?? null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const clientName =
      typeof body.client_name === "string" ? body.client_name.trim() : "";

    const clientEmail =
      typeof body.client_email === "string"
        ? body.client_email.trim().toLowerCase()
        : "";

    const title = typeof body.title === "string" ? body.title.trim() : "";

    const description =
      typeof body.description === "string" ? body.description.trim() : "";

    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    const dueDate =
      typeof body.due_date === "string" && body.due_date
        ? body.due_date
        : null;

    const discountCode =
      typeof body.discount_code === "string"
        ? body.discount_code.trim().toUpperCase()
        : "";

    const discountAmount = Math.max(Number(body.discount_amount ?? 0), 0);

    const tipAmount = Math.max(Number(body.tip_amount ?? 0), 0);

    const allowTips = Boolean(body.allow_tips ?? true);

    const incomingLineItems = Array.isArray(body.line_items)
      ? (body.line_items as IncomingLineItem[])
      : [];

    if (!clientEmail || !title) {
      return NextResponse.json(
        {
          error: "Client email and invoice title are required.",
        },
        {
          status: 400,
        }
      );
    }

    const normalizedLineItems = incomingLineItems
      .map((item, index) => {
        const itemName =
          typeof item.item_name === "string" ? item.item_name.trim() : "";

        const itemDescription =
          typeof item.description === "string" ? item.description.trim() : "";

        const quantity = Math.max(Number(item.quantity ?? 1), 1);
        const unitAmount = Math.max(Number(item.unit_amount ?? 0), 0);
        const lineTotal = roundMoney(quantity * unitAmount);

        return {
          item_name: itemName,
          description: itemDescription,
          quantity,
          unit_amount: roundMoney(unitAmount),
          line_total: lineTotal,
          sort_order: index,
        };
      })
      .filter((item) => item.item_name && item.line_total > 0);

    if (normalizedLineItems.length === 0) {
      return NextResponse.json(
        {
          error: "Add at least one invoice line item.",
        },
        {
          status: 400,
        }
      );
    }

    const crmClientId = await upsertCrmClient({
      clientEmail,
      clientName,
    });

    const subtotalAmount = roundMoney(
      normalizedLineItems.reduce((total, item) => total + item.line_total, 0)
    );

    const safeDiscountAmount = roundMoney(
      Math.min(discountAmount, subtotalAmount)
    );

    const safeTipAmount = roundMoney(tipAmount);

    const totalAmount = roundMoney(
      subtotalAmount - safeDiscountAmount + safeTipAmount
    );

    if (totalAmount <= 0) {
      return NextResponse.json(
        {
          error: "Invoice total must be greater than $0.",
        },
        {
          status: 400,
        }
      );
    }

    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("admin_invoices")
      .insert({
        crm_client_id: crmClientId,
        client_name: clientName || null,
        client_email: clientEmail,
        title,
        description: description || null,
        subtotal_amount: subtotalAmount,
        discount_code: discountCode || null,
        discount_amount: safeDiscountAmount,
        tip_amount: safeTipAmount,
        total_amount: totalAmount,
        amount_paid: 0,
        remaining_balance: totalAmount,
        allow_tips: allowTips,
        status: "sent",
        due_date: dueDate,
        notes: notes || null,
      })
      .select()
      .single();

    if (invoiceError || !invoice) {
      console.error("ADMIN INVOICE CREATE ERROR:", invoiceError);

      return NextResponse.json(
        {
          error: "Invoice could not be created.",
        },
        {
          status: 500,
        }
      );
    }

    const lineItemsToInsert = normalizedLineItems.map((item) => ({
      invoice_id: invoice.id,
      ...item,
    }));

    const { error: lineItemsError } = await supabaseAdmin
      .from("admin_invoice_line_items")
      .insert(lineItemsToInsert);

    if (lineItemsError) {
      console.error("ADMIN INVOICE LINE ITEMS ERROR:", lineItemsError);

      await supabaseAdmin.from("admin_invoices").delete().eq("id", invoice.id);

      return NextResponse.json(
        {
          error: "Invoice line items could not be saved.",
        },
        {
          status: 500,
        }
      );
    }

    const siteUrl = getSiteUrl(request);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: clientEmail,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: invoice.invoice_number
                ? `${invoice.invoice_number} — ${title}`
                : title,
              description: description || "Custom invoice payment request.",
            },
            unit_amount: Math.round(totalAmount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        paymentType: "admin_invoice",
        invoiceId: String(invoice.id),
        crmClientId: crmClientId ? String(crmClientId) : "",
        invoiceNumber: invoice.invoice_number ?? "",
        clientEmail,
        subtotalAmount: subtotalAmount.toFixed(2),
        discountCode,
        discountAmount: safeDiscountAmount.toFixed(2),
        tipAmount: safeTipAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
      },
      success_url: `${siteUrl}/dashboard/invoices?invoicePaid=${invoice.id}`,
      cancel_url: `${siteUrl}/dashboard/invoices?invoiceCancelled=${invoice.id}`,
    });

    const { data: updatedInvoice, error: updateError } = await supabaseAdmin
      .from("admin_invoices")
      .update({
        payment_link: session.url,
        stripe_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoice.id)
      .select()
      .single();

    if (updateError) {
      console.error("ADMIN INVOICE STRIPE LINK UPDATE ERROR:", updateError);
    }

    return NextResponse.json({
      invoice: updatedInvoice ?? invoice,
      payment_link: session.url,
    });
  } catch (error) {
    console.error("ADMIN INVOICE CHECKOUT ERROR:", error);

    return NextResponse.json(
      {
        error: "Invoice checkout could not be created.",
      },
      {
        status: 500,
      }
    );
  }
}