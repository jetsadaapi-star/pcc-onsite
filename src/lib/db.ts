import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaVersion?: string;
};

const prismaSchemaVersion = "20260710132000_financial_decimals";

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL ?? ""
    }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });
}

function isCurrentClient(client: PrismaClient | undefined) {
  const current = client as (PrismaClient & Record<string, unknown>) | undefined;
  return Boolean(
    current &&
    "tripSession" in current &&
    "officeLocation" in current &&
    "systemSetting" in current &&
    "anomalyRecord" in current &&
    "notificationLog" in current &&
    "exportDocument" in current &&
    "loginThrottle" in current &&
    globalForPrisma.prismaSchemaVersion === prismaSchemaVersion
  );
}

export const prisma = isCurrentClient(globalForPrisma.prisma)
  ? globalForPrisma.prisma!
  : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaVersion = prismaSchemaVersion;
}
