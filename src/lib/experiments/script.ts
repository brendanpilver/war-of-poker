import { siteUrl } from "@/lib/site";
import type { MarketingExample, LensFactor } from "./examples";
import {
  ctas,
  narrationWordsPerMinute,
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
  /** What the narrator says as this beat starts, if anything. */
  spoken?: string | null;
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

/** One beat before timing: what is shown, and what (if anything) is said. */
export type Draft = {
  kind: BeatKind;
  text: string;
  /** Narration for this beat, or null for a silent beat. */
  spoken: string | null;
  /** Whether spare time may be added to this beat. */
  stretch: boolean;
  factor?: Beat["factor"];
};

const RANK_WORDS: Record<string, string> = {
  A: "ace", K: "king", Q: "queen", J: "jack", T: "ten", "9": "nine", "8": "eight",
  "7": "seven", "6": "six", "5": "five", "4": "four", "3": "three", "2": "two",
};

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function underHundred(n: number): string {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : "");
}

/**
 * A dollar amount the way a player says it at the table: 246 → "two
 * forty-six", 205 → "two oh five", 300 → "three hundred". Shorter than the
 * speech engine's "two hundred forty-six dollars", which is what lets a
 * 25-second Short be narrated.
 */
export function spokenDollars(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n >= 1000) return String(n);
  if (n < 100) return underHundred(n);
  const rest = n % 100;
  const head = ONES[Math.floor(n / 100)];
  if (rest === 0) return `${head} hundred`;
  return rest < 10 ? `${head} oh ${ONES[rest]}` : `${head} ${underHundred(rest)}`;
}

/**
 * Seconds the narrator needs for a line at this pacing: words at the pacing's
 * rate, plus the pause a speech engine leaves at each punctuation mark, plus
 * a breath. Calibrated against the renderer's voice so that it errs long;
 * the renderer then times each beat from the real audio.
 */
export function speakingTime(spoken: string, pacing: ContentSettings["pacing"]): number {
  const pauses = (spoken.match(/[,.:;?!](?=\s|$)/g) ?? []).length;
  return words(spoken) / (narrationWordsPerMinute[pacing] / 60) + 0.15 * pauses + 0.25;
}

/**
 * Caption text as a narrator should say it. Board shorthand is read as
 * ranks ("K-7-2" → "king, seven, two"), abbreviations are spelled out, and a
 * range dash becomes "to". Display text is never changed.
 */
export function spokenText(text: string): string {
  return text
    .replace(/\b([AKQJT2-9])-([AKQJT2-9])-([AKQJT2-9])(?:-([AKQJT2-9]))?\b/g, (...m: string[]) =>
      m.slice(1, 5).filter(Boolean).map((r) => RANK_WORDS[r]).join(", "),
    )
    .replace(/(\d)\s*[–-]\s*(\d)(?!\d*-bet)/g, "$1 to $2")
    .replace(/\b3-bet/g, "three-bet")
    .replace(/\b4-bet/g, "four-bet")
    .replace(/\b10-Hand\b/g, "ten-hand")
    .replace(/\bSPR\b/g, "S-P-R")
    .replace(/\bPLO\b/g, "P-L-O")
    .replace(/\s*·\s*/g, ", ")
    .replace(/\$(\d+)/g, (_, digits: string) => spokenDollars(Number.parseInt(digits, 10)));
}

/**
 * The beats of a Short, in the six-beat order of
 * docs/SHORTS-CONTENT-FORMAT.md: hook, setup, the decision asked plainly, a
 * countdown, the lens factors that explain it, the reveal, the principle,
 * and the close.
 */
