// Production Go control-plane smoke behind HTTPS terminator.
import assert from "node:assert/strict";
const local = process.env.LUNOR_TEST_LOCAL_ORIGIN || "http://127.0.0.1:8787";
const publicOrigin = process.env.LUNOR_TEST_PUBLIC_ORIGIN;
const password = process.env.LUNOR_TEST_SITE_PASSWORD;
if (!publicOrigin?.startsWith("https://") || !password) throw new Error("LUNOR_TEST_PUBLIC_ORIGIN and LUNOR_TEST_SITE_PASSWORD are required");
const health = await fetch(local + "/healthz", { signal: AbortSignal.timeout(5000) });
assert.equal(health.ok, true);
assert.deepEqual(await health.json(), { status: "ok" });
const createRoom = (headers) => fetch(local + "/api/rooms", {
  method: "POST", headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify({ codeEntryPolicy: "open" }), signal: AbortSignal.timeout(5000),
});
assert.equal((await createRoom({ Origin: publicOrigin })).status, 401,
  "Host room creation must require site authentication");
assert.equal((await createRoom({ Origin: "https://untrusted.example" })).status, 403,
  "Unknown origins must be blocked");
const login = await fetch(local + "/api/site-access", {
  method: "POST", headers: { Origin: publicOrigin, Authorization: "Bearer " + password },
  signal: AbortSignal.timeout(5000),
});
assert.equal(login.ok, true, "Password must authenticate Host");
const header = login.headers.get("set-cookie") || "";
const cookie = header.split(";", 1)[0];
assert.ok(cookie);
assert.match(header, /Secure/i, "Production cookie must have Secure attribute");
const result = await createRoom({ Origin: publicOrigin, Cookie: cookie });
assert.equal(result.ok, true, "Authenticated Host must create a room");
const room = await result.json();
assert.match(room.roomId, /^[1-9]\d{3}$/);
assert.equal(new URL(room.inviteUrl).origin, publicOrigin);
assert.ok(new URL(room.inviteUrl).hash);
console.log("LUNOR Share protected production control-plane smoke passed.");
