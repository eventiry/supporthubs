import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Food Bank Centers",
  description: "Manage food bank centers. Create and manage centers before assigning them to vouchers.",
};

export default function CentersLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>;
}
