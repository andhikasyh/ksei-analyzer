import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getUserIdByEmail(supabase: SupabaseClient<any>, email: string): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error || !data) return null;
  const found = data.users.find((u) => u.email === email);
  return found?.id ?? null;
}

export async function POST(request: NextRequest) {
  const secret = process.env.MAYAR_WEBHOOK_SECRET;
  const token = request.headers.get("x-mayar-token") || request.headers.get("authorization")?.replace("Bearer ", "");

  if (secret && token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = payload.event as string;
  if (!event) {
    return NextResponse.json({ ok: true });
  }

  const data = payload.data as Record<string, unknown> | undefined;
  if (!data) return NextResponse.json({ ok: true });

  const email = (data.customer_email || data.email) as string | undefined;
  const orderId = (data.id || data.order_id) as string | undefined;
  const paymentLinkId = (data.payment_link_id || data.paymentLinkId) as string | undefined;
  const status = (data.status as string) || "paid";

  if (!email) {
    return NextResponse.json({ error: "No email in payload" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const isPaidEvent = status === "paid" || status === "settlement" || event === "payment.paid" || event === "payment.success";
  const isExpiredEvent = event === "payment.expired" || event === "subscription.cancelled" || status === "expired" || status === "cancelled";

  if (isPaidEvent) {
    const userId = await getUserIdByEmail(supabase, email);

    if (!userId) {
      console.warn(`Mayar webhook: no user found for email ${email}`);
      return NextResponse.json({ ok: true });
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
          mayar_order_id: orderId,
          mayar_payment_link_id: paymentLinkId,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    } else {
      await supabase.from("pro_subscribers").insert({
        user_id: userId,
        email,
        status: "active",
        plan: "monthly",
        mayar_order_id: orderId,
        mayar_payment_link_id: paymentLinkId,
        expires_at: expiresAt.toISOString(),
      });
    }
  }

  if (isExpiredEvent) {
    const userId = await getUserIdByEmail(supabase, email);
    if (userId) {
      await supabase
        .from("pro_subscribers")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    }
  }

  return NextResponse.json({ ok: true });
}
