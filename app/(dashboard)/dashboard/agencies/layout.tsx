import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agencies",
  description: "Manage referral agencies. Create agencies before assigning third-party users.",
};

export default function AgenciesLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>;
}
