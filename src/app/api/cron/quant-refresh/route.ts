import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 120;

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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
  } catch {
    // silent
  }
}

export async function GET(request: NextRequest) {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return NextResponse.json({ error: "Crons only run in production" }, { status: 403 });
  }

  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const results: { view: string; ok: boolean; error?: string; ms: number }[] = [];

  const views = [
    "mv_broker_correlation",
    "mv_broker_clusters",
    "mv_stock_regime",
  ];

  for (const view of views) {
    const start = Date.now();
    try {
      const { error } = await supabase.rpc("refresh_materialized_view", {
        view_name: view,
      });
      if (error) {
        results.push({ view, ok: false, error: error.message, ms: Date.now() - start });
      } else {
        results.push({ view, ok: true, ms: Date.now() - start });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      results.push({ view, ok: false, error: msg, ms: Date.now() - start });
    }
  }

  const allOk = results.every((r) => r.ok);
  const summary = results
    .map((r) => `${r.view}: ${r.ok ? "OK" : "FAIL"} (${r.ms}ms)${r.error ? " - " + r.error : ""}`)
    .join("\n");

  await notifyGoogleChat(
    `[Quant Refresh] ${allOk ? "All views refreshed" : "Some views FAILED"}\n${summary}`
  );

  return NextResponse.json({ ok: allOk, results }, { status: allOk ? 200 : 500 });
}
