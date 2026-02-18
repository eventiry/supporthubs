import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const metadata: Metadata = {
  title: "Legal",
  description: "Privacy policy, terms of service, and cookie policy for Support Hubs.",
};

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-background">
      <PublicNav />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 md:py-16">
        <p className="text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground underline-offset-2 hover:underline">
            ← Home
          </Link>
        </p>
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
