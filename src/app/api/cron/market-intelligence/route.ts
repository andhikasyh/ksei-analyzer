import { NextRequest, NextResponse } from "next/server";
import { generateMarketIntelligenceReport } from "@/lib/market-intelligence";

export const maxDuration = 300;

async function notifyGoogleChat(text: string) {
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (e) {
    console.error("Google Chat notification failed:", e);
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await generateMarketIntelligenceReport();
    await notifyGoogleChat(
      `[Market Intelligence] Report generated successfully for ${result.reportDate} (created at ${result.createdAt})`
    );
    return NextResponse.json({
      ok: true,
      reportDate: result.reportDate,
      createdAt: result.createdAt,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to generate report";
    console.error("Cron market-intelligence failed:", message);
    await notifyGoogleChat(`[Market Intelligence] Cron FAILED: ${message}`);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
