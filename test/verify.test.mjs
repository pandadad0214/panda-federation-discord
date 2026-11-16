import { test } from "node:test";
import assert from "node:assert/strict";
import { hexToBytes, verifyDiscordRequest } from "../src/index.js";

function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

test("hexToBytes rejects bad input", () => {
  assert.equal(hexToBytes("zz"), null);
  assert.equal(hexToBytes("abc"), null);
  assert.equal(hexToBytes(""), null);
  assert.deepEqual(hexToBytes("00ff"), new Uint8Array([0, 255]));
});

test("verifyDiscordRequest accepts a fresh valid signature and rejects unsigned or stale ones", async () => {
  const pair = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const publicKeyHex = bytesToHex(raw);

  const body = JSON.stringify({ type: 1 });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const message = new TextEncoder().encode(timestamp + body);
  const sig = new Uint8Array(await crypto.subtle.sign("Ed25519", pair.privateKey, message));

  const signed = new Request("https://example.com/", {
    method: "POST",
    headers: {
      "X-Signature-Ed25519": bytesToHex(sig),
      "X-Signature-Timestamp": timestamp,
    },
    body,
  });
  assert.equal(await verifyDiscordRequest(signed, body, publicKeyHex), true);

  const unsigned = new Request("https://example.com/", { method: "POST", body });
  assert.equal(await verifyDiscordRequest(unsigned, body, publicKeyHex), false);

  const staleTs = String(Math.floor(Date.now() / 1000) - 301);
  const staleMsg = new TextEncoder().encode(staleTs + body);
  const staleSig = new Uint8Array(await crypto.subtle.sign("Ed25519", pair.privateKey, staleMsg));
  const stale = new Request("https://example.com/", {
    method: "POST",
    headers: {
      "X-Signature-Ed25519": bytesToHex(staleSig),
      "X-Signature-Timestamp": staleTs,
    },
    body,
  });
  assert.equal(await verifyDiscordRequest(stale, body, publicKeyHex), false);
});
