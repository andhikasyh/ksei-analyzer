import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anonymous";

  const { allowed, remaining, retryAfterMs } = checkRateLimit(ip);

  if (!allowed) {
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    return new Response(
      JSON.stringify({
        error: `Rate limit exceeded. Try again in ${Math.ceil(retryAfterSec / 60)} minute(s).`,
        retryAfterMs,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfterSec),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await request.json();
  const { messages: clientMessages, context } = body;

  if (!Array.isArray(clientMessages) || clientMessages.length === 0) {
    return new Response(
      JSON.stringify({ error: "messages array is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let systemPrompt = `You are a friendly and knowledgeable Indonesian stock market analyst. You specialize in the Indonesia Stock Exchange (BEI/IDX) and help investors understand market dynamics, individual stocks, sectors, and investing strategies in the Indonesian market.

RULES:
1. Write in clear, simple English that anyone can understand.
2. When discussing numbers, explain what they mean in plain language.
3. Stay focused on the Indonesian stock market (BEI/IDX). If asked about unrelated topics, politely redirect: "I specialize in the Indonesian stock market. Want to ask something about IDX stocks or the market?"
4. Use bullet points for lists. NEVER use markdown tables.
5. Be concise but thorough.
6. Do not use any emojis.
7. You can discuss general investing concepts as they relate to the Indonesian market.
8. If you don't have specific data, say so honestly and provide general guidance.`;

  if (context?.reportDate && context?.reportSummary) {
    systemPrompt += `

CONTEXT: The user is viewing the market intelligence report for ${context.reportDate}.
Report summary: ${context.reportSummary}
Use this context when relevant to provide more specific answers about that day's market activity.`;
  }

  const anthropic = new Anthropic({ apiKey });

  const apiMessages = clientMessages.map(
    (m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })
  );

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: systemPrompt,
    messages: apiMessages,
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ text: event.delta.text })}\n\n`
              )
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Chat failed";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-RateLimit-Remaining": String(remaining),
    },
  });
}
