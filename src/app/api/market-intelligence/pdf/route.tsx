import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { renderToBuffer } from "@react-pdf/renderer";
import { MarketReportPDF } from "@/lib/pdf-report";
import type { MarketIntelligenceReport } from "@/lib/types";

export const maxDuration = 60;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(request: NextRequest) {
  const dateParam = request.nextUrl.searchParams.get("date");
  const lang = (request.nextUrl.searchParams.get("lang") || "en") as "en" | "id";

  if (!dateParam) {
    return NextResponse.json({ error: "Missing date parameter" }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("market_intelligence")
    .select("report, report_date, title")
    .eq("report_date", dateParam)
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.length || !data[0].report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const fullReport = data[0].report as MarketIntelligenceReport & { _indonesian?: MarketIntelligenceReport };
  const report = lang === "id" && fullReport._indonesian
    ? fullReport._indonesian
    : fullReport;

  const reportDate = data[0].report_date;
  const dateStr = new Date(reportDate + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const buffer = await renderToBuffer(
    <MarketReportPDF report={report} dateStr={dateStr} lang={lang} />
  );

  const filename = `LensaHam-Market-Report-${reportDate}-${lang.toUpperCase()}.pdf`;
  const uint8 = new Uint8Array(buffer);

  return new NextResponse(uint8, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
