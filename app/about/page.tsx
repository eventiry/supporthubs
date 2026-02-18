import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { Button } from "@/components/button";

export const metadata: Metadata = {
  title: "About us",
  description: "Support Hubs is run by Ordafy. We help food banks and charities manage vouchers and support their communities.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-background">
      <PublicNav />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 md:py-16">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          About us
        </h1>

        <div className="mt-8 space-y-6 text-muted-foreground">
          <p className="text-base leading-relaxed">
            <strong className="text-foreground">Support Hubs</strong> is a voucher and client management platform built for food banks, charities, and community organisations. We help you issue vouchers, track redemptions, manage clients and agencies, and run reports—so you can focus on supporting people in need.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-10">Who runs the platform</h2>
          <p className="text-base leading-relaxed">
            Support Hubs is run by{" "}
            <Link
              href="https://ordafy.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline underline-offset-2"
            >
              Ordafy
            </Link>
            , a company that builds software for social good. We work with food banks, local authorities, and third-sector organisations to streamline operations and improve outcomes for the communities they serve.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-10">Who it&apos;s for</h2>
          <p className="text-base leading-relaxed">
            The platform is designed for organisations that run or support food bank voucher schemes: food banks, referral agencies, redemption centres, and local partnerships. Whether you&apos;re a small team or a large network, you get your own branded instance with secure access for your staff and partners.
          </p>

          <p className="text-base leading-relaxed pt-4">
            If you&apos;d like to learn more or get started, we&apos;d love to hear from you.
          </p>
        </div>

        <div className="mt-10">
          <Button asChild>
            <Link href="/contact">Contact us</Link>
          </Button>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
