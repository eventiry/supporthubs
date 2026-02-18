import type { Metadata } from "next";
import { protectRoute } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Support Hubs dashboard. Manage vouchers, clients, and users.",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await protectRoute();
  return <DashboardShell>{children}</DashboardShell>;
}