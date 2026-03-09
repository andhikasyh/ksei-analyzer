import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const VALID_LOCALES = ["id", "en"] as const;

function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const userId = request.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ locale });
}
