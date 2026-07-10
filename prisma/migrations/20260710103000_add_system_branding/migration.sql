-- CreateTable
CREATE TABLE IF NOT EXISTS "SystemSetting" (
  "id" TEXT NOT NULL,
  "appName" TEXT NOT NULL DEFAULT 'PCC OnSite',
  "logoUrl" TEXT,
  "faviconUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SystemSetting_updatedAt_idx" ON "SystemSetting"("updatedAt");

-- SeedSingleton
INSERT INTO "SystemSetting" ("id", "appName")
VALUES ('system', 'PCC OnSite')
ON CONFLICT ("id") DO UPDATE SET "appName" = EXCLUDED."appName";
