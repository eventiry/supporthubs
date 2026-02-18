import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New client",
  description: "Add a new client.",
};

export default function NewClientLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>;
}
