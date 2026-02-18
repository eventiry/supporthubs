import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Voucher details",
  description: "View and print voucher details.",
};

export default function VoucherDetailLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>;
}
