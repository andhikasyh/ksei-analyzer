import { NextRequest, NextResponse } from "next/server";

// In-memory rate limiter — per-IP: 3 requests / 10 min, global: 30 requests / 10 min
const PER_IP_LIMIT = 3;
const GLOBAL_LIMIT = 30;
const WINDOW_MS = 10 * 60 * 1000;

const ipStore = new Map<string, { count: number; resetAt: number }>();
let globalCount = 0;
let globalResetAt = Date.now() + WINDOW_MS;

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();

  if (now > globalResetAt) {
    globalCount = 0;
    globalResetAt = now + WINDOW_MS;
  }
  if (globalCount >= GLOBAL_LIMIT) {
    return { allowed: false, retryAfterSec: Math.ceil((globalResetAt - now) / 1000) };
  }

  const entry = ipStore.get(ip);
  if (!entry || now > entry.resetAt) {
    ipStore.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    globalCount++;
    return { allowed: true, retryAfterSec: 0 };
  }
  if (entry.count >= PER_IP_LIMIT) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  globalCount++;
  return { allowed: true, retryAfterSec: 0 };
}

export async function POST(request: NextRequest) {
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const { allowed, retryAfterSec } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi nanti." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) },
      }
    );
  }

  let body: { type?: string; message?: string; email?: string; page?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type = "general", message, email, page } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const typeLabel: Record<string, string> = {
    bug: "Bug Report",
    suggestion: "Suggestion",
    general: "Feedback",
    data: "Data Issue",
  };

  const label = typeLabel[type] ?? "Feedback";
  const now = new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const text = [
    `*[${label}]* — ${now} WIB`,
    ``,
    `*Pesan:*`,
    message.trim(),
    ``,
    email ? `*Email:* ${email}` : null,
    page ? `*Halaman:* ${page}` : null,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    console.error("Google Chat webhook failed:", res.status, await res.text());
    return NextResponse.json({ error: "Failed to send" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
