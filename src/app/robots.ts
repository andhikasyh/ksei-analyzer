import { getBaseUrl } from "@/lib/site";

export default function robots() {
  const baseUrl = getBaseUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
