import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

/**
 * Platform admin area: only super_admin (platform admin) can access.
 */
export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login?callbackUrl=" + encodeURIComponent("/dashboard/platform/organizations"));
  }
  const isPlatformAdmin = session.role === "super_admin" && session.organizationId == null;
  if (!isPlatformAdmin) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
