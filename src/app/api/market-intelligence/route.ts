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
  const dateParam = request.nextUrl.searchParams.get("date");
  const listParam = request.nextUrl.searchParams.get("list");
  const limitParam = request.nextUrl.searchParams.get("limit");

  if (listParam === "true") {
    const limit = Math.min(parseInt(limitParam || "20", 10) || 20, 50);
    const { data, error } = await supabase
      .from("market_intelligence")
      .select("id, report_date, title, image_url, report, created_at")
      .order("report_date", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = (data || []).map((row: Record<string, unknown>) => {
      const report = row.report as Record<string, unknown> | null;
      const outlook = report?.marketOutlook as Record<string, unknown> | undefined;
      const overview = report?.marketOverview as Record<string, unknown> | undefined;
      return {
        id: row.id,
        report_date: row.report_date,
        title: row.title || (report as Record<string, unknown>)?.title || null,
        image_url: row.image_url,
        sentiment: outlook?.sentiment || "neutral",
        summary: overview?.summary || "",
        created_at: row.created_at,
      };
    });

    return NextResponse.json({ items });
  }

  let query = supabase
    .from("market_intelligence")
    .select("*")
    .order("report_date", { ascending: false })
    .limit(1);

  if (dateParam) {
    query = supabase
      .from("market_intelligence")
      .select("*")
      .eq("report_date", dateParam)
      .limit(1);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.length) {
    return NextResponse.json({ report: null });
  }

  return NextResponse.json({
    report: data[0].report,
    reportDate: data[0].report_date,
    title: data[0].title,
    imageUrl: data[0].image_url,
    createdAt: data[0].created_at,
  });
}
