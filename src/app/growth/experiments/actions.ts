"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, isAuthorizedToken } from "@/lib/admin-auth";
import { importMetrics, reviewRecommendation, setPieceStatus } from "@/lib/experiments/review";
import { supabaseAdmin } from "@/lib/supabase";
import { parseText } from "@/lib/validation";

/**
 * Operator actions for /growth/experiments. Each re-checks the operator
 * cookie itself: rendering a form only to the operator is not a security
 * boundary, because an action is a POST anyone can send. Next.js also
 * rejects cross-origin action requests.
 */

const PAGE = "/growth/experiments";

async function operatorDb() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAuthorizedToken(token)) redirect(`${PAGE}?notice=${encodeURIComponent("Sign in on /growth first.")}`);
  const db = supabaseAdmin();
  if (!db) redirect(`${PAGE}?notice=${encodeURIComponent("Supabase is not configured.")}`);
  return db;
}

function done(outcome: { ok: boolean; message: string }): never {
  redirect(`${PAGE}?notice=${encodeURIComponent(outcome.message)}${outcome.ok ? "" : "&error=1"}`);
}

export async function reviewAction(form: FormData) {
  const db = await operatorDb();
  const id = parseText(form.get("id"), 40);
  const decision = form.get("decision");
  const reason = parseText(form.get("reason"), 1000);
  if (!id || (decision !== "accept" && decision !== "reject" && decision !== "revise")) {
    done({ ok: false, message: "Choose accept, reject or revise." });
  }
  if (!reason) done({ ok: false, message: "Record a reason with every review." });
  const revisionRaw = form.get("revision");
  const revision = typeof revisionRaw === "string" && revisionRaw.trim().length > 0 ? revisionRaw.slice(0, 200_000) : null;
  done(await reviewRecommendation(db, { id, decision, reason, revision }));
}

export async function pieceStatusAction(form: FormData) {
  const db = await operatorDb();
  const contentId = parseText(form.get("contentId"), 20);
  const status = parseText(form.get("status"), 20);
  if (!contentId || !status) done({ ok: false, message: "Missing piece or status." });
  done(
    await setPieceStatus(db, {
      contentId,
      status,
      publishedUrl: parseText(form.get("publishedUrl"), 500),
      publishedOn: parseText(form.get("publishedOn"), 10),
    }),
  );
}

export async function importAction(form: FormData) {
  const db = await operatorDb();
  const csv = form.get("csv");
  if (typeof csv !== "string" || csv.trim().length === 0) done({ ok: false, message: "Paste the CSV first." });
  done(await importMetrics(db, csv.slice(0, 100_000)));
}
