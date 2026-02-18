import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Request a password reset link for your Support Hubs account.",
};

export default function ForgotPasswordLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>;
}
