// Validate the fork's existing product WebRTC A/V probe on the GitHub runner.
// This probe covers simulated browser media, not the native App or a public site.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = "build/browser-local-pool";
const files = readdirSync(dir).filter((name) => /^carrier-vp8-single-\d+\.json$/.test(name));
assert.equal(files.length, 1, "Expected one isolated carrier VP8 single-viewer report");
const report = JSON.parse(readFileSync(join(dir, files[0]), "utf8"));
assert.equal(report.error, undefined, "The media probe must finish without an error");
assert.deepEqual(report.errors, [], "The media probe must report no product errors");
assert.equal(report.av, true, "Synthetic audio and video must both be enabled");
assert.ok((report.sourcePulses?.length ?? 0) >= 2, "Source must emit audio tone pulses");
const video = report.monitors?.find((entry) => entry.role === "A");
assert.ok(video, "Viewer video monitor must exist");
const frames = (video.samples ?? []).filter((frame) => frame.phase === "healthy" && frame.width > 0 && frame.height > 0);
assert.ok(frames.length >= 5, "Viewer must render at least five healthy video frames");
assert.ok(new Set(frames.map((frame) => frame.id)).size >= 3, "Viewer must render changing video frames");
const audio = report.audioMonitors?.find((entry) => entry.role === "A");
assert.ok(audio?.attached, "Viewer played-audio monitor must attach");
assert.ok((audio.pulses?.length ?? 0) >= 1, "Viewer must receive an audible synthetic tone pulse");
console.log(JSON.stringify({
  status: "passed",
  sourceAudioPulses: report.sourcePulses.length,
  receivedVideoFrames: frames.length,
  receivedAudioPulses: audio.pulses.length,
  note: "Existing Piik browser media producer, loopback synthetic video/audio",
}));
