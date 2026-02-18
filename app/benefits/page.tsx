import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { Button } from "@/components/button";

export const metadata: Metadata = {
  title: "Benefits",
  description: "Why choose Support Hubs: multi-tenant platform, voucher management, reporting, compliance, and support for food bank partners.",
};

const BENEFITS = [
  {
    title: "Multi-tenant platform",
    description: "Each organisation gets its own subdomain and isolated data. Your branding, your users, your vouchers—with no overlap with other partners.",
  },
  {
    title: "Voucher management",
    description: "Issue, track, and redeem vouchers in one place. Support multiple agencies and redemption centres with clear audit trails.",
  },
  {
    title: "Reporting & analytics",
    description: "Run reports on usage, redemptions, and trends. Export data for funders and internal review.",
  },
  {
    title: "Compliance & audit",
    description: "Built-in audit logs and secure access controls help you meet governance and data protection requirements.",
  },
  {
    title: "Custom branding",
    description: "Use your logo and colours on the login page and dashboard so your team sees your organisation, not a generic app.",
  },
  {
    title: "Support when you need it",
    description: "Email and priority support options so you can get help quickly when something matters.",
  },
];

export default function BenefitsPage() {
  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-background">
      <PublicNav />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 md:py-16">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Platform benefits
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Why food banks and charities choose Support Hubs to run their voucher schemes.
        </p>

        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          {BENEFITS.map((benefit) => (
            <div key={benefit.title} className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">{benefit.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button asChild size="lg">
            <Link href="/contact">Get in touch</Link>
          </Button>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
