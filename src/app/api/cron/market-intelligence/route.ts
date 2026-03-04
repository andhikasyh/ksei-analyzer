import { NextRequest, NextResponse } from "next/server";
import { generateMarketIntelligenceReport } from "@/lib/market-intelligence";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await generateMarketIntelligenceReport();
    return NextResponse.json({
      ok: true,
      reportDate: result.reportDate,
      createdAt: result.createdAt,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to generate report";
    console.error("Cron market-intelligence failed:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
