"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  let redirectTo = "/dashboard";

  try {
    const requestHeaders = await headers();
    const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
    const ip = forwardedFor || requestHeaders.get("x-real-ip") || "unknown";
    const throttleKey = createHash("sha256").update(`${email}|${ip}`).digest("hex");
    const [user, throttle] = await Promise.all([
      prisma.user.findFirst({ where: { email, active: true } }),
      prisma.loginThrottle.findUnique({ where: { key: throttleKey } })
    ]);

    if (throttle?.blockedUntil && throttle.blockedUntil > new Date()) {
      redirect("/login?error=locked");
    }

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      const failedCount = (throttle?.failedCount ?? 0) + 1;
      const blockedUntil = failedCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await prisma.loginThrottle.upsert({
        where: { key: throttleKey },
        create: { key: throttleKey, failedCount, blockedUntil },
        update: { failedCount, blockedUntil }
      });
      redirect("/login?error=invalid");
    }

    await prisma.loginThrottle.deleteMany({ where: { key: throttleKey } });
    await createSession(user.id, user.sessionVersion);
    redirectTo = user.role === "ADMIN" ? "/admin" : "/dashboard";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("NEXT_REDIRECT")) throw error;
    if (message.includes("database system is starting up")) {
      redirect("/login?error=db-starting");
    }
    redirect("/login?error=db");
  }

  redirect(redirectTo);
}
