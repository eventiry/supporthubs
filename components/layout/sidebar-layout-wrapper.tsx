"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { SIDEBAR_COLLAPSED_KEY } from "./sidebar";

interface SidebarLayoutWrapperProps {
  children: React.ReactNode;
}

export function SidebarLayoutWrapper({ children }: SidebarLayoutWrapperProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved !== null) {
      try {
        setIsCollapsed(JSON.parse(saved));
      } catch {
        // ignore
      }
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SIDEBAR_COLLAPSED_KEY && e.newValue !== null) {
        try {
          setIsCollapsed(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
    };

    const handleSidebarToggle = () => {
      const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (saved !== null) {
        try {
          setIsCollapsed(JSON.parse(saved));
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("sidebar-toggle", handleSidebarToggle);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("sidebar-toggle", handleSidebarToggle);
    };
  }, []);

  if (!isMounted) {
    return (
      <div className="flex min-h-0 flex-1 flex-col md:ml-64">
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col transition-[margin] duration-300",
        isCollapsed ? "md:ml-16" : "md:ml-64"
      )}
    >
      {children}
    </div>
  );
}
