/**
 * Renders Shorts from content specs.
 *
 *   npm run render:short -- <spec.json> [--out renders] [--draft] [--frames-only] [--silent] [--voice "Reed (English (US))"]
 *
 * `<spec.json>` is one spec, an array of specs, or `{ "specs": [...] }` -- the
 * shape `/growth/specs` returns -- so an accepted batch renders in one call.
 *
 * For each spec it writes, under `<out>/<content id>/`: `spec.json`,
 * `frames/*.svg`, `narration/*.wav`, `captions.srt`, `copy.md`, `video.mp4`
 * and `sync.json` (the post-render synchronisation check).
 *
 * Runs on a Mac with Google Chrome (CHROME_PATH to override) -- not on the
 * production host. See scripts/render-pipeline.ts and
 * docs/CONTENT-EXPERIMENTS.md § Rendering.
 *
 * An example that is not `approved` renders only with --draft, and then every
 * frame carries a DRAFT watermark. This is the publication gate the engine
 * relies on; do not work around it.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { exampleById } from "../src/lib/experiments/examples";
import { parseContentSpec } from "../src/lib/experiments/spec";
import { DEFAULT_NARRATION, renderShort } from "./render-pipeline";

type Args = { input: string; out: string; draft: boolean; framesOnly: boolean; silent: boolean; voice: string };

function parseArgs(argv: string[]): Args {
  const args: Args = { input: "", out: "renders", draft: false, framesOnly: false, silent: false, voice: DEFAULT_NARRATION.voice };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--out") args.out = argv[++i] ?? args.out;
    else if (arg === "--voice") args.voice = argv[++i] ?? args.voice;
    else if (arg === "--draft") args.draft = true;
    else if (arg === "--frames-only") args.framesOnly = true;
    else if (arg === "--silent") args.silent = true;
    else if (!arg.startsWith("--")) args.input = arg;
  }
  if (!args.input) {
    console.error("usage: npm run render:short -- <spec.json> [--out renders] [--draft] [--frames-only] [--silent] [--voice NAME]");
    process.exit(2);
  }
  return args;
}

function specsFrom(json: unknown): unknown[] {
  if (Array.isArray(json)) return json;
  if (json && typeof json === "object" && Array.isArray((json as { specs?: unknown }).specs)) {
    return (json as { specs: unknown[] }).specs;
  }
  return [json];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const raw = JSON.parse(await readFile(args.input, "utf8")) as unknown;
  const logo = await readFile(resolve("public/brand/war-of-poker-stencil-logo.png"));
  const logoHref = `data:image/png;base64,${logo.toString("base64")}`;

  for (const candidate of specsFrom(raw)) {
    const parsed = parseContentSpec(candidate);
    if (!parsed.ok) throw new Error(`Invalid spec: ${parsed.error}`);
    const example = exampleById(parsed.spec.exampleId);
    if (!example) throw new Error(`Unknown example ${parsed.spec.exampleId}.`);
    if (example.status !== "approved" && !args.draft) {
      throw new Error(
        `Example ${example.id} is ${example.status}, not approved. Re-run with --draft to render a watermarked draft for review.`,
      );
    }
    const result = await renderShort(parsed.spec, example, {
      outDir: resolve(args.out),
      draft: args.draft,
      framesOnly: args.framesOnly,
      narration: args.silent ? null : { ...DEFAULT_NARRATION, voice: args.voice },
      logoHref,
    });
    process.stdout.write(
      `${result.dir}: ${result.timeline.beats.length} beats, ${result.timeline.durationSec}s` +
        (result.video ? `, ${result.mimeType}, max frame lag ${((result.sync?.maxFrameLagSec ?? 0) * 1000).toFixed(0)}ms` : "") +
        "\n",
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
