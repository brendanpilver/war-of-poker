import { siteUrl } from "@/lib/site";
import type { MarketingExample, LensFactor } from "./examples";
import {
  ctas,
  specTrackedPath,
  wordsPerSecond,
  type ContentSettings,
  type ContentSpec,
} from "./spec";

/**
 * From a spec and its example to a timed script.
 *
 * The beat order is the six-beat format in docs/SHORTS-CONTENT-FORMAT.md:
 * hook, setup, the decision asked plainly, a countdown, the lens factors that
 * explain it, the reveal, the principle, and the close. Every word on screen
 * is either the example's own human-written text or a claim-free template
 * filled with the example's numbers. Nothing here writes poker.
 */

export type BeatKind =
  | "hook"
  | "setup"
  | "question"
  | "countdown"
  | "factor"
  | "reveal"
  | "principle"
  | "cta";

export type Beat = {
  kind: BeatKind;
  start: number;
  end: number;
  /** The caption for this beat. */
  text: string;
  /** Which lens factor is being explained, for the on-screen indicator. */
  factor?: LensFactor | "DECISION";
  /** Countdown beats only: the number on screen. */
  count?: number;
};

export type Timeline = {
  durationSec: number;
  beats: Beat[];
};

export type ScriptResult =
  | { ok: true; timeline: Timeline }
  | { ok: false; error: string; neededSec: number };

/** The opening line for a hook, or null when the example cannot support it. */
export function hookLine(example: MarketingExample, hook: ContentSettings["hook"]): string | null {
  switch (hook) {
    case "financial-consequence":
      return `$${example.pot} in the pot. $${example.behind} behind.`;
    case "challenge":
      return example.prompt;
    case "common-mistake":
    case "curiosity":
      return example.hookLines[hook] ?? null;
  }
}

