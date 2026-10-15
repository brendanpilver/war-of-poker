import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { exampleById } from "../src/lib/experiments/examples";
import { DEFAULT_BASELINE } from "../src/lib/experiments/planner";
import { renderScenes, wrap } from "../src/lib/experiments/render";
import { buildTimeline, companionCopy, toSrt } from "../src/lib/experiments/script";
import { parseContentSpec, type ContentSpec } from "../src/lib/experiments/spec";

const example = exampleById("mx-001");
assert.ok(example);

function spec(overrides: Partial<ContentSpec> = {}, settings = {}): ContentSpec {
  return {
    specVersion: 1,
    engineVersion: "content-engine-1",
    contentId: "EPM-004",
    series: "EPM",
    exampleId: "mx-001",
    settings: { ...DEFAULT_BASELINE, hook: "financial-consequence", ...settings },
    experimentId: "EXP-001",
    variant: "treatment",
    recommendationId: null,
    publishOrder: 3,
    ...overrides,
  };
}

describe("content spec validation", () => {
  it("round-trips a valid spec", () => {
    const parsed = parseContentSpec(JSON.parse(JSON.stringify(spec())));
    assert.ok(parsed.ok);
    assert.deepEqual(parsed.spec, spec());
  });

  it("rejects unknown settings, mismatched series and malformed ids", () => {
    const cases: [unknown, RegExp][] = [
      [{ ...spec(), settings: { ...spec().settings, hook: "shock" } }, /settings.hook/],
      [{ ...spec(), settings: { ...spec().settings, durationSec: 60 } }, /durationSec/],
      [{ ...spec(), contentId: "PRC-004" }, /series/],
      [{ ...spec(), experimentId: "exp-1" }, /experimentId/],
      [{ ...spec(), specVersion: 2 }, /specVersion/],
      [null, /object/],
    ];
    for (const [input, pattern] of cases) {
      const parsed = parseContentSpec(input);
      assert.equal(parsed.ok, false);
      if (!parsed.ok) assert.match(parsed.error, pattern);
    }
  });
});

describe("timeline", () => {
  it("fills the duration exactly, in the six-beat order", () => {
    const built = buildTimeline(spec(), example);
    assert.ok(built.ok);
    const { beats } = built.timeline;
    assert.equal(beats[0].start, 0);
    assert.equal(beats[beats.length - 1].end, 25);
    for (let i = 1; i < beats.length; i++) assert.ok(beats[i].start >= beats[i - 1].start);
    const order = [...new Set(beats.map((b) => b.kind))];
    assert.deepEqual(order, ["hook", "setup", "countdown", "factor", "reveal", "principle", "cta"]);
    assert.equal(beats.filter((b) => b.kind === "countdown").length, 3);
  });

  it("refuses a duration the example cannot be read in", () => {
    const built = buildTimeline(spec({}, { durationSec: 15 }), example);
    assert.equal(built.ok, false);
  });

  it("writes only the example's text and the numbers it states", () => {
    const built = buildTimeline(spec(), example);
    assert.ok(built.ok);
    assert.equal(built.timeline.beats[0].text, "$246 in the pot. $242 behind.");
    const allowed = new Set([
      example.setupLine, example.prompt, example.answerLine, example.principle,
      ...example.beats.map((b) => b.text),
    ]);
    for (const beat of built.timeline.beats) {
      if (beat.kind === "hook" || beat.kind === "cta") continue;
      assert.ok(allowed.has(beat.text), `invented text: ${beat.text}`);
    }
  });
});

describe("companion copy and frames", () => {
  it("carries the tracked link to the CTA's page", () => {
    const built = buildTimeline(spec(), example);
    assert.ok(built.ok);
    const copy = companionCopy(spec(), example, built.timeline);
    assert.match(copy.trackedUrl ?? "", /\/plo-challenge\?src=EPM-004&platform=youtube-shorts$/);
    assert.ok(copy.description.includes(copy.trackedUrl ?? "missing"));
    assert.match(toSrt(built.timeline), /^1\n00:00:00,000 --> /);
  });

  it("renders one frame per beat and watermarks drafts", () => {
    const built = buildTimeline(spec(), example);
    assert.ok(built.ok);
    const draft = renderScenes(spec(), example, built.timeline, { draft: true });
    assert.equal(draft.length, built.timeline.beats.length);
    assert.ok(draft.every((s) => s.svg.includes("NOT FOR PUBLICATION")));
    const final = renderScenes(spec(), example, built.timeline, { draft: false });
    assert.ok(final.every((s) => !s.svg.includes("DRAFT")));
    assert.ok(final.every((s) => s.svg.includes("EPM-004")));
  });

  it("wraps captions to the budget", () => {
    assert.deepEqual(wrap("one two three four", 9), ["one two", "three", "four"]);
  });
});
