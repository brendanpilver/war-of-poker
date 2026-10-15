/**
 * The Short render pipeline: spec + example → frames, narration, captions,
 * copy, and an MP4 with a synchronised voice track.
 *
 * Runs on an operator machine or a build runner -- **never inside the web
 * app**. It needs two things the production Hostinger runtime does not
 * provide and should not be asked to: Google Chrome (to paint and record) and
 * a speech engine (macOS `say` today). Nothing under `src/app` imports this
 * file; `tests/experiment-boundaries.test.ts` enforces that.
 *
 * Synchronisation is by construction. Each beat's narration is synthesised
 * first and measured; the timeline then gives every beat at least its
 * narration's length; and in the recorder, frames and audio run off the same
 * AudioContext clock, so a frame changes within one paint of its line
 * starting. After recording, the MP4's audio is decoded and measured per beat
 * as a check.
 */

import { execFile, spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import type { MarketingExample } from "../src/lib/experiments/examples";
import { FRAME, renderScenes, type Scene } from "../src/lib/experiments/render";
import {
  companionCopy,
  layoutTimeline,
  readingTime,
  scriptDrafts,
  toSrt,
  type Timeline,
} from "../src/lib/experiments/script";
import type { ContentSpec } from "../src/lib/experiments/spec";

const run = promisify(execFile);

/**
 * The speech engine's voice, and the `say -r` value that makes it speak at
 * each pacing's words per minute (`narrationWordsPerMinute`). The engine's
 * rate is not linear -- asking Reed for 180 gives about 153 -- so these were
 * measured over every example's narration on 2026-10-15 (macOS 14). Re-measure
 * when the voice or OS changes; the renderer still times each beat from the
 * real audio, so a stale calibration costs fit, not sync.
 */
export type Narration = { voice: string; sayRate: Record<"measured" | "brisk", number> };

export const DEFAULT_NARRATION: Narration = {
  voice: "Reed (English (US))",
  sayRate: { measured: 195, brisk: 203 },
};

export type RenderOptions = {
  outDir: string;
  /** Watermark every frame. Forced on when the example is not approved. */
  draft: boolean;
  framesOnly: boolean;
  /** Null renders a silent video with captions only. */
  narration: Narration | null;
  logoHref: string;
};

export type SyncReport = {
  /** Largest gap between a line starting and its frame appearing, seconds. */
  maxFrameLagSec: number;
  /** Per narrated beat: loudness while speaking vs the silence after it. */
  beats: { kind: string; start: number; voicedRms: number; afterRms: number | null }[];
  audioDecoded: boolean;
};

export type RenderResult = {
  dir: string;
  timeline: Timeline;
  video: string | null;
  mimeType: string | null;
  sync: SyncReport | null;
};

// ---------------------------------------------------------------------------
// Narration
// ---------------------------------------------------------------------------

/**
 * Seconds until speech ends in a 16-bit mono PCM WAV: the last sample above a
 * quiet threshold. The speech engine pads every line with silence, and
 * timing on the padded length would push a 25-second Short past 30.
 */
export function wavSpeechSeconds(bytes: Buffer): number {
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("not a WAV file");
  }
  let offset = 12;
  let sampleRate = 0;
  let bits = 0;
  while (offset + 8 <= bytes.length) {
    const id = bytes.toString("ascii", offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    if (id === "fmt ") {
      sampleRate = bytes.readUInt32LE(offset + 12);
      bits = bytes.readUInt16LE(offset + 22);
    }
    if (id === "data") {
      if (!sampleRate || bits !== 16) throw new Error("expected 16-bit PCM WAV");
      const start = offset + 8;
      const samples = Math.min(size, bytes.length - start) / 2;
      for (let i = samples - 1; i >= 0; i--) {
        if (Math.abs(bytes.readInt16LE(start + i * 2)) > 300) return (i + 1) / sampleRate;
      }
      return 0;
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error("WAV has no data chunk");
}

async function synthesise(text: string, file: string, voice: string, sayRate: number): Promise<Buffer> {
  if (process.platform !== "darwin") {
    throw new Error("Narration uses macOS `say`. Render on a Mac, or pass --silent.");
  }
  await run("say", [
    "-v", voice,
    "-r", String(sayRate),
    "-o", file,
    "--file-format=WAVE",
    "--data-format=LEI16@24000",
    text,
  ]);
  return readFile(file);
}

// ---------------------------------------------------------------------------
// Recording
// ---------------------------------------------------------------------------

type Clip = { start: number; data: string };

function recorderHtml(scenes: Scene[], clips: Clip[], ticks: number[], durationSec: number): string {
  const data = JSON.stringify({
    scenes: scenes.map((s) => ({ start: s.start, end: s.end, svg: s.svg })),
    clips,
    ticks,
  }).replace(/</g, "\\u003c");
  return `<!doctype html><html><body style="margin:0;background:#000">
<canvas id="c" width="${FRAME.width}" height="${FRAME.height}"></canvas>
<script>
const { scenes, clips, ticks } = ${data};
const duration = ${durationSec};
function load(svg) {
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  return img.decode().then(() => img);
}
function bytes(b64) {
  const s = atob(b64); const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out.buffer;
}
window.renderVideo = async () => {
  const images = await Promise.all(scenes.map((s) => load(s.svg)));
  const ac = new AudioContext({ sampleRate: 48000 });
  await ac.resume();
  const buffers = await Promise.all(clips.map((c) => ac.decodeAudioData(bytes(c.data))));
  const dest = ac.createMediaStreamDestination();
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");
  const types = [
    "video/mp4;codecs=avc1.640028,mp4a.40.2", "video/mp4;codecs=avc1,mp4a.40.2", "video/mp4",
    "video/webm;codecs=vp9,opus", "video/webm",
  ];
  const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t));
  if (!mimeType) throw new Error("This browser cannot record video.");
  const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
  let shown = -1;
  const firstShown = scenes.map(() => null);
  const draw = (t) => {
    let i = scenes.findIndex((s) => t >= s.start && t < s.end);
    if (i < 0) i = scenes.length - 1;
    if (i !== shown) { ctx.drawImage(images[i], 0, 0); shown = i; if (firstShown[i] === null) firstShown[i] = t; }
    ctx.drawImage(images[i], 0, 0);
    ctx.fillStyle = "#2a2823"; ctx.fillRect(0, ${FRAME.height - 14}, ${FRAME.width}, 14);
    ctx.fillStyle = "#d6a129"; ctx.fillRect(0, ${FRAME.height - 14}, ${FRAME.width} * Math.min(1, t / duration), 14);
  };
  draw(0);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6000000, audioBitsPerSecond: 128000 });
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise((r) => { recorder.onstop = r; });
  recorder.start(500);
  // One clock for picture and sound: t = ac.currentTime - t0.
  const t0 = ac.currentTime + 0.25;
  clips.forEach((clip, i) => {
    const src = ac.createBufferSource(); src.buffer = buffers[i]; src.connect(dest); src.start(t0 + clip.start);
  });
  for (const at of ticks) {
    const osc = ac.createOscillator(); const gain = ac.createGain();
    osc.frequency.value = 880; gain.gain.value = 0.06;
    osc.connect(gain); gain.connect(dest); osc.start(t0 + at); osc.stop(t0 + at + 0.05);
  }
  await new Promise((done) => {
    const tick = () => {
      const t = ac.currentTime - t0;
      draw(Math.max(0, Math.min(t, duration)));
      if (t >= duration + 0.2) done(); else setTimeout(tick, 1000 / 60);
    };
    tick();
  });
  recorder.stop();
  await stopped;
  const blob = new Blob(chunks, { type: mimeType });
  const buf = await blob.arrayBuffer();

  // Check: decode what was recorded and measure loudness per narrated beat.
  let beats = []; let audioDecoded = false;
  try {
    const decoded = await new AudioContext().decodeAudioData(buf.slice(0));
    audioDecoded = true;
    const pcm = decoded.getChannelData(0); const rate = decoded.sampleRate;
    const rms = (a, b) => {
      const from = Math.max(0, Math.floor(a * rate)), to = Math.min(pcm.length, Math.floor(b * rate));
      if (to <= from) return 0; let sum = 0; for (let i = from; i < to; i++) sum += pcm[i] * pcm[i];
      return Math.sqrt(sum / (to - from));
    };
    // The recording starts ~0.25s before t0; find the offset from the first sound.
    let lead = 0; for (let i = 0; i < pcm.length; i++) { if (Math.abs(pcm[i]) > 0.01) { lead = i / rate - clips[0].start; break; } }
    beats = clips.map((c, i) => {
      const len = buffers[i].duration;
      const next = clips[i + 1] ? clips[i + 1].start : duration;
      const gap = next - (c.start + len);
      return {
        start: c.start,
        voicedRms: rms(lead + c.start + 0.05, lead + c.start + len - 0.05),
        afterRms: gap > 0.4 ? rms(lead + c.start + len + 0.15, lead + next - 0.15) : null,
      };
    });
  } catch (e) { audioDecoded = false; }

  const lags = scenes.map((s, i) => (firstShown[i] === null ? 0 : firstShown[i] - s.start));
  const u8 = new Uint8Array(buf); let binary = "";
  for (let i = 0; i < u8.length; i += 0x8000) binary += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return JSON.stringify({ mimeType, data: btoa(binary), maxFrameLagSec: Math.max(...lags), beats, audioDecoded });
};
</script></body></html>`;
}

type Cdp = {
  send<T>(method: string, params?: Record<string, unknown>, sessionId?: string): Promise<T>;
  close(): void;
};

/** Minimal Chrome DevTools Protocol client over Node's built-in WebSocket. */
async function connectCdp(url: string): Promise<Cdp> {
  const socket = new WebSocket(url);
  await new Promise<void>((ok, fail) => {
    socket.addEventListener("open", () => ok(), { once: true });
    socket.addEventListener("error", () => fail(new Error("CDP connection failed")), { once: true });
  });
  let nextId = 1;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as { id?: number; result?: unknown; error?: { message: string } };
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

export function chromePath(): string {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if (process.platform === "darwin") return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (process.platform === "win32") return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  return "google-chrome";
}

async function record(html: string, workDir: string) {
  const pagePath = join(workDir, "recorder.html");
  await writeFile(pagePath, html);
  const child = spawn(
    chromePath(),
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${join(workDir, "profile")}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
      "--autoplay-policy=no-user-gesture-required",
      "--allow-file-access-from-files",
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  const exited = new Promise((r) => child.once("exit", r));
  try {
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
    const cdp = await connectCdp(endpoint);
    try {
      const { targetId } = await cdp.send<{ targetId: string }>("Target.createTarget", { url: pathToFileURL(pagePath).href });
      const { sessionId } = await cdp.send<{ sessionId: string }>("Target.attachToTarget", { targetId, flatten: true });
      for (let i = 0; i < 100; i++) {
        const probe = await cdp.send<{ result: { value: boolean } }>(
          "Runtime.evaluate",
          { expression: "document.readyState === 'complete' && typeof window.renderVideo === 'function'", returnByValue: true },
          sessionId,
        );
        if (probe.result.value) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      const result = await cdp.send<{ result: { value: string }; exceptionDetails?: { text: string; exception?: { description?: string } } }>(
        "Runtime.evaluate",
        { expression: "window.renderVideo()", awaitPromise: true, returnByValue: true },
        sessionId,
      );
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
      }
      return JSON.parse(result.result.value) as {
        mimeType: string;
        data: string;
        maxFrameLagSec: number;
        beats: { start: number; voicedRms: number; afterRms: number | null }[];
        audioDecoded: boolean;
      };
    } finally {
      cdp.close();
    }
  } finally {
    // Wait for Chrome to exit, or it is still writing its profile while the
    // caller deletes the work directory.
    if (child.exitCode === null) child.kill();
    await exited;
  }
}

// ---------------------------------------------------------------------------
// The whole render
// ---------------------------------------------------------------------------

export async function renderShort(
  spec: ContentSpec,
  example: MarketingExample,
  options: RenderOptions,
): Promise<RenderResult> {
  const draft = options.draft || example.status !== "approved";
  const scripted = scriptDrafts(spec, example);
  if (!scripted.ok) throw new Error(scripted.error);
  const { drafts } = scripted;

  const name = spec.contentId ?? `${example.id}-${spec.variant ?? "draft"}`;
  const dir = join(options.outDir, name);
  await mkdir(join(dir, "frames"), { recursive: true });

  // 1. Narration first, so its real lengths can drive the timing.
  const audio = new Map<number, { file: string; seconds: number; bytes: Buffer }>();
  if (options.narration) {
    await mkdir(join(dir, "narration"), { recursive: true });
    for (const [i, d] of drafts.entries()) {
      if (!d.spoken) continue;
      const file = join(dir, "narration", `${String(i + 1).padStart(2, "0")}-${d.kind}.wav`);
      const bytes = await synthesise(d.spoken, file, options.narration.voice, options.narration.sayRate[spec.settings.pacing]);
      audio.set(i, { file, seconds: wavSpeechSeconds(bytes), bytes });
    }
    const countdown = drafts.findIndex((d) => d.kind === "countdown");
    const asked = audio.get(countdown);
    if (asked && asked.seconds > spec.settings.countdownSec - 0.2) {
      throw new Error(`The question takes ${asked.seconds.toFixed(1)}s to say; the countdown is ${spec.settings.countdownSec}s.`);
    }
  }

  // 2. Timing: every beat gets at least its caption's reading time and the
  // measured length of its narration plus a breath.
  const laid = layoutTimeline(
    drafts,
    spec.settings,
    (d) => {
      const i = drafts.indexOf(d);
      const spoken = audio.get(i)?.seconds ?? 0;
      return Math.max(readingTime(d.text, spec.settings.pacing), spoken + 0.25);
    },
    example.id,
  );
  if (!laid.ok) throw new Error(`${laid.error}${options.narration ? " (with narration)" : ""}`);
  const { timeline } = laid;

  // 3. Frames, captions, copy, and the spec itself.
  const scenes = renderScenes(spec, example, timeline, { draft, logoHref: options.logoHref });
  const copy = companionCopy(spec, example, timeline);
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
      timeline.beats.filter((b) => b.spoken).map((b) => `[${b.start.toFixed(2)}s ${b.kind}] ${b.spoken}`).join("\n"),
      "```",
      "",
      "## Article draft",
      "",
      copy.articleDraft,
      "",
    ].join("\n"),
  );
  if (options.framesOnly) return { dir, timeline, video: null, mimeType: null, sync: null };

  // 4. Record: frames and narration on one clock, ticks under the countdown.
  // Spoken drafts and spoken beats correspond one to one, in order.
  const spokenBeats = timeline.beats.filter((b) => b.spoken);
  const spokenDrafts = [...audio.keys()].sort((a, b) => a - b);
  const clips: Clip[] = spokenDrafts.map((i, n) => ({
    start: spokenBeats[n].start,
    data: (audio.get(i) as { bytes: Buffer }).bytes.toString("base64"),
  }));
  const beatsWithAudio = spokenBeats.map((b) => ({ kind: b.kind, start: b.start }));
  const ticks = timeline.beats.filter((b) => b.kind === "countdown").map((b) => b.start + (b.spoken ? 0.9 : 0));

  const work = await mkdtemp(join(tmpdir(), "wop-render-"));
  try {
    const recorded = await record(recorderHtml(scenes, clips, ticks, timeline.durationSec), work);
    const extension = recorded.mimeType.startsWith("video/mp4") ? "mp4" : "webm";
    const video = join(dir, `video.${extension}`);
    await writeFile(video, Buffer.from(recorded.data, "base64"));
    const sync: SyncReport = {
      maxFrameLagSec: recorded.maxFrameLagSec,
      audioDecoded: recorded.audioDecoded,
      beats: recorded.beats.map((b, i) => ({ kind: beatsWithAudio[i]?.kind ?? "?", ...b })),
    };
    await writeFile(join(dir, "sync.json"), `${JSON.stringify(sync, null, 2)}\n`);
    return { dir, timeline, video, mimeType: recorded.mimeType, sync };
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}
