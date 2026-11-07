import crypto from "crypto";
import { cookies } from "next/headers";
import { getOrCreateDefaultWorkspaceId } from "../services/workspace.helper";

const SESSION_COOKIE_NAME = "apiwatch_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SessionPayload {
  userId: string;
  email: string;
  name?: string | null;
  workspaceId: string;
  expiresAt: number;
}

function getSecret(): string {
  return process.env.AUTH_SECRET || "default-fallback-secret-for-apiwatch-dev-only-32bytes!";
}

/**
 * Sign session payload to tamper-proof string: base64Payload.base64Hmac
 */
export function signSession(payload: Omit<SessionPayload, "expiresAt">): string {
  const fullPayload: SessionPayload = {
    ...payload,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };

  const payloadStr = JSON.stringify(fullPayload);
  const payloadBase64 = Buffer.from(payloadStr, "utf8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(payloadBase64)
    .digest("base64url");

  return `${payloadBase64}.${signature}`;
}

/**
 * Verify and parse session token. Returns null if invalid, expired, or tampered.
 */
export function verifySession(token: string): SessionPayload | null {
  if (!token || !token.includes(".")) return null;

  const [payloadBase64, signature] = token.split(".");
  if (!payloadBase64 || !signature) return null;

  const expectedSignature = crypto
    .createHmac("sha256", getSecret())
    .update(payloadBase64)
    .digest("base64url");

  if (signature !== expectedSignature) {
    return null; // Tampered token
  }

  try {
    const payloadStr = Buffer.from(payloadBase64, "base64url").toString("utf8");
    const payload = JSON.parse(payloadStr) as SessionPayload;

    if (Date.now() > payload.expiresAt) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Read current session from cookies in server component or API route handler.
 */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySession(token);
  } catch {
    return null;
  }
}

/**
 * Get current session or default dev session if not logged in.
 */
export async function getSessionOrDefault(): Promise<SessionPayload> {
  const session = await getSession();
  if (session) return session;

  const defaultWorkspaceId = await getOrCreateDefaultWorkspaceId();
  return {
    userId: "default-user-id",
    email: "admin@apiwatch.local",
    name: "Admin User",
    workspaceId: defaultWorkspaceId,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };
}

/**
 * Write session cookie to response.
 */
export async function setSessionCookie(payload: Omit<SessionPayload, "expiresAt">): Promise<void> {
  const token = signSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });
}

/**
 * Clear session cookie on logout.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
