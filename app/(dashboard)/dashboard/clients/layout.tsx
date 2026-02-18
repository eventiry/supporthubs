import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clients",
  description: "Manage clients and view voucher history.",
};

export default function ClientsLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>;
}
