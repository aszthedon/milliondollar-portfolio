import { NextResponse } from "next/server";
import Stripe from "stripe";

import { getServerSiteSlug } from "@/lib/site/siteConfig";
import { supabaseAdmin } from "@/lib/supabase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" });

type DepositRule = { id: number; rule_scope: string | null; price_basis: string | null; service_id: number | null; service_variation_id: number | null; client_email: string | null; payment_mode: string | null; deposit_type: string | null; deposit_value: number | null; min_total: number | null; max_total: number | null; priority: number | null };
type AddonRow = { id: number; name: string; price: number | null; duration: number | null; allow_quantity: boolean | null; min_quantity: number | null; max_quantity: number | null; quantity_label: string | null };
type ServiceQuantityRow = { allow_quantity: boolean | null; min_quantity: number | null; max_quantity: number | null; quantity_label: string | null };

function getSiteUrl(request: Request) { return (process.env.NEXT_PUBLIC_SITE_URL ?? request.headers.get("origin") ?? "http://localhost:3000").replace(/\/$/, ""); }
function timeToMinutes(time: string) { const [h, m] = time.split(":"); return Number(h) * 60 + Number(m ?? "0"); }
function minutesToTime(minutes: number) { const hours = Math.floor(minutes / 60) % 24; const mins = minutes % 60; return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`; }
function addMinutesToTime(time: string, minutesToAdd: number) { return minutesToTime(timeToMinutes(time) + minutesToAdd); }
function isCancelledStatus(status: string | null) { return status === "cancelled" || status === "rejected"; }
function roundMoney(value: number) { return Math.round(value * 100) / 100; }
function normalizePaymentMode(value: unknown) { const mode = String(value ?? "").trim(); return mode === "pay_later" || mode === "deposit" || mode === "full" ? mode : "pay_later"; }
function calculateDiscountAmount({ originalPrice, discountType, discountValue }: { originalPrice: number; discountType: string; discountValue: number }) { return discountType === "amount" ? Math.min(discountValue, originalPrice) : Math.min((originalPrice * discountValue) / 100, originalPrice); }
function calculateAmountDueNow({ discountedPrice, paymentMode, depositType, depositValue }: { discountedPrice: number; paymentMode: string; depositType: string; depositValue: number }) { if (paymentMode === "pay_later") return 0; if (paymentMode === "full") return discountedPrice; if (depositType === "amount") return Math.min(depositValue, discountedPrice); return Math.min((discountedPrice * depositValue) / 100, discountedPrice); }
function normalizeAddonIds(value: unknown) { if (!Array.isArray(value)) return []; return Array.from(new Set(value.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0))); }
function normalizeAddonQuantities(value: unknown) { const quantities: Record<string, number> = {}; if (!value || typeof value !== "object" || Array.isArray(value)) return quantities; for (const [key, raw] of Object.entries(value as Record<string, unknown>)) { const id = Number(key); const qty = Math.floor(Number(raw)); if (Number.isFinite(id) && id > 0 && Number.isFinite(qty) && qty > 0) quantities[String(id)] = qty; } return quantities; }
function clampQuantity(raw: unknown, allowQuantity: boolean | null | undefined, minValue: number | null | undefined, maxValue: number | null | undefined) { const min = Math.max(1, Number(minValue ?? 1)); const max = Math.max(min, Number(maxValue ?? 1)); if (!allowQuantity) return 1; const requested = Math.floor(Number(raw ?? min)); return Math.min(Math.max(Number.isFinite(requested) ? requested : min, min), max); }
function ruleMatches(rule: DepositRule, context: { serviceId: number | null; variationId: number | null; email: string; servicePrice: number; total: number }) { const scope = rule.rule_scope ?? "site"; const priceBasis = rule.price_basis === "total" ? "total" : "service"; const comparisonPrice = priceBasis === "total" ? context.total : context.servicePrice; const minTotal = rule.min_total === null || rule.min_total === undefined ? null : Number(rule.min_total); const maxTotal = rule.max_total === null || rule.max_total === undefined ? null : Number(rule.max_total); if (minTotal !== null && comparisonPrice < minTotal) return false; if (maxTotal !== null && comparisonPrice > maxTotal) return false; if (rule.client_email && rule.client_email.toLowerCase() !== context.email) return false; if (rule.service_id && rule.service_id !== context.serviceId) return false; if (rule.service_variation_id && rule.service_variation_id !== context.variationId) return false; if (scope === "client") return Boolean(rule.client_email); if (scope === "variation") return Boolean(rule.service_variation_id); if (scope === "service") return Boolean(rule.service_id); if (scope === "total" || scope === "price_tier") return minTotal !== null || maxTotal !== null; return true; }
async function upsertCrmClient(customerEmail: string, siteSlug: string) { const cleanEmail = customerEmail.trim().toLowerCase(); if (!cleanEmail) return null; const existingClient = await supabaseAdmin.from("crm_clients").select("id").eq("email", cleanEmail).eq("site_slug", siteSlug).maybeSingle(); if (!existingClient.error && existingClient.data?.id) return existingClient.data.id; const { data, error } = await supabaseAdmin.from("crm_clients").upsert({ email: cleanEmail, site_slug: siteSlug, source: "booking", last_contacted_at: new Date().toISOString() }, { onConflict: "site_slug,email" }).select("id").single(); if (error) { console.error("CRM CLIENT UPSERT ERROR:", error); return null; } return data?.id ?? null; }

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const siteSlug = getServerSiteSlug(request);
    const { service_id, variation_id, service_name, price, duration, customer_email, booking_date, booking_time, booking_end_time, notes, timezone, client_id, discount_code, tip_amount } = body;
    const explicitAddonIds = normalizeAddonIds(body.addon_ids ?? body.addons);
    const requestedQuantities = normalizeAddonQuantities(body.addon_quantities);
    const selectedAddonIds = Array.from(new Set([...explicitAddonIds, ...Object.keys(requestedQuantities).map(Number)])).filter((id) => Number.isFinite(id) && id > 0);
    const numericUnitPrice = Number(price);
    const numericUnitDuration = Number(duration);
    const numericTipAmount = Math.max(Number(tip_amount ?? 0), 0);
    const serviceId = service_id ? Number(service_id) : null;
    const variationId = variation_id ? Number(variation_id) : null;
    const cleanCustomerEmail = typeof customer_email === "string" ? customer_email.trim().toLowerCase() : "";
    if (!service_name || !cleanCustomerEmail || !booking_date || !booking_time || !timezone || !Number.isFinite(numericUnitPrice) || numericUnitPrice <= 0) return NextResponse.json({ error: "Missing required checkout information." }, { status: 400 });
    if (!serviceId) return NextResponse.json({ error: "A service is required." }, { status: 400 });

    const [{ data: serviceQuantityRules, error: serviceQuantityError }, { data: allowedAssignments, error: assignmentError }, { data: selectedAddons, error: addonError }] = await Promise.all([
      supabaseAdmin.from("services").select("allow_quantity,min_quantity,max_quantity,quantity_label").eq("site_slug", siteSlug).eq("id", serviceId).maybeSingle(),
      supabaseAdmin.from("service_addon_assignments").select("addon_id").eq("site_slug", siteSlug).eq("service_id", serviceId).eq("is_enabled", true),
      selectedAddonIds.length > 0 ? supabaseAdmin.from("service_addons").select("id,name,price,duration,allow_quantity,min_quantity,max_quantity,quantity_label").eq("site_slug", siteSlug).eq("is_active", true).in("id", selectedAddonIds) : Promise.resolve({ data: [], error: null }),
    ]);
    if (serviceQuantityError) throw serviceQuantityError;
    if (assignmentError) throw assignmentError;
    if (addonError) throw addonError;

    const serviceQuantity = clampQuantity(body.service_quantity, (serviceQuantityRules as ServiceQuantityRow | null)?.allow_quantity, (serviceQuantityRules as ServiceQuantityRow | null)?.min_quantity, (serviceQuantityRules as ServiceQuantityRow | null)?.max_quantity);
    const allowedAddonIds = new Set((allowedAssignments ?? []).map((item) => Number(item.addon_id)));
    const invalidAddon = selectedAddonIds.find((addonId) => !allowedAddonIds.has(addonId));
    if (invalidAddon) return NextResponse.json({ error: "One selected add-on is not available for this service." }, { status: 400 });

    const addonQuantities: Record<string, number> = {};
    for (const addon of (selectedAddons ?? []) as AddonRow[]) addonQuantities[String(addon.id)] = clampQuantity(requestedQuantities[String(addon.id)] ?? 1, addon.allow_quantity, addon.min_quantity, addon.max_quantity);
    const addonTotal = roundMoney(((selectedAddons ?? []) as AddonRow[]).reduce((sum, addon) => sum + Number(addon.price ?? 0) * (addonQuantities[String(addon.id)] ?? 1), 0));
    const addonDuration = ((selectedAddons ?? []) as AddonRow[]).reduce((sum, addon) => sum + Number(addon.duration ?? 0) * (addonQuantities[String(addon.id)] ?? 1), 0);
    const addonLabels = ((selectedAddons ?? []) as AddonRow[]).map((addon) => { const qty = addonQuantities[String(addon.id)] ?? 1; return `${addon.name}${qty > 1 ? ` x${qty}` : ""} ($${(Number(addon.price ?? 0) * qty).toFixed(2)})`; });
    const serviceUnitPrice = roundMoney(numericUnitPrice);
    const servicePrice = roundMoney(serviceUnitPrice * serviceQuantity);
    const serviceLabel = serviceQuantity > 1 ? `${service_name} x${serviceQuantity}` : service_name;
    const totalBeforeDiscount = roundMoney(servicePrice + addonTotal);
    const totalDuration = (Number.isFinite(numericUnitDuration) && numericUnitDuration > 0 ? numericUnitDuration * serviceQuantity : 60 * serviceQuantity) + addonDuration;
    const crmClientId = await upsertCrmClient(cleanCustomerEmail, siteSlug);
    const bookingEndTime = booking_end_time ?? addMinutesToTime(booking_time, totalDuration);
    const requestedStart = timeToMinutes(booking_time);
    const requestedEnd = timeToMinutes(bookingEndTime);
    if (requestedEnd <= requestedStart) return NextResponse.json({ error: "Booking end time must be after the start time." }, { status: 400 });

    const { data: availabilityWindows, error: availabilityError } = await supabaseAdmin.from("availability").select("id,available_date,available_time,start_time,end_time,timezone").eq("site_slug", siteSlug).eq("available_date", booking_date);
    if (availabilityError) return NextResponse.json({ error: "Availability could not be checked." }, { status: 500 });
    const fitsAvailability = (availabilityWindows ?? []).some((window) => { const windowStart = window.start_time ?? window.available_time; const windowEnd = window.end_time; if (!windowStart || !windowEnd) return false; return requestedStart >= timeToMinutes(windowStart) && requestedEnd <= timeToMinutes(windowEnd); });
    if (!fitsAvailability) return NextResponse.json({ error: "This time is no longer available." }, { status: 409 });

    const { data: existingBookings, error: existingBookingsError } = await supabaseAdmin.from("bookings").select("id,booking_time,booking_end_time,status").eq("site_slug", siteSlug).eq("booking_date", booking_date);
    if (existingBookingsError) return NextResponse.json({ error: "Existing bookings could not be checked." }, { status: 500 });
    const hasConflict = (existingBookings ?? []).some((booking) => { if (isCancelledStatus(booking.status)) return false; if (!booking.booking_time || !booking.booking_end_time) return false; return requestedStart < timeToMinutes(booking.booking_end_time) && requestedEnd > timeToMinutes(booking.booking_time); });
    if (hasConflict) return NextResponse.json({ error: "This time overlaps with an existing booking." }, { status: 409 });

    let paymentMode = "pay_later";
    let depositType = "amount";
    let depositValue = 0;
    const { data: depositRules, error: depositRulesError } = await supabaseAdmin.from("deposit_rules").select("id,rule_scope,price_basis,service_id,service_variation_id,client_email,payment_mode,deposit_type,deposit_value,min_total,max_total,priority").eq("site_slug", siteSlug).eq("is_active", true).order("priority", { ascending: true });
    if (depositRulesError) console.error("DEPOSIT RULES ERROR:", depositRulesError);
    const matchedDepositRule = (depositRules ?? []).find((rule) => ruleMatches(rule as DepositRule, { serviceId, variationId, email: cleanCustomerEmail, servicePrice, total: totalBeforeDiscount })) as DepositRule | undefined;
    if (matchedDepositRule) { paymentMode = normalizePaymentMode(matchedDepositRule.payment_mode); depositType = matchedDepositRule.deposit_type ?? "amount"; depositValue = Number(matchedDepositRule.deposit_value ?? 0); }

    const cleanDiscountCode = typeof discount_code === "string" ? discount_code.trim().toUpperCase() : "";
    let appliedDiscountCode = "";
    let discountAmount = 0;
    if (cleanDiscountCode) {
      const { data: discount, error: discountError } = await supabaseAdmin.from("discount_codes").select("*").eq("site_slug", siteSlug).eq("code", cleanDiscountCode).eq("is_active", true).maybeSingle();
      if (discountError) return NextResponse.json({ error: "Discount code could not be checked." }, { status: 500 });
      if (!discount) return NextResponse.json({ error: "Invalid discount code." }, { status: 400 });
      const now = new Date();
      if (discount.starts_at && new Date(discount.starts_at) > now) return NextResponse.json({ error: "This discount code is not active yet." }, { status: 400 });
      if (discount.expires_at && new Date(discount.expires_at) < now) return NextResponse.json({ error: "This discount code has expired." }, { status: 400 });
      if (discount.max_uses !== null && discount.max_uses !== undefined && Number(discount.used_count ?? 0) >= Number(discount.max_uses)) return NextResponse.json({ error: "This discount code has reached its usage limit." }, { status: 400 });
      discountAmount = roundMoney(calculateDiscountAmount({ originalPrice: totalBeforeDiscount, discountType: discount.discount_type, discountValue: Number(discount.discount_value) }));
      appliedDiscountCode = discount.code;
    }

    const discountedPrice = roundMoney(Math.max(totalBeforeDiscount - discountAmount, 0));
    const tipAmount = roundMoney(numericTipAmount);
    const depositBaseAmount = roundMoney(calculateAmountDueNow({ discountedPrice, paymentMode, depositType, depositValue }));
    const amountDueNow = roundMoney(depositBaseAmount + tipAmount);
    const depositAmount = paymentMode === "deposit" ? depositBaseAmount : 0;
    const remainingBalance = paymentMode === "pay_later" ? discountedPrice : paymentMode === "deposit" ? roundMoney(Math.max(discountedPrice - depositBaseAmount, 0)) : 0;
    const balanceStatus = remainingBalance > 0 ? "balance_due" : "not_applicable";
    const paymentStatus = paymentMode === "pay_later" ? "pay_later" : "pending";
    const cleanNotes = typeof notes === "string" ? notes.trim() : "";
    const normalizedNotes = [cleanNotes, serviceQuantity > 1 ? `Service Quantity: ${serviceQuantity}` : "", variationId ? `Variation ID: ${variationId}` : "", addonLabels.length ? `Add-ons: ${addonLabels.join(", ")}` : "", matchedDepositRule ? `Payment Rule ID: ${matchedDepositRule.id}` : "", matchedDepositRule ? `Payment Rule Mode: ${paymentMode}` : "No payment rule matched; book now/pay later applied.", appliedDiscountCode ? `Discount Code: ${appliedDiscountCode}` : "", tipAmount > 0 ? `Tip Added: $${tipAmount.toFixed(2)}` : "", paymentMode === "pay_later" ? `Pay later booking. Balance due after appointment: $${remainingBalance.toFixed(2)}` : "", paymentMode === "deposit" ? `Deposit paid upfront. Remaining balance due after appointment: $${remainingBalance.toFixed(2)}` : ""].filter(Boolean).join("\n");
    const { data: booking, error: bookingError } = await supabaseAdmin.from("bookings").insert({ site_slug: siteSlug, client_id: client_id || null, crm_client_id: crmClientId, service_id: serviceId, customer_email: cleanCustomerEmail, booking_date, booking_time, booking_end_time: bookingEndTime, payment_status: paymentStatus, status: "pending", notes: normalizedNotes, timezone, price_paid: amountDueNow, original_price: totalBeforeDiscount, discount_code: appliedDiscountCode || null, discount_amount: discountAmount, amount_due_now: amountDueNow, remaining_balance: remainingBalance, payment_mode: paymentMode, deposit_amount: depositAmount, tip_amount: tipAmount, balance_status: balanceStatus, service_quantity: serviceQuantity, addon_ids: selectedAddonIds, addon_quantities: addonQuantities, addon_total: addonTotal, deposit_rule_id: matchedDepositRule?.id ?? null, calculated_deposit: depositAmount }).select().single();
    if (bookingError || !booking) return NextResponse.json({ error: "Booking creation failed." }, { status: 500 });

    const siteUrl = getSiteUrl(request);
    if (paymentMode === "pay_later" && amountDueNow <= 0) return NextResponse.json({ url: `${siteUrl}/success?bookingId=${booking.id}&payment=pay_later` });
    if (amountDueNow <= 0) return NextResponse.json({ error: "Checkout amount must be greater than $0." }, { status: 400 });
    const checkoutLabel = paymentMode === "deposit" ? `${serviceLabel} Deposit` : serviceLabel;
    const descriptionParts = [serviceQuantity > 1 ? `Service quantity: ${serviceQuantity}` : "", addonLabels.length ? `Add-ons: ${addonLabels.join(", ")}` : "", paymentMode === "deposit" ? `Deposit payment. Remaining balance: $${remainingBalance.toFixed(2)}` : "", paymentMode === "full" ? "Full payment due now." : "", appliedDiscountCode ? `Discount applied: ${appliedDiscountCode}` : "", tipAmount > 0 ? `Tip included: $${tipAmount.toFixed(2)}` : ""].filter(Boolean);
    const session = await stripe.checkout.sessions.create({ mode: "payment", customer_email: cleanCustomerEmail, payment_method_types: ["card"], line_items: [{ price_data: { currency: "usd", product_data: { name: checkoutLabel, description: descriptionParts.length > 0 ? descriptionParts.join(" · ") : undefined }, unit_amount: Math.round(amountDueNow * 100) }, quantity: 1 }], metadata: { siteSlug, bookingId: booking.id.toString(), crmClientId: crmClientId ? String(crmClientId) : "", serviceId: serviceId ? serviceId.toString() : "", variationId: variationId ? variationId.toString() : "", serviceQuantity: String(serviceQuantity), addonIds: selectedAddonIds.join(","), addonQuantities: JSON.stringify(addonQuantities), depositRuleId: matchedDepositRule?.id ? String(matchedDepositRule.id) : "", depositPriceBasis: matchedDepositRule?.price_basis ?? "none", bookingDate: booking_date, bookingTime: booking_time, bookingEndTime, serviceUnitPrice: serviceUnitPrice.toFixed(2), servicePrice: servicePrice.toFixed(2), originalPrice: totalBeforeDiscount.toFixed(2), addonTotal: addonTotal.toFixed(2), discountCode: appliedDiscountCode, discountAmount: discountAmount.toFixed(2), depositBaseAmount: depositBaseAmount.toFixed(2), amountDueNow: amountDueNow.toFixed(2), remainingBalance: remainingBalance.toFixed(2), tipAmount: tipAmount.toFixed(2), paymentMode }, success_url: `${siteUrl}/success?bookingId=${booking.id}`, cancel_url: `${siteUrl}/cancel?bookingId=${booking.id}` });
    return NextResponse.json({ url: session.url });
  } catch (error) { console.error("CHECKOUT ERROR:", error); return NextResponse.json({ error: "Checkout failed." }, { status: 500 }); }
}
