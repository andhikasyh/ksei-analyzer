import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth";

const FREE_INSIGHT_LIMIT = 1;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serviceClient(): SupabaseClient<any> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(_request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const userId = auth.user.id;

  const supabase = serviceClient();
  const { data } = await supabase
    .from("free_insight_views")
    .select("view_count")
    .eq("user_id", userId)
    .maybeSingle();

  return NextResponse.json({
    view_count: data?.view_count ?? 0,
    limit: FREE_INSIGHT_LIMIT,
    has_free_views: (data?.view_count ?? 0) < FREE_INSIGHT_LIMIT,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const userId = auth.user.id;

  const body = await request.json().catch(() => ({}));
  const { action, code } = body as { action?: string; code?: string };

  const supabase = serviceClient();

  if (action === "consume_view") {
    const { data: existing } = await supabase
      .from("free_insight_views")
      .select("id, view_count")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      if (existing.view_count >= FREE_INSIGHT_LIMIT) {
        return NextResponse.json({ allowed: false, view_count: existing.view_count, limit: FREE_INSIGHT_LIMIT });
      }
      await supabase
        .from("free_insight_views")
        .update({ view_count: existing.view_count + 1, last_viewed_at: new Date().toISOString() })
        .eq("user_id", userId);
      return NextResponse.json({ allowed: true, view_count: existing.view_count + 1, limit: FREE_INSIGHT_LIMIT });
    } else {
      await supabase.from("free_insight_views").insert({ user_id: userId, view_count: 1 });
      return NextResponse.json({ allowed: true, view_count: 1, limit: FREE_INSIGHT_LIMIT });
    }
  }

  if (action === "redeem" && code) {
    const normalizedCode = code.trim().toUpperCase();

    const { data: existingPro } = await supabase
      .from("pro_subscribers")
      .select("id, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (existingPro) {
      return NextResponse.json({ error: "Kamu sudah menjadi Pro member." }, { status: 400 });
    }

    const { data: refCode } = await supabase
      .from("referral_codes")
      .select("id, quota, used_count, free_months, active, expires_at")
      .eq("code", normalizedCode)
      .maybeSingle();

    if (!refCode) {
      return NextResponse.json({ error: "Kode referral tidak ditemukan." }, { status: 404 });
    }

    if (!refCode.active) {
      return NextResponse.json({ error: "Kode referral sudah tidak aktif." }, { status: 400 });
    }

    if (refCode.expires_at && new Date(refCode.expires_at) < new Date()) {
      return NextResponse.json({ error: "Kode referral sudah kedaluwarsa." }, { status: 400 });
    }

    if (refCode.used_count >= refCode.quota) {
      return NextResponse.json({ error: "Kode referral sudah habis kuotanya." }, { status: 400 });
    }

    const { data: alreadyRedeemed } = await supabase
      .from("referral_redemptions")
      .select("id")
      .eq("user_id", userId)
      .eq("code_id", refCode.id)
      .maybeSingle();

    if (alreadyRedeemed) {
      return NextResponse.json({ error: "Kamu sudah pernah menggunakan kode ini." }, { status: 400 });
    }

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + (refCode.free_months ?? 1));

    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const email = userData?.user?.email ?? "";

    const { data: existingSub } = await supabase
      .from("pro_subscribers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingSub) {
      await supabase
        .from("pro_subscribers")
        .update({ status: "active", expires_at: expiresAt.toISOString(), updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    } else {
      await supabase.from("pro_subscribers").insert({
        user_id: userId,
        email,
        status: "active",
        plan: "referral",
        expires_at: expiresAt.toISOString(),
      });
    }

    await supabase.from("referral_redemptions").insert({ code_id: refCode.id, user_id: userId });

    await supabase
      .from("referral_codes")
      .update({ used_count: refCode.used_count + 1 })
      .eq("id", refCode.id)
      .lt("used_count", refCode.quota);

    return NextResponse.json({
      ok: true,
      free_months: refCode.free_months,
      expires_at: expiresAt.toISOString(),
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
