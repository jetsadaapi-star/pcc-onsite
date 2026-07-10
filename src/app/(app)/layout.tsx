import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { getAppBranding } from "@/lib/branding";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [user, branding] = await Promise.all([requireUser(), getAppBranding()]);
  return <AppShell user={user} branding={branding}>{children}</AppShell>;
}
