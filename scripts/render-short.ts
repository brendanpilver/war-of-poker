/**
 * Renders a Short from its content spec.
 *
 *   npm run render:short -- <spec.json> [--out renders] [--draft] [--frames-only]
 *
 * `<spec.json>` is one spec, an array of specs, or `{ "specs": [...] }` -- the
 * shape `/growth/specs` returns -- so an accepted batch renders in one call.
 *
 * For each spec it writes, under `<out>/<content id>/`:
 *
 *   spec.json      the exact spec rendered, for reproduction
 *   frames/*.svg   one still per beat
 *   captions.srt   burned-in text as a caption track
 *   copy.md        description, social post, narration, article draft
 *   video.mp4      (or .webm where the browser cannot record MP4)
 *
 * The video is recorded by headless Google Chrome: the frames are painted to
 * a canvas in real time and captured with the browser's own MediaRecorder,
 * so nothing is installed -- no ffmpeg, no npm package. Set CHROME_PATH if
 * Chrome is not in its default location. The video is silent; the narration
 * in copy.md is for a voice-over.
 *
 * An example that is not `approved` renders only with --draft, and then every
 * frame carries a DRAFT watermark. This is the publication gate the engine
 * relies on; do not work around it.
 */

import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { exampleById } from "../src/lib/experiments/examples";
import { renderScenes, FRAME, type Scene } from "../src/lib/experiments/render";
import { buildTimeline, companionCopy, toSrt } from "../src/lib/experiments/script";
import { parseContentSpec, type ContentSpec } from "../src/lib/experiments/spec";

type Args = { input: string; out: string; draft: boolean; framesOnly: boolean };

function parseArgs(argv: string[]): Args {
  const args: Args = { input: "", out: "renders", draft: false, framesOnly: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--out") args.out = argv[++i] ?? args.out;
    else if (arg === "--draft") args.draft = true;
    else if (arg === "--frames-only") args.framesOnly = true;
    else if (!arg.startsWith("--")) args.input = arg;
  }
  if (!args.input) {
    console.error("usage: npm run render:short -- <spec.json> [--out renders] [--draft] [--frames-only]");
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

function chromePath(): string {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if (process.platform === "darwin") return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (process.platform === "win32") return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  return "google-chrome";
}

/** The page that plays the frames onto a canvas and records them. */
function recorderHtml(scenes: Scene[], durationSec: number): string {
  const data = JSON.stringify(scenes.map((s) => ({ start: s.start, end: s.end, svg: s.svg })));
  return `<!doctype html><html><body style="margin:0;background:#000">
<canvas id="c" width="${FRAME.width}" height="${FRAME.height}"></canvas>
<script>
const scenes = ${data.replace(/</g, "\\u003c")};
const duration = ${durationSec};
function load(svg) {
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  return img.decode().then(() => img);
}
window.renderVideo = async () => {
  const images = await Promise.all(scenes.map((s) => load(s.svg)));
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");
  const types = ["video/mp4;codecs=avc1.640028", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
  const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t));
  if (!mimeType) throw new Error("This browser cannot record video.");
  const draw = (t) => {
    let i = scenes.findIndex((s) => t >= s.start && t < s.end);
    if (i < 0) i = scenes.length - 1;
    ctx.drawImage(images[i], 0, 0);
    ctx.fillStyle = "#2a2823";
    ctx.fillRect(0, ${FRAME.height - 14}, ${FRAME.width}, 14);
    ctx.fillStyle = "#d6a129";
    ctx.fillRect(0, ${FRAME.height - 14}, ${FRAME.width} * Math.min(1, t / duration), 14);
  };
  draw(0);
  const recorder = new MediaRecorder(canvas.captureStream(30), { mimeType, videoBitsPerSecond: 6000000 });
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise((r) => { recorder.onstop = r; });
  recorder.start(500);
  const t0 = performance.now();
  await new Promise((done) => {
    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      draw(Math.min(t, duration));
      if (t >= duration) done(); else setTimeout(tick, 1000 / 60);
    };
    tick();
  });
  recorder.stop();
  await stopped;
  const bytes = new Uint8Array(await new Blob(chunks, { type: mimeType }).arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return JSON.stringify({ mimeType, data: btoa(binary) });
};
</script></body></html>`;
}

/** Minimal Chrome DevTools Protocol client over Node's built-in WebSocket. */
type Cdp = {
  send<T>(method: string, params?: Record<string, unknown>, sessionId?: string): Promise<T>;
  close(): void;
};

async function connectCdp(url: string): Promise<Cdp> {
  const socket = new WebSocket(url);
  await new Promise<void>((ok, fail) => {
    socket.addEventListener("open", () => ok(), { once: true });
    socket.addEventListener("error", () => fail(new Error("CDP connection failed")), { once: true });
  });

  let nextId = 1;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as {
      id?: number;
      result?: unknown;
      error?: { message: string };
    };
    if (message.id === undefined) return;
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(message.error.message));
    else waiter.resolve(message.result);
  });

  return {
    send<T>(method: string, params: Record<string, unknown> = {}, sessionId?: string) {
      const id = nextId++;
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      return new Promise<T>((resolvePromise, reject) => {
        pending.set(id, { resolve: (v) => resolvePromise(v as T), reject });
      });
    },
    close() {
      socket.close();
    },
  };
}

