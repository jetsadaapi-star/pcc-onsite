import { createHash } from "node:crypto";
import { createSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

function redirectTo(path: string) {
  return new Response(null, { status: 303, headers: { Location: path } });
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
      return redirectTo("/login?error=locked");
    }

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      const failedCount = (throttle?.failedCount ?? 0) + 1;
      const blockedUntil = failedCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await prisma.loginThrottle.upsert({
        where: { key: throttleKey },
        create: { key: throttleKey, failedCount, blockedUntil },
        update: { failedCount, blockedUntil }
      });
      return redirectTo("/login?error=invalid");
    }

    await Promise.all([
      prisma.loginThrottle.deleteMany({ where: { key: throttleKey } }),
      prisma.loginThrottle.deleteMany({
        where: { updatedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      })
    ]);
    await createSession(user.id, user.sessionVersion);
    await prisma.activityLog.create({
      data: {
        actorId: user.id,
        entityType: "User",
        entityId: user.id,
        action: "LOGIN_SUCCESS"
      }
    }).catch((auditError) => console.error("Failed to record login activity", auditError));

    return redirectTo(user.role === "ADMIN" ? "/admin" : "/dashboard");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = message.includes("database system is starting up") ? "db-starting" : "db";
    return redirectTo(`/login?error=${code}`);
  }
}
