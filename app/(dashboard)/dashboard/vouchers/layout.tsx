import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vouchers",
  description: "View and manage food bank vouchers.",
};

export default function VouchersLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>;
}
