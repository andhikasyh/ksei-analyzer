import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth";

const VALID_LOCALES = ["id", "en"] as const;

function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const userId = auth.user.id;

  const supabase = serviceClient();
  const { data } = await supabase
    .from("user_preferences")
    .select("locale")
    .eq("user_id", userId)
    .maybeSingle();

  return NextResponse.json({
    locale: data?.locale ?? "id",
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const userId = auth.user.id;

  const body = await request.json().catch(() => ({}));
  const locale = typeof body.locale === "string" ? body.locale : "id";
  if (!VALID_LOCALES.includes(locale as "id" | "en")) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  const supabase = serviceClient();
  const { error } = await supabase
    .from("user_preferences")
    .upsert(
      { user_id: userId, locale, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

  if (error) {
    console.error("Failed to save locale:", error.message);
    return NextResponse.json({ error: "Failed to save locale" }, { status: 500 });
  }
  return NextResponse.json({ locale });
}
