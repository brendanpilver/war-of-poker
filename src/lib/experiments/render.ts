import type { Card, Suit } from "@/lib/poker/cards";
import { lensFactors, type MarketingExample } from "./examples";
import type { Beat, Timeline } from "./script";
import { ctas, type ContentSpec } from "./spec";

/**
 * The Short template, `short-v1`: one still SVG frame per beat, 1080 × 1920.
 *
 * Deliberately plain. The drama is the decision -- the cards, the money, the
 * pause, the answer -- so frames cut rather than animate, and every frame is
 * reproducible from the spec alone. Colours are the site's palette, which was
 * sampled from the real stencil logo and book cover (src/app/globals.css);
 * type is the system sans and mono, because docs/BRAND.md has not chosen
 * typefaces. Both are provisional until BRAND.md records them.
 *
 * Pure: no file system, no browser. `scripts/render-short.ts` turns these
 * frames into a video.
 */

export const FRAME = { width: 1080, height: 1920 } as const;

const color = {
  ink: "#0b0a09",
  card: "#181713",
  line: "#2a2823",
  bone: "#efe5db",
  muted: "#aea797",
  faint: "#86806f",
  gold: "#d6a129",
  olive: "#747644",
  red: "#a8202a",
  black: "#16150f",
  draft: "#c0392b",
};

const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "Menlo, Consolas, 'Courier New', monospace";

const suitGlyph: Record<Suit, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };
const rankText = (rank: Card["rank"]) => (rank === "T" ? "10" : rank);

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Greedy word wrap by character budget; good enough for a fixed template. */
export function wrap(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line.length === 0) line = word;
    else if (line.length + 1 + word.length <= maxChars) line += ` ${word}`;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function cardSvg(card: Card, x: number, y: number, w: number, h: number): string {
  const fill = card.suit === "h" || card.suit === "d" ? color.red : color.black;
  return [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w * 0.08}" fill="${color.bone}"/>`,
    `<text x="${x + w * 0.12}" y="${y + h * 0.3}" font-family="${SANS}" font-weight="700" font-size="${h * 0.26}" fill="${fill}">${rankText(card.rank)}</text>`,
    `<text x="${x + w / 2}" y="${y + h * 0.8}" text-anchor="middle" font-family="${SANS}" font-size="${h * 0.38}" fill="${fill}">${suitGlyph[card.suit]}</text>`,
  ].join("");
}

function cardRow(list: Card[], centreY: number, w: number, h: number, gap: number): string {
  const total = list.length * w + (list.length - 1) * gap;
  const left = (FRAME.width - total) / 2;
  return list.map((card, i) => cardSvg(card, left + i * (w + gap), centreY - h / 2, w, h)).join("");
}

function textLines(
  lines: string[],
  x: number,
  y: number,
  size: number,
  options: { fill?: string; weight?: number; family?: string; anchor?: string; leading?: number } = {},
): string {
  const leading = options.leading ?? 1.18;
  return lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${y + i * size * leading}" text-anchor="${options.anchor ?? "middle"}" font-family="${options.family ?? SANS}" font-weight="${options.weight ?? 700}" font-size="${size}" fill="${options.fill ?? color.bone}">${esc(line)}</text>`,
    )
    .join("");
}

function lensStrip(active: Beat["factor"] | undefined, shown: Set<string>): string {
  const labels = [...lensFactors, "DECISION"];
  const size = 30;
  const step = FRAME.width / labels.length;
  return labels
    .map((label, i) => {
      const isActive = label === active;
      const wasShown = shown.has(label);
      const fill = isActive ? color.gold : wasShown ? color.muted : color.line;
      const x = step * i + step / 2;
      return `<text x="${x}" y="300" text-anchor="middle" font-family="${MONO}" font-weight="700" font-size="${size}" letter-spacing="2" fill="${fill}">${label}</text>`;
    })
    .join("");
}

function choicesSvg(example: MarketingExample, reveal: boolean): string {
  const w = 440;
  const h = 110;
  const gap = 40;
  const total = example.choices.length * w + (example.choices.length - 1) * gap;
  const left = (FRAME.width - total) / 2;
  return example.choices
    .map((choice, i) => {
      const x = left + i * (w + gap);
      const isAnswer = reveal && choice === example.answer;
      const stroke = isAnswer ? color.gold : color.line;
      const fill = isAnswer ? color.gold : color.card;
      const text = isAnswer ? color.ink : reveal ? color.faint : color.bone;
      return `<rect x="${x}" y="1205" width="${w}" height="${h}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="4"/><text x="${x + w / 2}" y="1275" text-anchor="middle" font-family="${SANS}" font-weight="700" font-size="46" fill="${text}">${esc(choice)}</text>`;
    })
    .join("");
}

