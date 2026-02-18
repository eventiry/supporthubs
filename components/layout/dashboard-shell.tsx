"use client";

import { TenantRedirectGuard } from "@/components/tenant-redirect-guard";
import { SubscriptionGate } from "@/components/subscription-gate";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { SidebarLayoutWrapper } from "./sidebar-layout-wrapper";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <TenantRedirectGuard>
      <div className="flex min-h-screen flex-col bg-muted/30">
        <Sidebar />
        <SidebarLayoutWrapper>
          <Header />
          <main className="min-h-0 flex-1 p-3 sm:p-4 md:p-6 pt-32 md:pt-28">
            <SubscriptionGate>{children}</SubscriptionGate>
          </main>
        </SidebarLayoutWrapper>
      </div>
    </TenantRedirectGuard>
  );
}