function words(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Seconds a caption needs on screen at this pacing, with a floor. */
export function readingTime(text: string, pacing: ContentSettings["pacing"]): number {
  return Math.max(1.2, words(text) / wordsPerSecond[pacing] + 0.25);
}

/**
 * Lays the beats out over the spec's duration.
 *
 * Each beat gets the time its caption needs at the chosen pacing; whatever is
 * left over goes to the setup and the explanation, where a viewer benefits
 * from it. If the example cannot be read in the time, the spec is rejected
 * rather than rushed: the engine then never pairs that example with that
 * duration.
 */
export function buildTimeline(spec: ContentSpec, example: MarketingExample): ScriptResult {
  const { settings } = spec;
  const hook = hookLine(example, settings.hook);
  if (!hook) {
    return { ok: false, error: `example ${example.id} has no ${settings.hook} hook line`, neededSec: 0 };
  }

  const read = (text: string) => readingTime(text, settings.pacing);
  const cta = ctas[settings.cta];
  const ctaText = `${cta.line} ${cta.displayUrl}`;

  type Draft = { kind: BeatKind; text: string; need: number; stretch: boolean; factor?: Beat["factor"] };
  const drafts: Draft[] = [
    { kind: "hook", text: hook, need: read(hook), stretch: false },
    { kind: "setup", text: example.setupLine, need: read(example.setupLine), stretch: true },
  ];
  // The countdown shows the question, so it needs its own beat only when it
  // cannot be read in the countdown -- and never after the challenge hook,
  // which has just asked it.
  if (settings.hook !== "challenge" && read(example.prompt) > settings.countdownSec) {
    drafts.push({ kind: "question", text: example.prompt, need: read(example.prompt), stretch: false });
  }
  drafts.push({ kind: "countdown", text: example.prompt, need: settings.countdownSec, stretch: false });
  for (const beat of example.beats) {
    drafts.push({ kind: "factor", text: beat.text, need: read(beat.text), stretch: true, factor: beat.factor });
  }
  drafts.push(
    { kind: "reveal", text: example.answerLine, need: read(example.answerLine), stretch: true, factor: "DECISION" },
    { kind: "principle", text: example.principle, need: read(example.principle), stretch: true },
    { kind: "cta", text: ctaText, need: Math.max(2, read(ctaText)), stretch: false },
  );

  const needed = drafts.reduce((sum, d) => sum + d.need, 0);
  if (needed > settings.durationSec) {
    return {
      ok: false,
      error: `example ${example.id} needs ${needed.toFixed(1)}s at ${settings.pacing} pacing; the spec allows ${settings.durationSec}s`,
      neededSec: needed,
    };
  }

  const slack = settings.durationSec - needed;
  const stretchable = drafts.filter((d) => d.stretch).reduce((sum, d) => sum + d.need, 0);

  const beats: Beat[] = [];
  let clock = 0;
  for (const draft of drafts) {
    const length = draft.stretch ? draft.need + (slack * draft.need) / stretchable : draft.need;
    if (draft.kind === "countdown") {
      for (let i = 0; i < settings.countdownSec; i++) {
        beats.push({
          kind: "countdown",
          start: round(clock + i),
          end: round(clock + i + 1),
          text: draft.text,
          count: settings.countdownSec - i,
        });
      }
    } else {
      beats.push({
        kind: draft.kind,
        start: round(clock),
        end: round(clock + length),
        text: draft.text,
        factor: draft.factor,
      });
    }
    clock += length;
  }
  // Absorb rounding so the last beat ends exactly on the duration.
  beats[beats.length - 1].end = settings.durationSec;

  return { ok: true, timeline: { durationSec: settings.durationSec, beats } };
}

function round(seconds: number): number {
  return Math.round(seconds * 100) / 100;
}

// ---------------------------------------------------------------------------
// Companion copy: captions file, description, social post, article draft
// ---------------------------------------------------------------------------

function srtTime(seconds: number): string {
  const ms = Math.round(seconds * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const rest = ms % 1000;
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(rest, 3)}`;
}

/** SubRip captions. Countdown seconds collapse into one caption. */
export function toSrt(timeline: Timeline): string {
  const merged: Beat[] = [];
  for (const beat of timeline.beats) {
    const last = merged[merged.length - 1];
    if (last && last.kind === "countdown" && beat.kind === "countdown") {
      last.end = beat.end;
    } else {
      merged.push({ ...beat });
    }
  }
  return merged
    .map((beat, i) => `${i + 1}\n${srtTime(beat.start)} --> ${srtTime(beat.end)}\n${beat.text}\n`)
    .join("\n");
}

export type CompanionCopy = {
  /** Absolute tracked URL for the description or link in bio. */
  trackedUrl: string | null;
  /** Platform description / caption. */
  description: string;
  /** A short text post for platforms where the video is not the post. */
  socialPost: string;
  /** Markdown draft of a website article built from the same approved text. */
  articleDraft: string;
  /** The narration, beat by beat, for a voice-over. */
  narration: string;
};

export function companionCopy(
  spec: ContentSpec,
  example: MarketingExample,
  timeline: Timeline,
): CompanionCopy {
  const path = specTrackedPath(spec);
  const trackedUrl = path ? `${siteUrl}${path}` : null;
  const cta = ctas[spec.settings.cta];
  const hook = timeline.beats[0]?.text ?? "";
  const linkLine = trackedUrl ? `${cta.line} ${trackedUrl}` : `${cta.line} (tracked link assigned on acceptance)`;

  const description = [hook, example.principle, linkLine].join("\n\n");
  const socialPost = [hook, example.prompt, `${example.answerLine} ${example.principle}`, linkLine].join(
    "\n\n",
  );
  const articleDraft = [
    `# ${example.prompt}`,
    "",
    `*${example.game} · ${example.heroPosition}*`,
    "",
    ...example.timeline.map((line) => `- ${line}`),
    "",
    ...example.beats.map((beat) => `**${beat.factor}.** ${beat.text}`).flatMap((line) => [line, ""]),
    `**DECISION.** ${example.answerLine}`,
    "",
    `> ${example.principle}`,
    "",
    linkLine,
    "",
    `<!-- Draft generated from ${example.id} for ${spec.contentId ?? "an unassigned content ID"}. Not reviewed. -->`,
  ].join("\n");

  const narration = timeline.beats
    .filter((beat, i, all) => !(beat.kind === "countdown" && all[i - 1]?.kind === "countdown"))
    .map((beat) => `[${beat.start.toFixed(1)}s ${beat.kind}] ${beat.kind === "countdown" ? "(pause)" : beat.text}`)
    .join("\n");

  return { trackedUrl, description, socialPost, articleDraft, narration };
}
