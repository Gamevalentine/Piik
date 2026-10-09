// GitHub Actions checks that an HTTP backend behind Codespaces' HTTPS proxy
// issues HTTPS invitations while requiring a private Host site password.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const localOrigin = "http://127.0.0.1:8787";
const publicOrigin = "https://piik-preview-ci-8787.app.github.dev";
const forwardedOrigin = "http://localhost:8787";
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

// Unknown origins must still be rejected even when forwarded loopback is allowed.
const forbidden = await fetch(localOrigin + "/api/rooms", {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: "https://untrusted.example" },
  body: JSON.stringify({ codeEntryPolicy: "open" }),
  signal: AbortSignal.timeout(5000),
});
assert.equal(forbidden.status, 403, "Unknown origins must remain forbidden");

// The GitHub Codespaces port proxy can replace the HTTPS Origin with localhost.
const forwardedUnauthenticated = await fetch(localOrigin + "/api/rooms", {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: forwardedOrigin },
  body: JSON.stringify({ codeEntryPolicy: "open" }),
  signal: AbortSignal.timeout(5000),
});
assert.equal(forwardedUnauthenticated.status, 401, "Forwarded origin must be allowed but still require authentication");

const login = await fetch(localOrigin + "/api/site-access", {
  method: "POST",
  headers: { Origin: forwardedOrigin, Authorization: `Bearer ${password}` },
  signal: AbortSignal.timeout(5000),
});
assert.equal(login.ok, true, "Site password must authenticate the Host");
const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
assert.ok(cookie, "Host must receive site-access cookie");

const response = await fetch(localOrigin + "/api/rooms", {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: forwardedOrigin, Cookie: cookie },
  body: JSON.stringify({ codeEntryPolicy: "open" }),
  signal: AbortSignal.timeout(5000),
});
assert.equal(response.ok, true, `Protected Host room creation failed (HTTP ${response.status})`);
const room = await response.json();
assert.match(room.roomId, /^[1-9]\d{3}$/);
assert.equal(new URL(room.inviteUrl).origin, publicOrigin);
assert.ok(new URL(room.inviteUrl).hash, "Invitation needs viewer access token");
console.log("Codespaces HTTPS + proxied localhost Origin, Host admission, invitation URL, and blocked untrusted origin passed.");
