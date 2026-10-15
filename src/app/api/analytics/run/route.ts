import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/admin-auth";
import { env } from "@/lib/env";
import { isCronAuthorized } from "@/lib/experiments/cron-auth";
import { runAnalyticsJob } from "@/lib/experiments/job";

/**
 * POST /api/analytics/run — the six-hour analytics job.
 *
 * Called by a Hostinger cron job every six hours (see
 * docs/CONTENT-EXPERIMENTS.md § Scheduling). Accepts `CRON_SECRET`, which can
 * do nothing but this, or the operator token.
 *
 * Idempotent per six-hour slot: a repeated call in the same slot returns 200
 * with `skipped`. `?force=1` (operator token only) reruns a finished slot.
 *
 * The status code is the monitoring signal. Anything but 2xx makes
 * `curl -f` fail, which Hostinger reports, and the job also pings the
 * external monitor when one is configured.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const operator = isAuthorized(request);
  if (!operator && !isCronAuthorized(request, env.cronSecret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const force = operator && new URL(request.url).searchParams.get("force") === "1";
  const result = await runAnalyticsJob({ force });
  return NextResponse.json(result, {
    status: result.status,
    headers: { "Cache-Control": "no-store" },
  });
}
