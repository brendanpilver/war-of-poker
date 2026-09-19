"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { initAttribution, track } from "@/lib/analytics/track";

/**
 * Captures acquisition attribution on arrival and records a `page_view` for
 * every route. Mounted once in the root layout, inside Suspense because
 * `useSearchParams` opts its subtree out of static rendering otherwise.
 */
function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    // Attribution must be stored before the first page_view so that view
    // carries the content ID that produced it.
    initAttribution();
  }, []);

  useEffect(() => {
    // React may re-run effects without a real navigation; only the path
    // changing counts as a new page view.
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    const src = searchParams.get("src");
    track("page_view", { path: pathname, ...(src ? { src } : {}) });
  }, [pathname, searchParams]);

  return null;
}

export { AnalyticsTracker };
