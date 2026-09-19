import type { MetadataRoute } from "next";
import { isProductionSite, siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // A staging deploy disallows everything: a preview copy of the whole site
  // must never be crawled, whatever its canonical tags say.
  if (!isProductionSite) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

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
