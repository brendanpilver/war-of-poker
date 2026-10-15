/**
 * Builds the editorial approval sheet for candidate marketing examples.
 *
 *   npm run approval:batch            → renders/approval-batch.html
 *
 * Every check on the sheet is recomputed here from the example data, with the
 * same Omaha evaluator and paid-inventory fixture the test suite uses -- the
 * sheet cannot disagree with the code. Approving an example is an edit to
 * src/lib/experiments/examples.ts (status "approved", reviewedBy, reviewedOn),
 * made only on the owner's word.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { cards, type Card } from "../src/lib/poker/cards";
import { hands } from "../src/lib/quiz/hands";
import { marketingExamples, type MarketingExample } from "../src/lib/experiments/examples";
import { buildTimeline } from "../src/lib/experiments/script";
import { DEFAULT_BASELINE } from "../src/lib/experiments/planner";
import { hookTypes } from "../src/lib/experiments/spec";
import { paidCardRuns } from "../tests/paid-examples.fixture";
import { equityAgainst, handClass, holdsTheNuts, unseen } from "../tests/plo-eval";

/** Study holdings named in the copy, checked exactly. */
const STUDY: Record<string, { holding: string; label: string }> = {
  "mx-003": { holding: "Qc Qs 7d 6d", label: "top set (Q♣Q♠7♦6♦)" },
  "mx-005": { holding: "Ts 9h Jc 2d", label: "the higher straight (T♠9♥J♣2♦)" },
};

const key = (list: Card[]) => list.map((c) => `${c.rank}${c.suit}`).sort().join(" ");
const glyph: Record<string, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };
const red = (c: Card) => c.suit === "h" || c.suit === "d";
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function cardHtml(list: Card[]): string {
  return list
    .map((c) => `<span class="card${red(c) ? " red" : ""}">${c.rank === "T" ? "10" : c.rank}${glyph[c.suit]}</span>`)
    .join("");
}

const paid = new Set(paidCardRuns.map((r) => key(cards(r))));
const paidFlops = new Set(paidCardRuns.map((r) => key(cards(r).slice(0, 3))));
const challengeHoldings = new Set(hands.flatMap((h) => [h.hand, ...h.choices.map((c) => c.cards ?? [])]).filter((l) => l.length === 4).map(key));
const challengeFlops = new Set(hands.filter((h) => h.board.length >= 3).map((h) => key(h.board.slice(0, 3))));

type Check = { label: string; ok: boolean; detail: string };

function checks(e: MarketingExample): Check[] {
  const all = [...e.hand, ...e.board];
  const others = marketingExamples.filter((o) => o.id !== e.id);
  const out: Check[] = [
    { label: "Legal cards, no duplicates", ok: new Set(all.map((c) => `${c.rank}${c.suit}`)).size === all.length, detail: `${all.length} distinct cards` },
    { label: "Not a paid book / Capstone holding or flop", ok: !paid.has(key(e.hand)) && !paidFlops.has(key(e.board.slice(0, 3))), detail: `checked against ${paidCardRuns.length} printed card runs` },
    { label: "Not a 10-Hand Challenge holding or flop", ok: !challengeHoldings.has(key(e.hand)) && !challengeFlops.has(key(e.board.slice(0, 3))), detail: `checked against ${hands.length} Challenge hands` },
    { label: "Not another example's holding or flop", ok: others.every((o) => key(o.hand) !== key(e.hand) && key(o.board.slice(0, 3)) !== key(e.board.slice(0, 3))), detail: `${others.length} other examples` },
    { label: "Answer is one of the choices", ok: e.choices.includes(e.answer), detail: `${e.choices.join(" / ")} → ${e.answer}` },
  ];
  const made = handClass(e.hand, e.board);
  out.push({ label: "Made hand now", ok: true, detail: `${made}${holdsTheNuts(e.hand, e.board) ? " — the current nuts" : " — not the nuts"}` });
  if (e.board.length < 5) {
    const nut = unseen(e.hand, e.board).filter((c) => holdsTheNuts(e.hand, [...e.board, c])).length;
    out.push({ label: "Next cards that give the nuts", ok: true, detail: `${nut} of ${unseen(e.hand, e.board).length} unseen (${Math.round((nut / (52 - all.length)) * 100)}%)` });
  }
  const study = STUDY[e.id];
  if (study) {
    out.push({ label: "Equity against a study holding", ok: true, detail: `${(equityAgainst(e.hand, cards(study.holding), e.board) * 100).toFixed(1)}% vs ${study.label}, exact enumeration` });
  }
  if (e.facing) {
    out.push({ label: "Price to call", ok: true, detail: `$${e.facing} to win a final $${e.pot + e.facing}: needs ${Math.round((e.facing / (e.pot + e.facing)) * 100)}%` });
  }
  out.push({ label: "SPR at the start of this street", ok: true, detail: `$${e.behind} ÷ $${e.streetPot} = ${(e.behind / e.streetPot).toFixed(2)}` });
  const fits = hookTypes.filter((hook) =>
    buildTimeline(
      { specVersion: 1, engineVersion: "sheet", contentId: null, series: "PRC", exampleId: e.id, settings: { ...DEFAULT_BASELINE, hook, lesson: e.lesson }, experimentId: null, variant: null, recommendationId: null, publishOrder: null },
      e,
    ).ok,
  );
  out.push({ label: "Narratable in 25s (brisk)", ok: fits.length === hookTypes.length, detail: `${fits.length} of ${hookTypes.length} hooks` });
  return out;
}

