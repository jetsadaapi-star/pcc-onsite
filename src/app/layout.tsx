import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { getAppBranding } from "@/lib/branding";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap"
});

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getAppBranding();

  return {
    title: {
      default: branding.appName,
      template: `%s | ${branding.appName}`
    },
    description: "ระบบเช็คอินหน้างานและคำนวณค่าเดินทาง",
    icons: branding.faviconUrl ? { icon: branding.faviconUrl, shortcut: branding.faviconUrl, apple: branding.faviconUrl } : undefined
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body className={notoSansThai.className}>{children}</body>
    </html>
  );
}
