import type { MetadataRoute } from "next";
import { articles } from "@/lib/content/articles";
import { siteUrl } from "@/lib/site";

/**
 * Only public, indexable pages. /thank-you, /downloads, and /growth are
 * deliberately absent -- they are private and marked noindex.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/short-stack-plo`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/plo-reality-check`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${siteUrl}/learn`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/river-potter`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/contact`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];

  return [
    ...staticRoutes,
    ...articles.map((article) => ({
      url: `${siteUrl}/learn/${article.slug}`,
      lastModified: new Date(article.updatedAt ?? article.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
