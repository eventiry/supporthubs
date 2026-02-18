import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit client",
  description: "Update client details.",
};

export default function EditClientLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>;
}
