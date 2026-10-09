// Fork-only loopback smoke check: room creation, invite page, Host/Viewer signaling.
// This does not exercise video/audio capture or publish a public website.
import assert from "node:assert/strict";
import WebSocket from "ws";

const origin = "http://localhost:8787";
const websocket = "ws://localhost:8787/signal";
const protocol = "piik-v23";
const sockets = [];

async function authenticate(fields) {
  const socket = new WebSocket(websocket, { origin });
  sockets.push(socket);
  return await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => fail(new Error("Signaling timed out")), 10_000);
    let finished = false;
    function finish(callback, value) {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      callback(value);
    }
    function fail(error) { finish(reject, error); }
    socket.once("error", fail);
    socket.once("close", () => fail(new Error("Signaling closed before authentication")));
    socket.on("message", (buffer) => {
      let message;
      try { message = JSON.parse(buffer.toString()); }
      catch (error) { fail(error); return; }
      if (message.type === "error") {
        fail(new Error(`Signaling error: ${message.code}`));
      }
      if (message.type === "authenticated") finish(resolve, message);
    });
    socket.once("open", () => socket.send(JSON.stringify({
      type: "authenticate", protocol, ...fields,
    })));
  });
}

try {
  const response = await fetch(`${origin}/api/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ codeEntryPolicy: "open" }),
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(response.ok, true, `Create room: HTTP ${response.status}`);
  const room = await response.json();
  assert.match(room.roomId, /^[1-9][0-9]{3}$/);
  assert.match(room.hostToken, /^[A-Za-z0-9_-]{32,128}$/);

  const invitation = new URL(room.inviteUrl);
  assert.equal(invitation.origin, origin);
  const viewerGrant = new URLSearchParams(invitation.hash.slice(1)).get("v");
  assert.match(viewerGrant ?? "", /^[A-Za-z0-9_-]{22}$/);

  const page = await fetch(invitation.href, { signal: AbortSignal.timeout(10_000) });
  assert.equal(page.ok, true, `Invite page: HTTP ${page.status}`);
  assert.match(await page.text(), /<div id="root"><\/div>/);

  const host = await authenticate({
    roomId: room.roomId, role: "host", token: room.hostToken,
    clientId: "fork_baseline_host_12345678",
  });
  assert.equal(host.role, "host");
  const viewer = await authenticate({
    roomId: room.roomId, role: "viewer", viewerGrant,
    clientId: "fork_baseline_viewer_12345678",
  });
  assert.equal(viewer.role, "viewer");
  assert.equal(viewer.hostOnline, true);
  console.log("Room creation, invitation page, Host and Viewer signaling passed.");
} finally {
  for (const socket of sockets) socket.terminate();
}
