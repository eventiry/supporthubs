import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Issue voucher",
  description: "Create and issue a new food bank voucher.",
};

export default function IssueVoucherLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>;
}
