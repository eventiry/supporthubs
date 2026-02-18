"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import type { SessionUser } from "@/lib/types";
import { api } from "@/lib/api";

type SessionContextValue = {
  user: SessionUser | null;
  role: SessionUser["role"] | null;
  isLoading: boolean;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) setIsLoading(false);
    }, 5000);

    api.auth
      .getSession()
      .then((session) => {
        if (!cancelled) {
          setUser(session ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) {
          clearTimeout(timeout);
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  const value: SessionContextValue = {
    user,
    role: user?.role ?? null,
    isLoading,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (ctx == null) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return ctx;
}
