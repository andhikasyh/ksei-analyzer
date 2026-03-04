import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const code = request.nextUrl.searchParams.get("code");
  const codes = request.nextUrl.searchParams.get("codes");

  if (!code && !codes) {
    return NextResponse.json({ error: "code or codes parameter required" }, { status: 400 });
  }

  const codeList = codes
    ? codes.split(",").map((c) => c.trim()).filter(Boolean)
    : [code!];

  const { data, error } = await supabase
    .from("stock_news")
    .select("*")
    .in("stock_code", codeList)
    .order("published_at", { ascending: false })
    .limit(codeList.length * 10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data || [] });
}
