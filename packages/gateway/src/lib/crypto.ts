import crypto from "node:crypto";

/**
 * Symmetric encryption for secrets at rest (customer LLM API keys).
 *
 * AES-256-GCM: authenticated encryption, so tampering is detected on decrypt.
 * The 256-bit key is derived once (scrypt) from a server secret — set
 * LLM_KEY_SECRET in the gateway env; falls back to JWT_SECRET so the feature
 * works out of the box, though a dedicated secret is preferred in production.
 *
 * Stored format (base64): [12-byte IV][16-byte auth tag][ciphertext].
 * The raw key is NEVER persisted or returned to the browser — only this blob
 * and a last-4 for display.
 */

const SECRET =
  process.env.LLM_KEY_SECRET ||
  process.env.JWT_SECRET ||
  "dev-insecure-secret-change-me";

// Static salt is acceptable here: the input secret is high-entropy and the
// derived key is process-wide, not per-message. Per-message randomness lives
// in the IV.
const KEY = crypto.scryptSync(SECRET, "yoxperience.llm.key.v1", 32);

const IV_LEN = 12;
const TAG_LEN = 16;

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decryptSecret(blob: string): string {
  const buf = Buffer.from(blob, "base64");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ct, undefined, "utf8") + decipher.final("utf8");
}

export function lastFour(secret: string): string {
  return secret.slice(-4);
}
