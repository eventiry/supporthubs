import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { Button } from "@/components/button";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { redirect } from "next/navigation";
import { isPlatformDomainFromHeaders } from "@/lib/tenant";

export const metadata: Metadata = {
  title: "Home",
  description: "Voucher and client management for food bank partners. Sign in to access the dashboard.",
};

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80";
const SUPPORT_IMAGE =
  "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=600&q=80";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }>;
}) {
  const onSingleTenantMode = process.env.NEXT_PUBLIC_SINGLE_TENANT_MODE === "true";
  if (onSingleTenantMode) {
    return redirect("/dashboard");
  }

  const headersList = await headers();
  const params = await searchParams;
  const onPlatformDomain = isPlatformDomainFromHeaders(headersList, params.tenant);
  if (!onPlatformDomain) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-background">
      <PublicNav />
      {/* Hero: image + overlay + content */}
      <section className="relative flex flex-1 flex-col min-h-[70vh] sm:min-h-[75vh]">
        <div className="absolute inset-0">
          <Image
            src={HERO_IMAGE}
            alt="Community food bank support – parcels and volunteers"
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70"
            aria-hidden
          />
        </div>
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12 text-center sm:px-6 md:px-8">
          <div className="w-full max-w-xl">
            <Link
              href="/"
              className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg inline-block"
            >
              <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md sm:text-4xl md:text-5xl">
                Support Hubs
              </h1>
            </Link>
            <p className="mt-4 text-base text-white/95 drop-shadow sm:text-lg md:mt-5 md:text-xl max-w-md mx-auto">
              Voucher and client management for food bank partners.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
              <Button asChild size="lg" className="w-full sm:w-auto shadow-lg">
                <Link href="/login">Log in</Link>
              </Button>
              <Button
                asChild
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto bg-white/95 text-primary hover:bg-white border-0 shadow-lg"
              >
                <Link href="/contact">Contact us</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-white/80 md:hidden">
              <Link href="/pricing" className="underline underline-offset-2 hover:text-white">Pricing</Link>
              {" · "}
              <Link href="/benefits" className="underline underline-offset-2 hover:text-white">Benefits</Link>
              {" · "}
              <Link href="/about" className="underline underline-offset-2 hover:text-white">About</Link>
            </p>
            <p className="mt-2 text-sm text-white/80">
              Dashboard access requires a signed-in account.
            </p>
          </div>
        </div>
      </section>

      {/* Supporting section: image + short copy */}
      <section className="border-t border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 md:px-8 md:py-16">
          <div className="grid gap-8 md:grid-cols-2 md:gap-12 md:items-center">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted shadow-md md:aspect-[3/2]">
              <Image
                src={SUPPORT_IMAGE}
                alt="Community and volunteers at a food bank"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="flex flex-col justify-center">
              <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
                Built for food bank partners
              </h2>
              <p className="mt-3 text-muted-foreground sm:text-base">
                Manage vouchers and clients in one place. Streamline referrals,
                track usage, and work with your team—so you can focus on
                supporting your community.
              </p>
              <div className="mt-6">
                <Button asChild>
                  <Link href="/login">Get started</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
