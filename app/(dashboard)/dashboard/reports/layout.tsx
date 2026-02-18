import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reports",
  description: "View voucher and redemption reports.",
};

export default function ReportsLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>;
}
