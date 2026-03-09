import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth";

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
  const { data, error } = await supabase
    .from("lab_experiments")
    .select("id, name, type, config, results, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Failed to fetch experiments:", error.message);
    return NextResponse.json({ error: "Failed to fetch experiments" }, { status: 500 });
  }
  return NextResponse.json({ experiments: data || [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const userId = auth.user.id;

  const body = await request.json().catch(() => null);
  if (!body?.name || !body?.type || !body?.config || !body?.results) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (typeof body.name !== "string" || body.name.length > 200) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("lab_experiments")
    .insert({
      user_id: userId,
      name: body.name,
      type: body.type,
      config: body.config,
      results: body.results,
    })
    .select("id, name, type, created_at")
    .single();

  if (error) {
    console.error("Failed to save experiment:", error.message);
    return NextResponse.json({ error: "Failed to save experiment" }, { status: 500 });
  }
  return NextResponse.json({ experiment: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const userId = auth.user.id;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const supabase = serviceClient();
  const { error } = await supabase
    .from("lab_experiments")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to delete experiment:", error.message);
    return NextResponse.json({ error: "Failed to delete experiment" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
