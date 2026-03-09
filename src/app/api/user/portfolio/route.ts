import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const sc = createServiceClient();
  const { data, error } = await sc
    .from("user_portfolios")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ holdings: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { stock_code, shares, avg_price, notes, entry_date } = body;

  if (!stock_code || typeof stock_code !== "string") {
    return Response.json({ error: "stock_code is required" }, { status: 400 });
  }
  if (typeof shares !== "number" || shares <= 0) {
    return Response.json({ error: "shares must be a positive number" }, { status: 400 });
  }
  if (typeof avg_price !== "number" || avg_price <= 0) {
    return Response.json({ error: "avg_price must be a positive number" }, { status: 400 });
  }

  const sc = createServiceClient();

  const { data: existing } = await sc
    .from("user_portfolios")
    .select("id, shares, avg_price, notes")
    .eq("user_id", auth.user.id)
    .eq("stock_code", stock_code.toUpperCase())
    .is("closed_at", null)
    .maybeSingle();

  if (existing) {
    const oldShares = parseFloat(existing.shares) || 0;
    const oldAvg = parseFloat(existing.avg_price) || 0;
    const newTotalShares = oldShares + shares;
    const newAvgPrice = (oldAvg * oldShares + avg_price * shares) / newTotalShares;

    const { data, error } = await sc
      .from("user_portfolios")
      .update({
        shares: newTotalShares,
        avg_price: Math.round(newAvgPrice * 100) / 100,
        notes: notes || existing.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ holding: data });
  }

  const insertData: Record<string, unknown> = {
    user_id: auth.user.id,
    stock_code: stock_code.toUpperCase(),
    shares,
    avg_price,
    notes: notes || null,
    entry_date: entry_date || new Date().toISOString().split("T")[0],
  };

  let { data, error } = await sc
    .from("user_portfolios")
    .insert(insertData)
    .select()
    .single();

  if (error && error.message?.includes("entry_date")) {
    delete insertData.entry_date;
    ({ data, error } = await sc
      .from("user_portfolios")
      .insert(insertData)
      .select()
      .single());
  }

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ holding: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { id, shares, avg_price, notes, entry_date, closed_at, close_price } = body;

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const coreUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof shares === "number" && shares > 0) coreUpdates.shares = shares;
  if (typeof avg_price === "number" && avg_price > 0) coreUpdates.avg_price = avg_price;
  if (notes !== undefined) coreUpdates.notes = notes || null;

  const extUpdates: Record<string, unknown> = {};
  if (entry_date) extUpdates.entry_date = entry_date;
  if (closed_at !== undefined) extUpdates.closed_at = closed_at || null;
  if (close_price !== undefined) extUpdates.close_price = close_price || null;

  const sc = createServiceClient();
  const updates = { ...coreUpdates, ...extUpdates };
  let { data, error } = await sc
    .from("user_portfolios")
    .update(updates)
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select()
    .single();

  if (error && Object.keys(extUpdates).length > 0) {
    ({ data, error } = await sc
      .from("user_portfolios")
      .update(coreUpdates)
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .select()
      .single());
  }

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ holding: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const sc = createServiceClient();
  const { error } = await sc
    .from("user_portfolios")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
