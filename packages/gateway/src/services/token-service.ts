import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { refreshTokens } from "../db/schema.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_DAYS = 30;

export interface AccessTokenPayload {
  userId: string;
  email: string;
  orgId: string;
  role: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AccessTokenPayload;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createRefreshToken(userId: string): Promise<string> {
  const raw = crypto.randomBytes(48).toString("base64url");
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000
  );

  await db.insert(refreshTokens).values({
    userId,
    tokenHash: hashToken(raw),
    expiresAt,
  });

  return raw;
}

export async function rotateRefreshToken(
  oldRaw: string,
  userId: string
): Promise<string | null> {
  const oldHash = hashToken(oldRaw);

  const [existing] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, oldHash),
        eq(refreshTokens.userId, userId),
        isNull(refreshTokens.revokedAt)
      )
    )
    .limit(1);

  if (!existing || existing.expiresAt < new Date()) {
    return null;
  }

  // Revoke old token
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, existing.id));

  // Issue new token
  return createRefreshToken(userId);
}

export async function revokeRefreshToken(raw: string): Promise<void> {
  const tokenHash = hashToken(raw);
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.tokenHash, tokenHash));
}
