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

  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("user_dashboards")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ dashboards: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "My Dashboard";
  const layout = Array.isArray(body.layout) ? body.layout : [];
  const linkGroups = body.link_groups && typeof body.link_groups === "object" ? body.link_groups : {};
  const isDefault = body.is_default === true;

  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("user_dashboards")
    .insert({
      user_id: auth.user.id,
      name,
      layout,
      link_groups: linkGroups,
      is_default: isDefault,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Dashboard name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ dashboard: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const dashboardId = body.id;
  if (!dashboardId) {
    return NextResponse.json({ error: "Missing dashboard id" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.layout !== undefined) updates.layout = body.layout;
  if (body.link_groups !== undefined) updates.link_groups = body.link_groups;
  if (body.is_default !== undefined) updates.is_default = body.is_default;

  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("user_dashboards")
    .update(updates)
    .eq("id", dashboardId)
    .eq("user_id", auth.user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
  }
  return NextResponse.json({ dashboard: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const dashboardId = searchParams.get("id");
  if (!dashboardId) {
    return NextResponse.json({ error: "Missing dashboard id" }, { status: 400 });
  }

  const supabase = serviceClient();
  const { error } = await supabase
    .from("user_dashboards")
    .delete()
    .eq("id", dashboardId)
    .eq("user_id", auth.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
