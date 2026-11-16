// GitHub Actions checks that an HTTP backend behind Codespaces' HTTPS proxy
// issues HTTPS invitations while requiring a private Host site password.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import WebSocket from "ws";

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

const grant = new URLSearchParams(new URL(room.inviteUrl).hash.slice(1)).get("v");
assert.ok(grant, "Viewer invitation needs a grant");

const sockets = [];
async function authenticate(role, clientId) {
  const socket = new WebSocket("ws://127.0.0.1:8787/signal", {
    origin: forwardedOrigin,
    ...(role === "host" ? { headers: { Cookie: cookie } } : {}),
  });
  sockets.push(socket);
  return await new Promise((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => finish(reject, new Error("Signaling authentication timed out")), 8000);
    function finish(callback, value) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback(value);
    }
    socket.once("error", error => finish(reject, error));
    socket.once("close", () => finish(reject, new Error("Signaling closed before authentication")));
    socket.on("message", raw => {
      let message;
      try { message = JSON.parse(raw.toString()); }
      catch (error) { finish(reject, error); return; }
      if (message.type === "error") finish(reject, new Error(message.code));
      if (message.type === "authenticated") finish(resolve, message);
    });
    socket.once("open", () => socket.send(JSON.stringify({
      type: "authenticate", protocol: "piik-v23", roomId: room.roomId, role, clientId,
      ...(role === "host" ? { token: room.hostToken } : { viewerGrant: grant }),
    })));
  });
}

try {
  const hostAuth = await authenticate("host", "lunor_smoke_host_0001");
  assert.equal(hostAuth.maxViewers, 20, "This preview must permit 20 viewers");
  for (let index = 0; index < 20; index++) {
    const viewer = await authenticate("viewer", `lunor_smoke_viewer_${String(index).padStart(2, "0")}`);
    assert.equal(viewer.role, "viewer", `Viewer ${index + 1} must authenticate`);
  }
  await assert.rejects(
    authenticate("viewer", "lunor_smoke_viewer_21"),
    /ROOM_FULL|INVALID_TOKEN/,
    "The 21st viewer must not be admitted",
  );
  console.log("LUNOR Share: Host + 20 Viewers accepted; Viewer 21 rejected.");
} finally {
  for (const socket of sockets) socket.terminate();
}
console.log("Codespaces HTTPS, proxied Origin, protected room admission and 20-viewer limit passed.");
