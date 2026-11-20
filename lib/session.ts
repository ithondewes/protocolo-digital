import { createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { connectDb } from "@/lib/db";
import type { UserRole } from "@/lib/domain";
import { Session } from "@/models/Session";
import { User } from "@/models/User";

export const SESSION_COOKIE = "dp_session";
const SESSION_DAYS = 7;

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  sectorKeys: string[];
};

function sessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    return null;
  }
  return secret;
}

export function hashSessionToken(token: string): string | null {
  const secret = sessionSecret();
  if (!secret) {
    return null;
  }
  return createHmac("sha256", secret).update(token).digest("hex");
}

export function sessionConfigured(): boolean {
  return sessionSecret() !== null;
}

export async function createSession(userId: string): Promise<string | null> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);
  if (!tokenHash) {
    return null;
  }
  await connectDb();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await Session.create({ tokenHash, user: userId, expiresAt });
  return token;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (!token) {
      return null;
    }
    const tokenHash = hashSessionToken(token);
    if (!tokenHash) {
      return null;
    }
    await connectDb();
    const session = await Session.findOne({
      tokenHash,
      expiresAt: { $gt: new Date() },
    }).lean();
    if (!session) {
      return null;
    }
    const user = await User.findById(session.user).lean();
    if (!user) {
      return null;
    }
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      sectorKeys: user.sectorKeys,
    };
  } catch (error) {
    if (isPrerenderBailout(error)) {
      throw error;
    }
    console.error("Session lookup failed", error instanceof Error ? error.name : "Error");
    return null;
  }
}

function isPrerenderBailout(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const digest = (error as Error & { digest?: string }).digest ?? "";
  return digest.includes("DYNAMIC_SERVER_USAGE") || error.message.includes("Dynamic server usage");
}

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) {
    return;
  }
  const tokenHash = hashSessionToken(token);
  if (!tokenHash) {
    return;
  }
  await connectDb();
  await Session.deleteOne({ tokenHash });
}
