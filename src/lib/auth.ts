import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const cookieName = "direct_session";
const sessionDays = 7;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production" && (!value || value.length < 32)) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters in production");
  }
  return value || "local-dev-change-me";
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function verifySignature(value: string, signature: string) {
  const expected = sign(value);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, sessionVersion: number) {
  const expiresAt = Date.now() + sessionDays * 24 * 60 * 60 * 1000;
  const body = `${userId}.${sessionVersion}.${expiresAt}`;
  const token = `${body}.${sign(body)}`;
  const store = await cookies();

  store.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(expiresAt),
    path: "/"
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(cookieName);
}

export async function getSessionUserId() {
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [userId, sessionVersionRaw, expiresAtRaw, signature] = parts;
  const sessionVersion = Number(sessionVersionRaw);
  const expiresAt = Number(expiresAtRaw);
  if (!userId || !Number.isInteger(sessionVersion) || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
  if (!verifySignature(`${userId}.${sessionVersionRaw}.${expiresAtRaw}`, signature)) return null;

  return { userId, sessionVersion };
}

export async function getCurrentUser() {
  const session = await getSessionUserId();
  if (!session) return null;

  return prisma.user.findFirst({
    where: { id: session.userId, active: true, sessionVersion: session.sessionVersion },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      department: true,
      phone: true,
      profilePhotoUrl: true
    }
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
