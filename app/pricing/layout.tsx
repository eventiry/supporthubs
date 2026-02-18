import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Tiered plans for food bank partners. Starter, Growth, and Enterprise. Contact us to get started.",
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