export function scriptDrafts(
  spec: ContentSpec,
  example: MarketingExample,
): { ok: true; drafts: Draft[] } | { ok: false; error: string } {
  const { settings } = spec;
  const hook = hookLine(example, settings.hook);
  if (!hook) return { ok: false, error: `example ${example.id} has no ${settings.hook} hook line` };
  const cta = ctas[settings.cta];

  const drafts: Draft[] = [
    { kind: "hook", text: hook, spoken: spokenText(hook), stretch: false },
    { kind: "setup", text: example.setupLine, spoken: spokenText(example.setupLine), stretch: true },
  ];
  // The countdown shows the question, so it needs its own beat only when it
  // cannot be read in the countdown -- and never after the challenge hook,
  // which has just asked it. Otherwise the narrator asks it as the countdown
  // starts.
  const separateQuestion =
    settings.hook !== "challenge" && readingTime(example.prompt, settings.pacing) > settings.countdownSec;
  if (separateQuestion) {
    drafts.push({ kind: "question", text: example.prompt, spoken: spokenText(example.prompt), stretch: false });
  }
  drafts.push({
    kind: "countdown",
    text: example.prompt,
    spoken: settings.hook === "challenge" || separateQuestion ? null : spokenText(example.prompt),
    stretch: false,
  });
  for (const beat of example.beats) {
    drafts.push({ kind: "factor", text: beat.text, spoken: spokenText(beat.text), stretch: true, factor: beat.factor });
  }
  drafts.push(
    { kind: "reveal", text: example.answerLine, spoken: spokenText(example.answerLine), stretch: true, factor: "DECISION" },
    { kind: "principle", text: example.principle, spoken: spokenText(example.principle), stretch: true },
    { kind: "cta", text: `${cta.line} ${cta.displayUrl}`, spoken: spokenText(cta.line), stretch: false },
  );
  return { ok: true, drafts };
}

/**
 * Lays drafts out over the duration. Each beat gets `need(draft)` seconds;
 * whatever is left over goes to the setup and the explanation, where a viewer
 * benefits from it. If the beats cannot fit, the spec is rejected rather than
 * rushed: the engine then never pairs that example with that duration.
 */
export function layoutTimeline(
  drafts: Draft[],
  settings: Pick<ContentSettings, "durationSec" | "countdownSec" | "pacing">,
  need: (draft: Draft) => number,
  exampleId: string,
): ScriptResult {
  const needs = drafts.map((d) => (d.kind === "countdown" ? settings.countdownSec : need(d)));
  const needed = needs.reduce((sum, n) => sum + n, 0);
  if (needed > settings.durationSec) {
    return {
      ok: false,
      error: `example ${exampleId} needs ${needed.toFixed(1)}s at ${settings.pacing} pacing; the spec allows ${settings.durationSec}s`,
      neededSec: needed,
    };
  }

  const slack = settings.durationSec - needed;
  const stretchable = drafts.reduce((sum, d, i) => sum + (d.stretch ? needs[i] : 0), 0);

  const beats: Beat[] = [];
  let clock = 0;
  drafts.forEach((draft, i) => {
    const length = draft.stretch ? needs[i] + (slack * needs[i]) / stretchable : needs[i];
    if (draft.kind === "countdown") {
      for (let second = 0; second < settings.countdownSec; second++) {
        beats.push({
          kind: "countdown",
          start: round(clock + second),
          end: round(clock + second + 1),
          text: draft.text,
          count: settings.countdownSec - second,
          spoken: second === 0 ? draft.spoken : null,
        });
      }
    } else {
      beats.push({
        kind: draft.kind,
        start: round(clock),
        end: round(clock + length),
        text: draft.text,
        factor: draft.factor,
        spoken: draft.spoken,
      });
    }
    clock += length;
  });
  // Absorb rounding so the last beat ends exactly on the duration.
  beats[beats.length - 1].end = settings.durationSec;

  return { ok: true, timeline: { durationSec: settings.durationSec, beats } };
}

/**
 * The timeline, giving each beat the longer of its caption's reading time and
 * its narration's estimated speaking time. The renderer replaces the
 * estimate with the measured length of the synthesised line.
 */
export function buildTimeline(spec: ContentSpec, example: MarketingExample): ScriptResult {
  const drafts = scriptDrafts(spec, example);
  if (!drafts.ok) return { ok: false, error: drafts.error, neededSec: 0 };
  const { pacing } = spec.settings;
  return layoutTimeline(
    drafts.drafts,
    spec.settings,
    (d) => Math.max(readingTime(d.text, pacing), d.spoken ? speakingTime(d.spoken, pacing) : 0),
    example.id,
  );
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
