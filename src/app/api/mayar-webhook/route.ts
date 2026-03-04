import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getUserIdByEmail(supabase: SupabaseClient<any>, email: string): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error || !data) return null;
  const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return found?.id ?? null;
}

const PAID_STATUSES = new Set(["paid", "settlement", "success", "completed"]);
const EXPIRED_STATUSES = new Set(["expired", "cancelled", "failed", "refunded"]);

const PAID_EVENTS = new Set([
  "payment.paid",
  "payment.success",
  "payment.completed",
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
  const secret = process.env.MAYAR_WEBHOOK_SECRET;
  const token =
    request.headers.get("x-mayar-token") ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (secret && token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = (payload.event as string | undefined) ?? "";
  const data = payload.data as Record<string, unknown> | undefined;

  if (!data) {
    return NextResponse.json({ ok: true, note: "no data field, ignoring" });
  }

  // Mayar sends camelCase: customerEmail. Also handle snake_case fallback.
  const email = (
    (data.customerEmail as string) ||
    (data.customer_email as string) ||
    (data.email as string)
  )?.trim();

  const orderId = (data.id || data.order_id) as string | undefined;
  const productId = (data.productId || data.product_id) as string | undefined;
  const rawStatus = ((data.status as string) ?? "").toLowerCase();

  if (!email) {
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
      console.warn(`Mayar webhook: no Supabase user found for email "${email}"`);
      return NextResponse.json({
        ok: true,
        note: `No user account found for ${email}. Ask them to sign up first.`,
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
      await supabase
        .from("pro_subscribers")
        .update({
          status: "active",
          expires_at: expiresAt.toISOString(),
          mayar_order_id: orderId ?? null,
          mayar_payment_link_id: productId ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    } else {
      await supabase.from("pro_subscribers").insert({
        user_id: userId,
        email,
        status: "active",
        plan: "monthly",
        mayar_order_id: orderId ?? null,
        mayar_payment_link_id: productId ?? null,
        expires_at: expiresAt.toISOString(),
      });
    }

    return NextResponse.json({ ok: true, action: "activated", email, userId });
  }

  if (isExpiredEvent) {
    const userId = await getUserIdByEmail(supabase, email);
    if (userId) {
      await supabase
        .from("pro_subscribers")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      return NextResponse.json({ ok: true, action: "expired", email, userId });
    }
    return NextResponse.json({ ok: true, action: "expired_noop", email });
  }

  return NextResponse.json({ ok: true, action: "ignored", event, status: rawStatus });
}
