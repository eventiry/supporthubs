import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Client details",
  description: "View client details and voucher history.",
};

export default function ClientDetailLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>;
}
