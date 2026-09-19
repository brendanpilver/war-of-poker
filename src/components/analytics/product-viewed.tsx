"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/track";

/**
 * Records `product_viewed` once per mount. Rendered by the sales page so the
 * dashboard can compute a product-page-to-checkout conversion rate.
 */
export function ProductViewed({ product }: { product: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track("product_viewed", { product });
  }, [product]);

  return null;
}