async function launchChrome(profileDir: string) {
  const child = spawn(
    chromePath(),
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${profileDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
      "--allow-file-access-from-files",
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  const endpoint = await new Promise<string>((ok, fail) => {
    let buffer = "";
    const timer = setTimeout(() => fail(new Error("Chrome did not start within 20s")), 20_000);
    child.stderr.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const match = /DevTools listening on (ws:\/\/\S+)/.exec(buffer);
      if (match) {
        clearTimeout(timer);
        ok(match[1]);
      }
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      fail(new Error(`Could not launch Chrome at ${chromePath()}: ${error.message}. Set CHROME_PATH.`));
    });
  });
  return { child, endpoint };
}

async function recordVideo(html: string, workDir: string, durationSec: number) {
  const pagePath = join(workDir, "recorder.html");
  await writeFile(pagePath, html);
  const { child, endpoint } = await launchChrome(join(workDir, "profile"));
  const cdp = await connectCdp(endpoint);
  try {
    const { targetId } = await cdp.send<{ targetId: string }>("Target.createTarget", {
      url: pathToFileURL(pagePath).href,
    });
    const { sessionId } = await cdp.send<{ sessionId: string }>("Target.attachToTarget", {
      targetId,
      flatten: true,
    });
    for (let i = 0; i < 100; i++) {
      const probe = await cdp.send<{ result: { value: boolean } }>(
        "Runtime.evaluate",
        { expression: "document.readyState === 'complete' && typeof window.renderVideo === 'function'", returnByValue: true },
        sessionId,
      );
      if (probe.result.value) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    process.stdout.write(`  recording ${durationSec}s in real time…\n`);
    const result = await cdp.send<{ result: { value: string }; exceptionDetails?: { text: string } }>(
      "Runtime.evaluate",
      { expression: "window.renderVideo()", awaitPromise: true, returnByValue: true },
      sessionId,
    );
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return JSON.parse(result.result.value) as { mimeType: string; data: string };
  } finally {
    cdp.close();
    // Wait for Chrome to exit, or it is still writing its profile while the
    // caller deletes the work directory.
    const exited = child.exitCode !== null ? Promise.resolve() : new Promise((r) => child.once("exit", r));
    child.kill();
    await exited;
  }
}

async function renderOne(spec: ContentSpec, args: Args, logoHref: string) {
  const example = exampleById(spec.exampleId);
  if (!example) throw new Error(`Unknown example ${spec.exampleId}.`);
  const draft = example.status !== "approved";
  if (draft && !args.draft) {
    throw new Error(
      `Example ${example.id} is ${example.status}, not approved. Re-run with --draft to render a watermarked draft for review.`,
    );
  }

  const built = buildTimeline(spec, example);
  if (!built.ok) throw new Error(built.error);
  const { timeline } = built;
  const scenes = renderScenes(spec, example, timeline, { draft, logoHref });
  const copy = companionCopy(spec, example, timeline);

  const name = spec.contentId ?? `${example.id}-${spec.variant ?? "draft"}`;
  const dir = resolve(args.out, name);
  await mkdir(join(dir, "frames"), { recursive: true });

  await writeFile(join(dir, "spec.json"), `${JSON.stringify(spec, null, 2)}\n`);
  await Promise.all(
    scenes.map((scene, i) =>
      writeFile(join(dir, "frames", `${String(i + 1).padStart(2, "0")}-${scene.beat.kind}.svg`), scene.svg),
    ),
  );
  await writeFile(join(dir, "captions.srt"), toSrt(timeline));
  await writeFile(
    join(dir, "copy.md"),
    [
      `# ${name}${draft ? " (DRAFT: example not approved)" : ""}`,
      "",
      `Tracked link: ${copy.trackedUrl ?? "assigned when the batch is accepted"}`,
      "",
      "## Description",
      "",
      copy.description,
      "",
      "## Social post",
      "",
      copy.socialPost,
      "",
      "## Narration",
      "",
      "```",
      copy.narration,
      "```",
      "",
      "## Article draft",
      "",
      copy.articleDraft,
      "",
    ].join("\n"),
  );

  process.stdout.write(`${name}: ${scenes.length} frames, ${timeline.durationSec}s${draft ? ", DRAFT" : ""}\n`);
  if (args.framesOnly) return;

  const work = await mkdtemp(join(tmpdir(), "wop-render-"));
  try {
    const video = await recordVideo(recorderHtml(scenes, timeline.durationSec), work, timeline.durationSec);
    const extension = video.mimeType.startsWith("video/mp4") ? "mp4" : "webm";
    const file = join(dir, `video.${extension}`);
    await writeFile(file, Buffer.from(video.data, "base64"));
    process.stdout.write(`  wrote ${file} (${video.mimeType})\n`);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const raw = JSON.parse(await readFile(args.input, "utf8")) as unknown;
  const logo = await readFile(resolve("public/brand/war-of-poker-stencil-logo.png"));
  const logoHref = `data:image/png;base64,${logo.toString("base64")}`;

  for (const candidate of specsFrom(raw)) {
    const parsed = parseContentSpec(candidate);
    if (!parsed.ok) throw new Error(`Invalid spec: ${parsed.error}`);
    await renderOne(parsed.spec, args, logoHref);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
