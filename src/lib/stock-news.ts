import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function decodeEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

interface ScrapedNewsItem {
  stock_code: string;
  headline: string;
  source: string;
  url: string;
  published_at: string | null;
}

async function scrapeNewsForStock(
  code: string,
  companyName?: string
): Promise<ScrapedNewsItem[]> {
  const items: ScrapedNewsItem[] = [];
  const queries = [
    `${code} IDX saham`,
    ...(companyName ? [companyName] : []),
  ];

  for (const q of queries) {
    try {
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=id&gl=ID&ceid=ID:id`;
      const res = await fetch(rssUrl, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const xml = await res.text();
      const rssItems = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

      for (const item of rssItems.slice(0, 5)) {
        const rawTitle = item.match(/<title>(.*?)<\/title>/)?.[1] || "";
        const headline = decodeEntities(rawTitle);
        if (!headline) continue;

        const source = decodeEntities(
          item.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || ""
        );
        const link = item.match(/<link>(.*?)<\/link>/)?.[1]?.trim() || "";
        const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
        const publishedAt = pubDate
          ? new Date(pubDate).toISOString().split("T")[0]
          : null;

        items.push({
          stock_code: code,
          headline,
          source,
          url: link,
          published_at: publishedAt,
        });
      }
    } catch {
      // best-effort per query
    }
  }

  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.headline)) return false;
    seen.add(item.headline);
    return true;
  }).slice(0, 8);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function scrapeStockNews(
  stockCodes: string[],
  companyNames: Map<string, string>
): Promise<{ processed: number; inserted: number }> {
  const supabase = getSupabase();
  let totalInserted = 0;
  const batchSize = 20;

  for (let i = 0; i < stockCodes.length; i += batchSize) {
    const batch = stockCodes.slice(i, i + batchSize);

    const batchResults = await Promise.allSettled(
      batch.map((code) => scrapeNewsForStock(code, companyNames.get(code)))
    );

    const allItems: ScrapedNewsItem[] = [];
    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        allItems.push(...result.value);
      }
    }

    if (allItems.length > 0) {
      const { error } = await supabase
        .from("stock_news")
        .upsert(allItems, { onConflict: "stock_code,headline", ignoreDuplicates: true });

      if (!error) {
        totalInserted += allItems.length;
      } else {
        console.error("stock_news upsert error:", error.message);
      }
    }

    if (i + batchSize < stockCodes.length) {
      await sleep(1000);
    }
  }

  return { processed: stockCodes.length, inserted: totalInserted };
}
