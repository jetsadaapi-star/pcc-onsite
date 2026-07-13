import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaPool?: Pool;
  prismaSchemaVersion?: string;
};

const prismaSchemaVersion = "20260710132000_financial_decimals";

function createPool() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL ?? "",
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000
  });

  if (process.env.VERCEL) attachDatabasePool(pool);
  return pool;
}

const pool = globalForPrisma.prismaPool ?? createPool();

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg(pool),
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

globalForPrisma.prisma = prisma;
globalForPrisma.prismaPool = pool;
globalForPrisma.prismaSchemaVersion = prismaSchemaVersion;
