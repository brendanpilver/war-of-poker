import { trackedLink, isContentId, isSeriesCode, type SeriesCode } from "@/lib/content/series";
import { conceptIds, type ConceptId } from "@/lib/quiz/concepts";

/**
 * The content spec: one machine-readable document per Short.
 *
 * The renderer consumes it, the content API stores it on the piece, and the
 * analytics job reads it back to group results by setting. A spec never
 * carries poker content of its own -- only a reference to an example in
 * `examples.ts`, whose cards, numbers and explanations are human-authored and
 * test-checked. The generator may vary framing, timing and presentation; it
 * cannot vary the poker.
 *
 * Nothing here is War of Poker doctrine. The factor levels are production
 * settings, and the lesson ids are the book concepts the Challenge already
 * teaches, plus the two the book covers that the Challenge does not test.
 */

export const SPEC_VERSION = 1;
export const ENGINE_VERSION = "content-engine-1";

/** How the first two seconds open. Each level is a framing, never a claim. */
export const hookTypes = [
  "challenge",
  "financial-consequence",
  "common-mistake",
  "curiosity",
] as const;
export type HookType = (typeof hookTypes)[number];

/** Hooks whose line must be written into the example by a person. */
export const authoredHooks = ["common-mistake", "curiosity"] as const;
export type AuthoredHook = (typeof authoredHooks)[number];

export const lessonIds = [...conceptIds, "position", "player-read"] as const;
export type LessonId = ConceptId | "position" | "player-read";

export const durations = [15, 25, 40] as const;
export type DurationSec = (typeof durations)[number];

/**
 * The pause before the reveal. The six-beat format in
 * docs/SHORTS-CONTENT-FORMAT.md fixes the order of the beats; how long the
 * viewer is left with the decision is the reveal-timing setting.
 */
export const countdowns = [3, 5] as const;
export type CountdownSec = (typeof countdowns)[number];

/** Caption reading speed. The River Potter voice itself is not a variable. */
export const pacings = ["measured", "brisk"] as const;
export type Pacing = (typeof pacings)[number];

/**
 * Words per second a caption is given on screen: about 168 and 204 words a
 * minute, a normal and a quick narration pace.
 */
export const wordsPerSecond: Record<Pacing, number> = {
  measured: 2.8,
  brisk: 3.4,
};

/**
 * Narration speed, words per minute. The pacing setting governs the voice as
 * well as the captions; the timeline gives each beat whichever is longer.
 */
export const narrationWordsPerMinute: Record<Pacing, number> = {
  // Measured narration runs about 180 a minute, but its pauses vary more;
  // timing it at 170 keeps the fit check from approving lines that overrun.
  measured: 170,
  brisk: 205,
};

/** Table only, or table plus the action-so-far timeline. */
export const visuals = ["table", "table-timeline"] as const;
export type Visual = (typeof visuals)[number];

export const ctaIds = ["challenge", "survival-card", "product-page"] as const;
export type CtaId = (typeof ctaIds)[number];

export type Cta = {
  id: CtaId;
  /** Where the tracked link lands. */
  path: string;
  /** Spoken and shown at the close. */
  line: string;
  /** Shown on screen; the tracked link itself goes in the description. */
  displayUrl: string;
  /**
   * False when the destination does not yet exist as its own page. The
   * Survival Card is only delivered from the Challenge's results screen, so a
   * Short promising it would land the viewer on a ten-hand quiz they did not
   * ask for. The engine never selects an unavailable CTA.
   */
  available: boolean;
};

export const ctas: Record<CtaId, Cta> = {
  challenge: {
    id: "challenge",
    path: "/plo-challenge",
    line: "Try the free 10-Hand Challenge.",
    displayUrl: "warofpoker.com/plo-challenge",
    available: true,
  },
  "survival-card": {
    id: "survival-card",
    path: "/plo-challenge",
    line: "Get the free NLH Player's PLO Survival Card.",
    displayUrl: "warofpoker.com/plo-challenge",
    available: false,
  },
  "product-page": {
    id: "product-page",
    path: "/short-stack-plo",
    line: "Short Stack PLO, by River Potter.",
    displayUrl: "warofpoker.com/short-stack-plo",
    available: true,
  },
};

/** Where a piece is published. A blocking variable, never randomised. */
export const platforms = ["youtube-shorts", "tiktok", "instagram-reels"] as const;
export type Platform = (typeof platforms)[number];

export const templates = ["short-v1"] as const;
export type TemplateId = (typeof templates)[number];

export type ContentSettings = {
  hook: HookType;
  lesson: LessonId;
  durationSec: DurationSec;
  countdownSec: CountdownSec;
  pacing: Pacing;
  visual: Visual;
  cta: CtaId;
  platform: Platform;
  template: TemplateId;
};

/** The settings an experiment may vary. Lesson is matched across arms instead. */
export const experimentalFactors = [
  "hook",
  "cta",
  "durationSec",
  "countdownSec",
  "visual",
  "pacing",
] as const;
export type ExperimentalFactor = (typeof experimentalFactors)[number];

export const factorLevels: Record<ExperimentalFactor, readonly (string | number)[]> = {
  hook: hookTypes,
  cta: ctaIds.filter((id) => ctas[id].available),
  durationSec: durations,
  countdownSec: countdowns,
  visual: visuals,
  pacing: pacings,
};

export const factorLabels: Record<keyof ContentSettings, string> = {
  hook: "Hook",
  lesson: "Lesson",
  durationSec: "Duration",
  countdownSec: "Countdown",
  pacing: "Pacing",
  visual: "Visual",
  cta: "Call to action",
  platform: "Platform",
  template: "Template",
};

