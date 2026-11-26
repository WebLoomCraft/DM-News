import crypto from "node:crypto";
import { getAuthSecret } from "./config";

/**
 * Hashing and token helpers.
 *
 * Password-reset tokens are stored as a *lookup hash* (SHA-256, hex) so they
 * can be found with an index instead of bcrypt-comparing every user's token —
 * the previous approach made a single reset request cost O(users) bcrypt
 * operations. SHA-256 is appropriate here because the input is 256 bits of
 * CSPRNG output, not a low-entropy password: brute force is infeasible.
 */

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

/** Deterministic lookup hash for high-entropy tokens. */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

/** Constant-time comparison for any two equal-length secrets. */
export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    // Still perform a comparison so timing does not reveal the length.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Derives a purpose-scoped subkey from AUTH_SECRET. Domain separation means
 * compromising one use (e.g. a leaked encryption key) does not weaken the
 * JWT signing key.
 */
function deriveKey(purpose: string): Buffer {
  const { secret } = getAuthSecret();
  return Buffer.from(crypto.hkdfSync("sha256", secret, "dm-news-network", purpose, 32));
}

/**
 * Encrypts small session state with AES-256-GCM.
 *
 * This is how the JWT stays stateless while still being revocable: the token
 * carries an opaque, authenticated session handle plus the user's current
 * session version. Neither value can be forged or read by the client.
 */
export function sealSessionState(payload: { sid: string; ver: number }): string {
  const key = deriveKey("session-state-v1");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}

export function openSessionState(sealed: string): { sid: string; ver: number } | null {
  try {
    const raw = Buffer.from(sealed, "base64url");
    if (raw.length < 12 + 16 + 1) return null;
    const key = deriveKey("session-state-v1");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const parsed = JSON.parse(plaintext.toString("utf8")) as { sid?: unknown; ver?: unknown };
    if (typeof parsed.sid !== "string" || typeof parsed.ver !== "number") return null;
    return { sid: parsed.sid, ver: parsed.ver };
  } catch {
    return null;
  }
}
