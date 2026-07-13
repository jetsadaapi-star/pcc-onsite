import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const ip = forwardedFor || request.headers.get("x-real-ip") || "unknown";
    const throttleKey = createHash("sha256").update(`${email}|${ip}`).digest("hex");
    const [user, throttle] = await Promise.all([
      prisma.user.findFirst({ where: { email, active: true } }),
      prisma.loginThrottle.findUnique({ where: { key: throttleKey } })
    ]);

    if (throttle?.blockedUntil && throttle.blockedUntil > new Date()) {
      return redirectTo(request, "/login?error=locked");
    }

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      const failedCount = (throttle?.failedCount ?? 0) + 1;
      const blockedUntil = failedCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await prisma.loginThrottle.upsert({
        where: { key: throttleKey },
        create: { key: throttleKey, failedCount, blockedUntil },
        update: { failedCount, blockedUntil }
      });
      return redirectTo(request, "/login?error=invalid");
    }

    await prisma.loginThrottle.deleteMany({ where: { key: throttleKey } });
    await createSession(user.id, user.sessionVersion);

    return redirectTo(request, user.role === "ADMIN" ? "/admin" : "/dashboard");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = message.includes("database system is starting up") ? "db-starting" : "db";
    return redirectTo(request, `/login?error=${code}`);
  }
}