/**
 * Content series and hook are independent attributes. The series is the
 * existing editorial line a piece belongs to (`src/lib/content/series.ts`)
 * and the first part of its content ID; the hook is how its first seconds
 * are framed. An experiment holds the series constant across arms, so a hook
 * test never doubles as a series comparison.
 */

export type ContentSpec = {
  specVersion: typeof SPEC_VERSION;
  engineVersion: string;
  /** Assigned when the operator accepts the batch; null in a proposal. */
  contentId: string | null;
  series: SeriesCode;
  exampleId: string;
  settings: ContentSettings;
  experimentId: string | null;
  variant: string | null;
  recommendationId: string | null;
  /** 1-based position in the batch's randomised publication order. */
  publishOrder: number | null;
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function oneOf<T extends string | number>(
  list: readonly T[],
  value: unknown,
): value is T {
  return (list as readonly unknown[]).includes(value);
}

export function parseSettings(
  value: unknown,
): { ok: true; settings: ContentSettings } | { ok: false; error: string } {
  if (typeof value !== "object" || value === null) {
    return { ok: false, error: "settings must be an object" };
  }
  const input = value as Record<string, unknown>;
  const checks: [keyof ContentSettings, readonly (string | number)[]][] = [
    ["hook", hookTypes],
    ["lesson", lessonIds],
    ["durationSec", durations],
    ["countdownSec", countdowns],
    ["pacing", pacings],
    ["visual", visuals],
    ["cta", ctaIds],
    ["platform", platforms],
    ["template", templates],
  ];
  for (const [key, list] of checks) {
    if (!oneOf(list, input[key])) {
      return { ok: false, error: `settings.${key} must be one of ${list.join(", ")}` };
    }
  }
  return {
    ok: true,
    settings: {
      hook: input.hook as HookType,
      lesson: input.lesson as LessonId,
      durationSec: input.durationSec as DurationSec,
      countdownSec: input.countdownSec as CountdownSec,
      pacing: input.pacing as Pacing,
      visual: input.visual as Visual,
      cta: input.cta as CtaId,
      platform: input.platform as Platform,
      template: input.template as TemplateId,
    },
  };
}

const ID_PATTERN = /^[a-z0-9-]{1,40}$/;
const EXPERIMENT_ID_PATTERN = /^EXP-\d{3,}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Total, never throws: the renderer and the review form both feed it raw JSON. */
export function parseContentSpec(
  value: unknown,
): { ok: true; spec: ContentSpec } | { ok: false; error: string } {
  if (typeof value !== "object" || value === null) {
    return { ok: false, error: "spec must be an object" };
  }
  const input = value as Record<string, unknown>;

  if (input.specVersion !== SPEC_VERSION) {
    return { ok: false, error: `specVersion must be ${SPEC_VERSION}` };
  }
  if (input.contentId !== null && !isContentId(input.contentId)) {
    return { ok: false, error: "contentId must be null or look like EPM-001" };
  }
  if (!isSeriesCode(input.series)) {
    return { ok: false, error: "series must be a known series code" };
  }
  if (typeof input.contentId === "string" && !input.contentId.startsWith(`${input.series}-`)) {
    return { ok: false, error: "contentId must belong to the spec's series" };
  }
  if (typeof input.exampleId !== "string" || !ID_PATTERN.test(input.exampleId)) {
    return { ok: false, error: "exampleId is required" };
  }
  const settings = parseSettings(input.settings);
  if (!settings.ok) return settings;

  const experimentId = input.experimentId ?? null;
  if (experimentId !== null && !(typeof experimentId === "string" && EXPERIMENT_ID_PATTERN.test(experimentId))) {
    return { ok: false, error: "experimentId must be null or look like EXP-001" };
  }
  const variant = input.variant ?? null;
  if (variant !== null && !(typeof variant === "string" && ID_PATTERN.test(variant))) {
    return { ok: false, error: "variant must be null or a short key" };
  }
  const recommendationId = input.recommendationId ?? null;
  if (recommendationId !== null && !(typeof recommendationId === "string" && UUID_PATTERN.test(recommendationId))) {
    return { ok: false, error: "recommendationId must be null or a UUID" };
  }
  const publishOrder = input.publishOrder ?? null;
  if (publishOrder !== null && !(Number.isInteger(publishOrder) && (publishOrder as number) > 0)) {
    return { ok: false, error: "publishOrder must be null or a positive integer" };
  }

  return {
    ok: true,
    spec: {
      specVersion: SPEC_VERSION,
      engineVersion: typeof input.engineVersion === "string" ? input.engineVersion.slice(0, 40) : ENGINE_VERSION,
      contentId: (input.contentId as string | null) ?? null,
      series: input.series,
      exampleId: input.exampleId,
      settings: settings.settings,
      experimentId: experimentId as string | null,
      variant: variant as string | null,
      recommendationId: recommendationId as string | null,
      publishOrder: publishOrder as number | null,
    },
  };
}

/** The tracked link for a piece: lands on its CTA's page, carrying `?src=`. */
export function specTrackedPath(spec: ContentSpec): string | null {
  if (!spec.contentId) return null;
  return trackedLink(spec.contentId, ctas[spec.settings.cta].path, spec.settings.platform);
}

/** A stable string for one setting's level, for grouping and dedupe keys. */
export function levelKey(value: string | number): string {
  return String(value);
}