function draftMarks(): string {
  const marks: string[] = [
    `<rect x="0" y="0" width="${FRAME.width}" height="64" fill="${color.draft}"/>`,
    `<text x="${FRAME.width / 2}" y="44" text-anchor="middle" font-family="${MONO}" font-weight="700" font-size="30" fill="#ffffff">DRAFT · EXAMPLE NOT APPROVED · NOT FOR PUBLICATION</text>`,
  ];
  for (let i = 0; i < 4; i++) {
    marks.push(
      `<text x="${FRAME.width / 2}" y="${520 + i * 380}" text-anchor="middle" font-family="${MONO}" font-weight="700" font-size="96" fill="${color.draft}" fill-opacity="0.16" transform="rotate(-30 ${FRAME.width / 2} ${520 + i * 380})">DRAFT</text>`,
    );
  }
  return marks.join("");
}

export type RenderOptions = {
  /** Watermark every frame. Required when the example is not approved. */
  draft: boolean;
  /** A data URI or URL for the War of Poker stencil logo. */
  logoHref?: string;
};

export type Scene = { start: number; end: number; beat: Beat; svg: string };

export function renderScenes(
  spec: ContentSpec,
  example: MarketingExample,
  timeline: Timeline,
  options: RenderOptions,
): Scene[] {
  const showTimeline = spec.settings.visual === "table-timeline";
  const cta = ctas[spec.settings.cta];
  const shown = new Set<string>();

  return timeline.beats.map((beat) => {
    if (beat.factor) shown.add(beat.factor);
    const parts: string[] = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${FRAME.width}" height="${FRAME.height}" viewBox="0 0 ${FRAME.width} ${FRAME.height}">`,
      `<rect width="100%" height="100%" fill="${color.ink}"/>`,
    ];

    // Masthead.
    if (options.logoHref) {
      // The stencil logo is 1502 × 1135.
      parts.push(`<image href="${esc(options.logoHref)}" x="${FRAME.width / 2 - 90}" y="74" width="180" height="136" preserveAspectRatio="xMidYMid meet"/>`);
    } else {
      parts.push(textLines(["WAR OF POKER"], FRAME.width / 2, 160, 40, { family: MONO, fill: color.gold }));
    }

    if (beat.kind === "cta") {
      parts.push(textLines(wrap(cta.line, 22), FRAME.width / 2, 760, 76));
      parts.push(textLines([cta.displayUrl], FRAME.width / 2, 1120, 48, { fill: color.gold, family: MONO }));
      parts.push(textLines(wrap(example.principle, 30), FRAME.width / 2, 1380, 44, { fill: color.muted, weight: 400 }));
    } else {
      parts.push(textLines([example.game], FRAME.width / 2, 236, 32, { family: MONO, fill: color.muted, weight: 400 }));
      parts.push(lensStrip(beat.factor, shown));
      parts.push(`<line x1="80" y1="340" x2="${FRAME.width - 80}" y2="340" stroke="${color.line}" stroke-width="3"/>`);

      // Table.
      parts.push(cardRow(example.board, 520, 170, 240, 26));
      const potLabel = example.facing ? `POT $${example.pot}  ·  BET $${example.facing}` : `POT $${example.pot}`;
      parts.push(textLines([potLabel], FRAME.width / 2, 712, 40, { family: MONO, fill: color.gold }));
      parts.push(cardRow(example.hand, 880, 150, 210, 22));
      parts.push(textLines([`${example.heroPosition.toUpperCase()} · BEHIND $${example.behind}`], FRAME.width / 2, 1050, 34, { family: MONO, fill: color.muted, weight: 400 }));

      if (beat.kind === "question" || beat.kind === "countdown" || beat.kind === "reveal") {
        parts.push(choicesSvg(example, beat.kind === "reveal"));
      } else if (showTimeline && beat.kind !== "hook") {
        parts.push(textLines(example.timeline, 120, 1150, 36, { anchor: "start", family: MONO, fill: color.faint, weight: 400, leading: 1.4 }));
      }

      if (beat.kind === "countdown" && beat.count !== undefined) {
        parts.push(textLines([String(beat.count)], FRAME.width / 2, 1560, 200, { fill: color.gold }));
      } else {
        const label = beat.factor ? `${beat.factor}` : "";
        if (label) parts.push(textLines([label], FRAME.width / 2, 1420, 34, { family: MONO, fill: color.gold }));
        parts.push(textLines(wrap(beat.text, 26), FRAME.width / 2, label ? 1500 : 1460, 62));
      }
    }

    // Footer.
    parts.push(`<text x="80" y="1860" font-family="${MONO}" font-size="28" fill="${color.faint}">${esc(spec.contentId ?? "UNASSIGNED")}</text>`);
    parts.push(`<text x="${FRAME.width - 80}" y="1860" text-anchor="end" font-family="${MONO}" font-size="28" fill="${color.faint}">warofpoker.com</text>`);

    if (options.draft) parts.push(draftMarks());
    parts.push("</svg>");
    return { start: beat.start, end: beat.end, beat, svg: parts.join("") };
  });
}
