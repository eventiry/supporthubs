import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit user",
  description: "Update user role, status, and agency.",
};

export default function EditUserLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>;
}
