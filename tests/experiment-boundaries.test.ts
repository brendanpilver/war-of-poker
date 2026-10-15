import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { wavSpeechSeconds } from "../scripts/render-pipeline";
import { speakingTime, spokenDollars, spokenText } from "../src/lib/experiments/script";

/**
 * Where code may run. The renderer needs Google Chrome and a speech engine,
 * neither of which the production Hostinger runtime provides, so it must
 * never be reachable from the web app. The analytics job must stay apart
 * from rendering and from customer payments.
 */

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const imports = (path: string) =>
  [...readFileSync(path, "utf8").matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);

describe("runtime boundaries", () => {
  it("no web-app or library file imports the renderer, Chrome or child processes", () => {
    for (const file of [...files("src/app"), ...files("src/lib")]) {
      for (const spec of imports(file)) {
        assert.ok(!spec.includes("scripts/"), `${file} imports ${spec}`);
        assert.notEqual(spec, "node:child_process", `${file} spawns processes`);
      }
    }
  });

  it("the analytics job does not import the frame renderer or any payment code", () => {
    const job = imports("src/lib/experiments/job.ts");
    for (const forbidden of ["./render", "@/lib/stripe", "@/lib/purchases", "@/lib/delivery"]) {
      assert.ok(!job.includes(forbidden), `job imports ${forbidden}`);
    }
  });

  it("the analytics job writes only to its own tables and experiments", () => {
    const source = readFileSync("src/lib/experiments/job.ts", "utf8");
    const written = [...source.matchAll(/from\("([a-z_]+)"\)\s*\.(?:insert|upsert|update|delete)/g)].map((m) => m[1]);
    const allowed = new Set(["analytics_runs", "analytics_snapshots", "experiments", "recommendations", "operator_reports"]);
    assert.ok(written.length > 0);
    for (const table of written) assert.ok(allowed.has(table), `job writes to ${table}`);
  });
});

describe("narration text", () => {
  it("says dollar amounts the way players do", () => {
    assert.equal(spokenDollars(246), "two forty-six");
    assert.equal(spokenDollars(205), "two oh five");
    assert.equal(spokenDollars(300), "three hundred");
    assert.equal(spokenDollars(17), "seventeen");
    assert.equal(spokenDollars(58), "fifty-eight");
  });

  it("reads board shorthand, ranges and abbreviations aloud", () => {
    assert.equal(spokenText("Flop K-7-2. They bet the pot."), "Flop king, seven, two. They bet the pot.");
    assert.equal(spokenText("At SPR 1–2, top set"), "At S-P-R 1 to 2, top set");
    assert.equal(spokenText("You 3-bet kings."), "You three-bet kings.");
    assert.equal(spokenText("$246 in the pot."), "two forty-six in the pot.");
  });

  it("allows for pauses at punctuation", () => {
    assert.ok(speakingTime("one, two. three", "brisk") > speakingTime("one two three", "brisk"));
  });
});

describe("narration audio", () => {
  it("measures speech, not the engine's trailing silence", () => {
    const rate = 24000;
    const samples = rate; // one second
    const data = Buffer.alloc(samples * 2);
    for (let i = 0; i < rate / 2; i++) data.writeInt16LE(i % 2 ? 4000 : -4000, i * 2); // half a second of sound
    const header = Buffer.alloc(44);
    header.write("RIFF", 0);
    header.writeUInt32LE(36 + data.length, 4);
    header.write("WAVE", 8);
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(rate, 24);
    header.writeUInt32LE(rate * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write("data", 36);
    header.writeUInt32LE(data.length, 40);
    assert.equal(wavSpeechSeconds(Buffer.concat([header, data])), 0.5);
  });
});
