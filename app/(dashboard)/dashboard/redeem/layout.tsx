import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Redeem voucher",
  description: "Search and redeem vouchers at collection.",
};

export default function RedeemLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>;
}
