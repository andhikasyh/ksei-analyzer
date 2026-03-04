import { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/site";
import { INVESTOR_TYPE_MAP } from "@/lib/types";
import { createClient } from "@supabase/supabase-js";

const baseUrl = getBaseUrl();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/screener`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/brokers`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/intelligent`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = Object.keys(INVESTOR_TYPE_MAP).map((type) => ({
    url: `${baseUrl}/category/${type.toLowerCase()}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  let dynamicRoutes: MetadataRoute.Sitemap = [];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const [stocksRes, investorsRes] = await Promise.all([
        supabase.from("main_db").select("SHARE_CODE").limit(3000),
        supabase.from("main_db").select("INVESTOR_NAME").limit(1500),
      ]);
      const stockCodes = [...new Set((stocksRes.data || []).map((r: { SHARE_CODE: string }) => r.SHARE_CODE))];
      const investorNames = [...new Set((investorsRes.data || []).map((r: { INVESTOR_NAME: string }) => encodeURIComponent(r.INVESTOR_NAME)))];
      dynamicRoutes = [
        ...stockCodes.map((code) => ({
          url: `${baseUrl}/stock/${code}`,
          lastModified: new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.6,
        })),
        ...investorNames.slice(0, 1000).map((name) => ({
          url: `${baseUrl}/investor/${name}`,
          lastModified: new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.5,
        })),
      ];
    } catch {
      // omit dynamic routes if DB unavailable (e.g. build without env)
    }
  }

  return [...staticRoutes, ...categoryRoutes, ...dynamicRoutes];
}
