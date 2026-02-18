import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AuthBrandPanel } from "@/components/auth-brand-panel";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (session) redirect("/dashboard");
  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col md:flex-row">
      {/* Left: brand panel — tenant logo/name or default (Ordafy) */}
      <AuthBrandPanel />

      {/* Right: form panel — children (login, forgot password, etc.) */}
      <main className="flex flex-1 flex-col items-center justify-center min-h-0 p-4 sm:p-6 md:p-8 lg:p-12 bg-background">
        <div className="w-full max-w-sm md:max-w-md pt-10 md:pt-0">{children}</div>
      </main>

      {/* Footer: "Powered by" on small screens only — at bottom of page */}
      <footer className="flex-shrink-0 md:hidden py-4 text-center text-muted-foreground text-sm bg-background border-t border-border">
        <p>
          Design by{" "}
          <Link href="https://ordafy.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline underline-offset-2">
            Ordafy
          </Link>
        </p>
      </footer>
    </div>
  );
}
