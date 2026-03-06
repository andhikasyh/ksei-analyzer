import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { scrapeStockNews } from "@/lib/stock-news";

export const maxDuration = 300;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

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
    const supabase = getSupabase();

    const { data: summaryData } = await supabase
      .from("idx_stock_summary")
      .select("stock_code")
      .order("date", { ascending: false })
      .limit(2000);

    if (!summaryData?.length) {
      await notifyGoogleChat("[Stock News] Cron FAILED: No stock data found");
      return NextResponse.json({ ok: false, error: "No stock data" }, { status: 404 });
    }

    const latestCodes = [...new Set(summaryData.map((r: { stock_code: string }) => r.stock_code))];

    const { data: companies } = await supabase
      .from("idx_companies")
      .select("kode_emiten, nama_emiten");

    const companyNames = new Map<string, string>();
    if (companies) {
      for (const c of companies) {
        companyNames.set(c.kode_emiten, c.nama_emiten);
      }
    }

    const result = await scrapeStockNews(latestCodes as string[], companyNames);

    await notifyGoogleChat(
      `[Stock News] Scrape completed — processed: ${result.processed}, inserted: ${result.inserted}`
    );
    return NextResponse.json({
      ok: true,
      processed: result.processed,
      inserted: result.inserted,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to scrape stock news";
    console.error("Cron stock-news failed:", message);
    await notifyGoogleChat(`[Stock News] Cron FAILED: ${message}`);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
