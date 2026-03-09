import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getUserIdByEmail(supabase: SupabaseClient<any>, email: string): Promise<string | null> {
  const target = email.toLowerCase();

  // Paginate through all users (Supabase caps at 1000 per page)
  let page = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data?.users?.length) return null;
    const found = data.users.find((u) => u.email?.toLowerCase() === target);
    if (found) return found.id;
    if (data.users.length < 1000) return null;
    page++;
  }
}

const PAID_STATUSES = new Set(["paid", "settlement", "success", "completed"]);
const EXPIRED_STATUSES = new Set(["expired", "cancelled", "failed", "refunded"]);

const PAID_EVENTS = new Set([
  "payment.paid",
  "payment.success",
  "payment.completed",
  "payment.received",
  "payment.settlement",
  "testing",
]);

const EXPIRED_EVENTS = new Set([
  "payment.expired",
  "payment.failed",
  "payment.cancelled",
  "subscription.cancelled",
  "subscription.expired",
]);

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.MAYAR_WEBHOOK_SECRET;
  if (webhookSecret) {
    const tokenParam = request.nextUrl.searchParams.get("token");
    const tokenHeader = request.headers.get("x-webhook-secret");
    if (tokenParam !== webhookSecret && tokenHeader !== webhookSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = (payload.event as string | undefined) ?? "";
  const data = payload.data as Record<string, unknown> | undefined;

  console.log("Mayar webhook received:", { event, status: (data?.status as string) ?? "n/a" });

  if (!data) {
    return NextResponse.json({ ok: true, note: "no data field, ignoring" });
  }

  const email = (
    (data.customerEmail as string) ||
    (data.customer_email as string) ||
    (data.email as string)
  )?.trim();

  const orderId = (data.id || data.transactionId || data.order_id) as string | undefined;
  const productId = (data.productId || data.product_id) as string | undefined;
  const rawStatus = ((data.status as string) ?? "").toLowerCase();

  if (!email) {
    console.error("Mayar webhook: no email in payload", { event, keys: Object.keys(data) });
    return NextResponse.json({ error: "No customer email in payload" }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is not set");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const isPaidEvent = PAID_EVENTS.has(event) || PAID_STATUSES.has(rawStatus);
  const isExpiredEvent = EXPIRED_EVENTS.has(event) || EXPIRED_STATUSES.has(rawStatus);

  if (isPaidEvent) {
    const userId = await getUserIdByEmail(supabase, email);

    if (!userId) {
      console.warn(
        "Mayar webhook: PAID but no Supabase user found.",
        { email, orderId, amount: data.amount, event }
      );
      return NextResponse.json({
        ok: true,
        action: "paid_no_user",
        note: `No user account for ${email}. They need to sign up with this email first.`,
      });
    }

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const { data: existing } = await supabase
      .from("pro_subscribers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      const { error: updateErr } = await supabase
        .from("pro_subscribers")
        .update({
          status: "active",
          expires_at: expiresAt.toISOString(),
          mayar_order_id: orderId ?? null,
          mayar_payment_link_id: productId ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (updateErr) {
        console.error("Mayar webhook: update failed", updateErr);
        return NextResponse.json({ error: "Database update failed" }, { status: 500 });
      }
    } else {
      const { error: insertErr } = await supabase.from("pro_subscribers").insert({
        user_id: userId,
        email,
        status: "active",
        plan: "monthly",
        mayar_order_id: orderId ?? null,
        mayar_payment_link_id: productId ?? null,
        expires_at: expiresAt.toISOString(),
      });

      if (insertErr) {
        console.error("Mayar webhook: insert failed", insertErr);
        return NextResponse.json({ error: "Database insert failed" }, { status: 500 });
      }
    }

    console.log("Mayar webhook: activated pro for", { email, userId });
    return NextResponse.json({ ok: true, action: "activated", email, userId });
  }

  if (isExpiredEvent) {
    const userId = await getUserIdByEmail(supabase, email);
    if (userId) {
      const { error: updateErr } = await supabase
        .from("pro_subscribers")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (updateErr) console.error("Mayar webhook: expire update failed", updateErr);
      return NextResponse.json({ ok: true, action: "expired", email, userId });
    }
    return NextResponse.json({ ok: true, action: "expired_noop", email });
  }

  console.log("Mayar webhook: unhandled event", { event, rawStatus });
  return NextResponse.json({ ok: true, action: "ignored", event, status: rawStatus });
}
