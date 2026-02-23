import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  users,
  organizations,
  orgMemberships,
} from "../db/schema.js";
import {
  signAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  verifyAccessToken,
  type AccessTokenPayload,
} from "./token-service.js";
import { slugify } from "../lib/slugify.js";

const SALT_ROUNDS = 12;

interface SignupInput {
  email: string;
  password: string;
  name: string;
  orgName: string;
}

interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string };
  org: { id: string; name: string; slug: string };
}

export async function signup(input: SignupInput): Promise<AuthResult> {
  const { email, password, name, orgName } = input;

  // Check if email already exists
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (existing) {
    throw new Error("Email already registered");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user
  const [user] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      name,
      passwordHash,
    })
    .returning({ id: users.id, email: users.email, name: users.name });

  // Create org
  const slug = slugify(orgName) + "-" + user.id.slice(0, 6);
  const [org] = await db
    .insert(organizations)
    .values({ name: orgName, slug })
    .returning({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
    });

  // Create membership
  await db
    .insert(orgMemberships)
    .values({ userId: user.id, orgId: org.id, role: "owner" });

  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    orgId: org.id,
    role: "owner",
  });

  const refreshToken = await createRefreshToken(user.id);

  return { accessToken, refreshToken, user, org };
}

interface LoginInput {
  email: string;
  password: string;
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const { email, password } = input;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid credentials");
  }

  // Get first org membership
  const [membership] = await db
    .select()
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, user.id))
    .limit(1);

  if (!membership) {
    throw new Error("No organization found");
  }

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, membership.orgId))
    .limit(1);

  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    orgId: org.id,
    role: membership.role,
  });

  const refreshToken = await createRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name },
    org: { id: org.id, name: org.name, slug: org.slug },
  };
}

export async function refresh(
  oldRefreshToken: string,
  oldAccessToken: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  // Decode (don't verify — it may be expired) to get userId
  let payload: AccessTokenPayload;
  try {
    payload = verifyAccessToken(oldAccessToken);
  } catch {
    // Try decoding without verification for expired tokens
    const decoded = JSON.parse(
      Buffer.from(oldAccessToken.split(".")[1], "base64url").toString()
    ) as AccessTokenPayload;
    payload = decoded;
  }

  const newRefresh = await rotateRefreshToken(oldRefreshToken, payload.userId);
  if (!newRefresh) return null;

  // Re-fetch membership to get fresh role
  const [membership] = await db
    .select()
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, payload.userId))
    .limit(1);

  const newAccess = signAccessToken({
    userId: payload.userId,
    email: payload.email,
    orgId: membership?.orgId ?? payload.orgId,
    role: membership?.role ?? payload.role,
  });

  return { accessToken: newAccess, refreshToken: newRefresh };
}

export async function logout(refreshToken: string): Promise<void> {
  await revokeRefreshToken(refreshToken);
}

export async function getMe(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return null;

  const [membership] = await db
    .select()
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, userId))
    .limit(1);

  let org = null;
  if (membership) {
    [org] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        plan: organizations.plan,
      })
      .from(organizations)
      .where(eq(organizations.id, membership.orgId))
      .limit(1);
  }

  return { user, org, role: membership?.role ?? null };
}
