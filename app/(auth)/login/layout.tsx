import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Support Hubs to access the dashboard.",
};

export default function LoginLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>;
}
