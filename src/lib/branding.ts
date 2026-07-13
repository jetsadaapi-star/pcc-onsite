import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";

export type AppBranding = {
  appName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
};

export const defaultBranding: AppBranding = {
  appName: "PCC OnSite",
  logoUrl: null,
  faviconUrl: null
};

export const getAppBranding = cache(async function getAppBranding(): Promise<AppBranding> {
  try {
    const setting = await prisma.systemSetting.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { appName: true, logoUrl: true, faviconUrl: true }
    });

    return {
      appName: setting?.appName || defaultBranding.appName,
      logoUrl: setting?.logoUrl ?? null,
      faviconUrl: setting?.faviconUrl ?? null
    };
  } catch {
    return defaultBranding;
  }
});
