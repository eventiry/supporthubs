import type { Metadata } from "next";
import "./globals.css";
import { BrandingProvider, BrandingGate } from "@/lib/contexts/branding-context";
import { SessionProvider } from "@/lib/contexts/session-context";

const APP_NAME = "Support Hubs";
const APP_DESCRIPTION = "Voucher and client management for food bank partners";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://supporthubs.org"),
  title: { default: APP_NAME, template: `%s | ${APP_NAME}` },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  openGraph: {
    type: "website",
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased overflow-x-hidden">
        <BrandingProvider>
          <SessionProvider>
            <BrandingGate>{children}</BrandingGate>
          </SessionProvider>
        </BrandingProvider>
      </body>
    </html>
  );
}