const batch = marketingExamples.filter((e) => e.status === "candidate");
const rows = batch
  .map((e) => {
    const list = checks(e);
    return `<article>
  <header><h2>${e.id}</h2><span class="lesson">${esc(e.lesson)}</span><span class="status">${e.status}</span></header>
  <div class="grid">
    <div>
      <p class="game">${esc(e.game)} · ${esc(e.heroPosition)}</p>
      <p><span class="lbl">Hand</span>${cardHtml(e.hand)}</p>
      <p><span class="lbl">Board</span>${cardHtml(e.board)}</p>
      <ol class="action">${e.timeline.map((l) => `<li>${esc(l)}</li>`).join("")}</ol>
      <p class="money">Pot $${e.pot}${e.facing ? ` · to call $${e.facing}` : ""} · behind $${e.behind}</p>
      <p class="q">${esc(e.prompt)} <b>${esc(e.answerLine)}</b></p>
      ${e.beats.map((b) => `<p class="beat"><span class="lbl">${b.factor}</span>${esc(b.text)}</p>`).join("")}
      <p class="principle">“${esc(e.principle)}”</p>
      <p class="hooks"><span class="lbl">Hooks</span>common-mistake: “${esc(e.hookLines["common-mistake"] ?? "—")}” · curiosity: “${esc(e.hookLines.curiosity ?? "—")}”</p>
    </div>
    <div>
      <table>${list.map((c) => `<tr><td class="${c.ok ? "ok" : "bad"}">${c.ok ? "✓" : "✗"}</td><td>${esc(c.label)}</td><td>${esc(c.detail)}</td></tr>`).join("")}</table>
      <p class="src"><span class="lbl">Source</span>${esc(e.provenance.source)}</p>
      <p class="src"><span class="lbl">Notes</span>${esc(e.provenance.notes)}</p>
      <p class="src"><span class="lbl">Author</span>${esc(e.provenance.author)} · <b>Reviewer: ${esc(e.provenance.reviewedBy ?? "not yet reviewed")}</b></p>
    </div>
  </div>
</article>`;
  })
  .join("\n");

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Example approval batch</title>
<style>
:root{--ink:#0b0a09;--card:#181713;--line:#2a2823;--bone:#efe5db;--muted:#aea797;--faint:#86806f;--gold:#d6a129;--red:#a8202a}
body{margin:0;background:var(--ink);color:var(--bone);font:14px/1.45 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;padding:24px 16px}
main{max-width:1180px;margin:0 auto}h1{font-size:26px;margin:0 0 6px}.intro{color:var(--muted);max-width:760px}
article{border:1px solid var(--line);background:var(--card);margin:18px 0;padding:16px}
header{display:flex;gap:12px;align-items:baseline}h2{margin:0;font:700 18px Menlo,monospace;color:var(--gold)}
.lesson,.status{font:11px Menlo,monospace;text-transform:uppercase;letter-spacing:.12em;color:var(--faint)}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:10px}@media(max-width:820px){.grid{grid-template-columns:1fr}}
.card{display:inline-block;background:var(--bone);color:#16150f;border-radius:3px;padding:1px 5px;margin-right:4px;font-weight:700}.card.red{color:var(--red)}
.lbl{display:inline-block;min-width:64px;font:10px Menlo,monospace;text-transform:uppercase;letter-spacing:.12em;color:var(--faint)}
.game,.money{font-family:Menlo,monospace;color:var(--muted);font-size:12px}.action{margin:6px 0 6px 18px;padding:0;color:var(--muted)}
.q b{color:var(--gold)}.principle{font-style:italic}.hooks,.src{color:var(--muted);font-size:13px}
table{border-collapse:collapse;width:100%;font-size:13px}td{border-top:1px solid var(--line);padding:4px 6px;vertical-align:top}td.ok{color:#8fbf6a}td.bad{color:#e06c5a;font-weight:700}
</style></head><body><main>
<h1>Example approval batch · ${batch.length} candidates</h1>
<p class="intro">Original hands for the first experiment (mx-002 to mx-009: four lessons, two each), plus mx-001. Drafted for owner review on ${new Date().toISOString().slice(0, 10)}. <b>None is approved and none may be published until it is.</b> Every check below is recomputed from the example data with the evaluator and paid-inventory fixture the tests use. To approve, name the ids; each becomes <code>approved</code> with you as reviewer.</p>
${rows}
</main></body></html>`;

const out = resolve("renders/approval-batch.html");
await mkdir(resolve("renders"), { recursive: true });
await writeFile(out, html);
console.log(`Wrote ${out}: ${batch.length} candidates.`);
