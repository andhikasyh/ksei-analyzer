import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const TABLE_NAME = "main_db";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

async function fetchNews(stockCode: string, companyName?: string): Promise<string[]> {
  const headlines: string[] = [];
  const queries = [
    `${stockCode} IDX saham`,
    ...(companyName ? [`${companyName} stock`] : []),
  ];

  for (const q of queries) {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=id&gl=ID&ceid=ID:id`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
      for (const item of items.slice(0, 5)) {
        const rawTitle = item.match(/<title>(.*?)<\/title>/)?.[1] || "";
        const title = rawTitle
          .replace(/<!\[CDATA\[/g, "")
          .replace(/\]\]>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();
        const source = item.match(/<source[^>]*>(.*?)<\/source>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() || "";
        const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
        const dateStr = pubDate ? new Date(pubDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
        if (title) {
          headlines.push(`- ${title}${source ? ` (${source})` : ""}${dateStr ? ` [${dateStr}]` : ""}`);
        }
      }
    } catch {
      // news fetching is best-effort
    }
  }

  const unique = [...new Set(headlines)];
  return unique.slice(0, 10);
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await request.json();
  const { stockCode, messages: clientMessages } = body;

  if (!stockCode) {
    return new Response(
      JSON.stringify({ error: "stockCode is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!Array.isArray(clientMessages) || clientMessages.length === 0) {
    return new Response(
      JSON.stringify({ error: "messages array is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = getSupabase();

  const [
    companyRes,
    ownershipRes,
    financialsRes,
    financialHistoryRes,
    marketRes,
    dividendRes,
    shareholderRes,
    directorsRes,
    commissionersRes,
    subsidiariesRes,
    bondsRes,
    splitsRes,
    corpActionsRes,
  ] = await Promise.all([
    supabase
      .from("idx_companies")
      .select("*")
      .eq("kode_emiten", stockCode)
      .maybeSingle(),
    supabase
      .from(TABLE_NAME)
      .select("INVESTOR_NAME, INVESTOR_TYPE, LOCAL_FOREIGN, PERCENTAGE, TOTAL_HOLDING_SHARES")
      .eq("SHARE_CODE", stockCode)
      .order("PERCENTAGE", { ascending: false })
      .limit(25),
    supabase
      .from("idx_financial_ratios")
      .select("*")
      .eq("code", stockCode)
      .order("fs_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("idx_financial_ratios")
      .select("fs_date, assets, liabilities, equity, sales, profit_period, eps, roe, roa, npm, per, price_bv, de_ratio")
      .eq("code", stockCode)
      .order("fs_date", { ascending: true }),
    supabase
      .from("idx_stock_summary")
      .select("*")
      .eq("stock_code", stockCode)
      .order("date", { ascending: false })
      .limit(30),
    supabase
      .from("idx_dividends")
      .select("*")
      .eq("code", stockCode)
      .order("ex_dividend", { ascending: false })
      .limit(20),
    supabase
      .from("idx_shareholders")
      .select("*")
      .eq("kode_emiten", stockCode)
      .order("snapshot_date", { ascending: false })
      .limit(20),
    supabase
      .from("idx_company_directors")
      .select("nama, jabatan, afiliasi")
      .eq("kode_emiten", stockCode),
    supabase
      .from("idx_company_commissioners")
      .select("nama, jabatan, afiliasi")
      .eq("kode_emiten", stockCode),
    supabase
      .from("idx_subsidiaries")
      .select("nama, bidang_usaha, lokasi, persentase, jumlah_aset, mata_uang, status_operasi")
      .eq("kode_emiten", stockCode)
      .order("jumlah_aset", { ascending: false })
      .limit(15),
    supabase
      .from("idx_bonds")
      .select("nama_emisi, rating, nominal, margin, listing_date, mature_date")
      .eq("kode_emiten", stockCode)
      .order("listing_date", { ascending: false })
      .limit(10),
    supabase
      .from("idx_stock_splits")
      .select("ratio, ssrs, nominal_value, nominal_value_new, listing_date")
      .eq("code", stockCode)
      .order("listing_date", { ascending: false }),
    supabase
      .from("idx_corporate_actions")
      .select("action_type, action_type_raw, num_of_shares, start_date, last_date")
      .eq("code", stockCode)
      .order("start_date", { ascending: false })
      .limit(15),
  ]);

  const stockData: Record<string, unknown> = { stockCode };

  if (companyRes.data) {
    const c = companyRes.data;
    stockData.companyProfile = {
      name: c.nama_emiten,
      sector: c.sektor,
      subSector: c.sub_sektor,
      industry: c.industri,
      subIndustry: c.sub_industri,
      mainBusiness: c.kegiatan_usaha_utama,
      address: c.alamat,
      website: c.website,
      email: c.email,
      phone: c.telepon,
      listingBoard: c.papan_pencatatan,
      listingDate: c.tanggal_pencatatan,
      registrar: c.bae,
      hasStocks: c.efek_saham,
      hasBonds: c.efek_obligasi,
    };
  }

  if (ownershipRes.data?.length) {
    const records = ownershipRes.data;
    const totalPct = records.reduce((s: number, r: any) => s + r.PERCENTAGE, 0);
    const localPct = records
      .filter((r: any) => r.LOCAL_FOREIGN === "L")
      .reduce((s: number, r: any) => s + r.PERCENTAGE, 0);
    const foreignPct = records
      .filter((r: any) => r.LOCAL_FOREIGN === "A")
      .reduce((s: number, r: any) => s + r.PERCENTAGE, 0);

    stockData.ownership = {
      totalInvestors: records.length,
      localPercentage: totalPct > 0 ? ((localPct / totalPct) * 100).toFixed(1) : "0",
      foreignPercentage: totalPct > 0 ? ((foreignPct / totalPct) * 100).toFixed(1) : "0",
      topHolders: records.slice(0, 15).map((r: any) => ({
        name: r.INVESTOR_NAME,
        type: r.INVESTOR_TYPE,
        origin: r.LOCAL_FOREIGN === "L" ? "Local" : "Foreign",
        percentage: r.PERCENTAGE,
        shares: r.TOTAL_HOLDING_SHARES,
      })),
    };
  }

  if (financialsRes.data) {
    const f = financialsRes.data;
    stockData.financials = {
      name: f.stock_name,
      sector: f.sector,
      subSector: f.sub_sector,
      industry: f.industry,
      subIndustry: f.sub_industry,
      sharia: f.sharia === "S",
      fsDate: f.fs_date,
      audit: f.audit === "U" ? "Unaudited" : "Audited",
      pe: f.per,
      pbv: f.price_bv,
      deRatio: f.de_ratio,
      roa: f.roa,
      roe: f.roe,
      npm: f.npm,
      eps: f.eps,
      bookValue: f.book_value,
      assets: f.assets,
      liabilities: f.liabilities,
      equity: f.equity,
      sales: f.sales,
      ebt: f.ebt,
      profitPeriod: f.profit_period,
    };
  }

  if (financialHistoryRes.data?.length) {
    stockData.financialHistory = financialHistoryRes.data.map((r: any) => ({
      date: r.fs_date,
      assets: r.assets,
      liabilities: r.liabilities,
      equity: r.equity,
      sales: r.sales,
      profit: r.profit_period,
      eps: r.eps,
      roe: r.roe,
      roa: r.roa,
      npm: r.npm,
      pe: r.per,
      pbv: r.price_bv,
      deRatio: r.de_ratio,
    }));
  }

  if (marketRes.data?.length) {
    const latest = marketRes.data[0];
    const close = parseFloat(latest.close) || 0;
    const listedShares = parseFloat(latest.listed_shares) || 0;

    stockData.marketData = {
      latestDate: latest.date,
      close,
      change: latest.change,
      open: latest.open_price,
      high: latest.high,
      low: latest.low,
      volume: latest.volume,
      value: latest.value,
      frequency: latest.frequency,
      marketCap: close * listedShares,
      listedShares: latest.listed_shares,
      foreignBuy: latest.foreign_buy,
      foreignSell: latest.foreign_sell,
      bid: latest.bid,
      offer: latest.offer,
      recentHistory: marketRes.data.slice(0, 10).map((r: any) => ({
        date: r.date,
        close: r.close,
        change: r.change,
        volume: r.volume,
        foreignBuy: r.foreign_buy,
        foreignSell: r.foreign_sell,
      })),
    };
  }

  if (dividendRes.data?.length) {
    stockData.dividends = dividendRes.data.map((d: any) => ({
      amount: d.cash_dividend,
      currency: d.currency,
      exDate: d.ex_dividend,
      paymentDate: d.payment_date,
      type: d.note,
    }));
  }

  if (shareholderRes.data?.length) {
    stockData.officialShareholders = shareholderRes.data.map((s: any) => ({
      date: s.snapshot_date,
      name: s.nama,
      category: s.kategori,
      shares: s.jumlah,
      percentage: s.persentase,
      isController: s.pengendali,
    }));
  }

  if (directorsRes.data?.length) {
    stockData.directors = directorsRes.data.map((d: any) => ({
      name: d.nama,
      position: d.jabatan,
      affiliated: d.afiliasi,
    }));
  }

  if (commissionersRes.data?.length) {
    stockData.commissioners = commissionersRes.data.map((c: any) => ({
      name: c.nama,
      position: c.jabatan,
      affiliated: c.afiliasi,
    }));
  }

  if (subsidiariesRes.data?.length) {
    stockData.subsidiaries = subsidiariesRes.data.map((s: any) => ({
      name: s.nama,
      business: s.bidang_usaha,
      location: s.lokasi,
      ownership: s.persentase + "%",
      assets: s.jumlah_aset,
      currency: s.mata_uang,
      status: s.status_operasi,
    }));
  }

  if (bondsRes.data?.length) {
    stockData.bonds = bondsRes.data.map((b: any) => ({
      name: b.nama_emisi,
      rating: b.rating,
      nominal: b.nominal,
      margin: b.margin,
      listed: b.listing_date,
      maturity: b.mature_date,
    }));
  }

  if (splitsRes.data?.length) {
    stockData.stockSplits = splitsRes.data.map((s: any) => ({
      ratio: s.ratio,
      type: s.ssrs === "SS" ? "Stock Split" : "Reverse Split",
      oldNominal: s.nominal_value,
      newNominal: s.nominal_value_new,
      date: s.listing_date,
    }));
  }

  if (corpActionsRes.data?.length) {
    stockData.corporateActions = corpActionsRes.data.map((ca: any) => ({
      type: ca.action_type,
      detail: ca.action_type_raw,
      shares: ca.num_of_shares,
      startDate: ca.start_date,
      endDate: ca.last_date,
    }));
  }

  const companyName = (stockData.companyProfile as any)?.name || (stockData.financials as any)?.name || "";
  const newsHeadlines = await fetchNews(stockCode, companyName);

  if (newsHeadlines.length > 0) {
    stockData.recentNews = newsHeadlines;
  }

  const systemPrompt = `You are a friendly stock market analyst who specializes in the Indonesia Stock Exchange (BEI/IDX). You explain things in simple, clear language that anyone can understand -- like explaining to a smart friend who is new to investing.

Here is ALL the data we have for stock ${stockCode} from our database:

${JSON.stringify(stockData, null, 2)}

IMPORTANT RULES FOR YOUR RESPONSES:

1. LANGUAGE STYLE:
   - Write like you're talking to a friend. Be clear and direct.
   - When showing numbers, always explain what they mean in plain language (e.g. "ROE of 15% -- this means for every Rp100 the company owns, it earns Rp15 in profit, which is pretty good").
   - Avoid jargon without explanation.
   - Use bullet points instead of tables. NEVER use markdown tables (the |---|---| format). Instead, present data as clean bullet points or short paragraphs.

2. SCORING & VERDICT (REQUIRED for initial analysis):
   - You MUST end every initial analysis with a "Final Verdict" section.
   - Give a score from 0-100 (0 = terrible, 100 = exceptional).
   - Give a clear action: STRONG BUY / BUY / HOLD / SELL / STRONG SELL.
   - Include simple buy/sell guidance: "Consider buying if price drops below X" or "Good entry point around X" etc.
   - Explain when someone should consider buying or selling this stock in 2-3 sentences max.

3. NEWS CONTEXT:
   - If recent news headlines are provided in the data, reference them in your analysis.
   - Mention if the news sentiment is positive, negative, or neutral and how it might affect the stock.
   - If no news is available, briefly note that and focus on the data.

4. STRUCTURE for initial analysis:
   - Start with a one-paragraph "Quick Summary" (2-3 sentences max, what does this company do, is it good or bad).
   - "The Good" -- bullet points of strengths.
   - "The Concerns" -- bullet points of risks/weaknesses.
   - "Financial Health" -- simple explanation of the key numbers.
   - "Ownership & Market" -- who owns it, how it trades.
   - "Recent News" -- if available, what's happening.
   - "Final Verdict" -- score, action, and when to buy/sell.

5. FOR FOLLOW-UP QUESTIONS:
   - Answer concisely and directly.
   - Stay focused on the stock data and Indonesian stock market.
   - If the user asks something unrelated to Indonesian stocks or investing, politely redirect them: "I can only help with questions about Indonesian stocks and the IDX market. Want to ask something about ${stockCode} or another IDX stock?"
   - You can compare with other IDX stocks if asked.
   - You have access to the stock data shown above -- use it when relevant.

Do not use any emojis. Do not use markdown tables.`;

  const anthropic = new Anthropic({ apiKey });

  const apiMessages = clientMessages.map((m: { role: string; content: string }) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
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
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err: any) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: err.message || "Analysis failed" })}\n\n`
          )
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
    },
  });
}
