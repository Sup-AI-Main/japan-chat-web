import { cookies } from "next/headers";
import { createHmac, scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

const ADMIN_COOKIE_NAME = "admin_session";
const TOKEN_VERSION = "v1";
const SCRYPT_KEYLEN = 64;

// ---------------------------------------------------------------------------
// Password verification (scrypt, timing-safe)
// ---------------------------------------------------------------------------

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) return false;

  const [saltHex, keyHex] = hash.split(":");
  if (!saltHex || !keyHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const storedKey = Buffer.from(keyHex, "hex");
  if (storedKey.length !== SCRYPT_KEYLEN) return false;

  const derivedKey = (await scryptAsync(
    password,
    salt,
    SCRYPT_KEYLEN,
  )) as Buffer;

  return timingSafeEqual(derivedKey, storedKey);
}

// ---------------------------------------------------------------------------
// Session token (HMAC-SHA256 signed, no Max-Age = session cookie)
// ---------------------------------------------------------------------------

function getSessionSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET || null;
}

function createSessionToken(): string | null {
  const secret = getSessionSecret();
  if (!secret) return null;

  const issuedAt = Date.now().toString(36);
  const nonce = randomBytes(16).toString("hex");
  const payload = `${TOKEN_VERSION}.${issuedAt}.${nonce}`;

  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return `${payload}.${signature}`;
}

function verifySessionToken(token: string): boolean {
  const secret = getSessionSecret();
  if (!secret) return false;

  const parts = token.split(".");
  if (parts.length !== 4) return false;

  const [version, issuedAt, nonce, signature] = parts;
  if (version !== TOKEN_VERSION) return false;
  if (!issuedAt || !nonce || !signature) return false;

  // Reject tokens with invalid base36 timestamp
  if (!/^[0-9a-z]+$/i.test(issuedAt)) return false;
  if (!/^[0-9a-f]+$/i.test(nonce)) return false;
  if (!/^[0-9a-f]+$/i.test(signature)) return false;

  const payload = `${version}.${issuedAt}.${nonce}`;
  const expectedSig = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  const sigBuf = Buffer.from(signature, "hex");
  const expectedBuf = Buffer.from(expectedSig, "hex");

  if (sigBuf.length !== expectedBuf.length) return false;

  return timingSafeEqual(sigBuf, expectedBuf);
}

// ---------------------------------------------------------------------------
// Public API (backward-compatible signatures)
// ---------------------------------------------------------------------------

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}

/** Backward-compat wrapper used by the login route. */
export async function login(password: string): Promise<boolean> {
  return verifyAdminPassword(password);
}

export async function setAuthCookie() {
  const token = createSessionToken();
  if (!token) throw new Error("ADMIN_SESSION_SECRET not configured");

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // No maxAge/expires — session cookie: browser restart clears it
  });
}

export async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

/** Throws if the request is not from an authenticated admin session. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAuthenticated())) {
    throw new Error("UNAUTHORIZED");
  }
}
