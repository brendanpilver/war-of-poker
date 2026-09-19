import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Purchase, delivery, and operator surfaces. Each is also noindex.
      disallow: ["/api/", "/thank-you", "/downloads", "/growth"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
