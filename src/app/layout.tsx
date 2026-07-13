import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { getAppBranding } from "@/lib/branding";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "600", "700"],
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
    icons: branding.faviconUrl
      ? { icon: branding.faviconUrl, shortcut: branding.faviconUrl, apple: branding.faviconUrl }
      : { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" }
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body className={notoSansThai.className}>{children}</body>
    </html>
  );
}
