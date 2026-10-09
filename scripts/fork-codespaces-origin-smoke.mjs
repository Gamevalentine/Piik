// GitHub Actions checks that an HTTP backend behind Codespaces' HTTPS proxy
// issues HTTPS invitations while requiring a private Host site password.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const localOrigin = "http://127.0.0.1:8787";
const publicOrigin = "https://piik-preview-ci-8787.app.github.dev";
const password = readFileSync("build/codespaces/host-password.txt", "utf8").trim();
assert.match(password, /^[a-f0-9]{36}$/);

const health = await fetch(localOrigin + "/healthz", { signal: AbortSignal.timeout(5000) });
assert.equal(health.ok, true, "Go server must be running");
assert.deepEqual(await health.json(), { status: "ok" });

const initial = await fetch(localOrigin + "/api/rooms", {
  method: "POST", headers: { "Content-Type": "application/json", Origin: publicOrigin },
  body: JSON.stringify({ codeEntryPolicy: "open" }),
  signal: AbortSignal.timeout(5000),
});
assert.equal(initial.status, 401, "Anonymous users must not be able to create rooms");

const login = await fetch(localOrigin + "/api/site-access", {
  method: "POST",
  headers: { Origin: publicOrigin, Authorization: `Bearer ${password}` },
  signal: AbortSignal.timeout(5000),
});
assert.equal(login.ok, true, "Site password must authenticate the Host");
const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
assert.ok(cookie, "Host must receive site-access cookie");

const response = await fetch(localOrigin + "/api/rooms", {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: publicOrigin, Cookie: cookie },
  body: JSON.stringify({ codeEntryPolicy: "open" }),
  signal: AbortSignal.timeout(5000),
});
assert.equal(response.ok, true, `Protected Host room creation failed (HTTP ${response.status})`);
const room = await response.json();
assert.match(room.roomId, /^[1-9]\d{3}$/);
assert.equal(new URL(room.inviteUrl).origin, publicOrigin);
assert.ok(new URL(room.inviteUrl).hash, "Invitation needs viewer access token");
console.log("Codespaces HTTPS-origin, Host admission, and public invitation URL passed.");
