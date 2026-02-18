import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Support Hubs collects, uses, and protects your personal data.",
};

const APP_NAME = "Support Hubs";
const COMPANY_NAME = "Ordafy";
const COMPANY_URL = "https://ordafy.com";

export default function PrivacyPage() {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="text-muted-foreground text-sm mt-2">
        Last updated: February 2025
      </p>

      <div className="mt-8 space-y-6 text-muted-foreground text-base leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-foreground mt-8">1. Who we are</h2>
          <p>
            {APP_NAME} is a voucher and client management platform operated by{" "}
            <Link href={COMPANY_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {COMPANY_NAME}
            </Link>
            . This policy describes how we collect, use, and protect personal data when you use {APP_NAME}.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mt-8">2. Data we collect</h2>
          <p>
            We collect information you provide when signing in (e.g. email, name), when using the platform (e.g. client and voucher data entered by your organisation), and when you contact us (e.g. contact form submissions). We also collect technical data such as IP address and session information necessary for security and operation.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mt-8">3. How we use it</h2>
          <p>
            We use your data to operate the service, authenticate users, process vouchers and referrals, send transactional emails (e.g. password reset, invitations), and respond to support and contact requests. We do not sell your personal data to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mt-8">4. Legal basis and retention</h2>
          <p>
            We process data where necessary to perform our contract with you or your organisation, to comply with legal obligations, and where we have a legitimate interest (e.g. security, fraud prevention). We retain data only as long as needed for those purposes or as required by law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mt-8">5. Your rights</h2>
          <p>
            Depending on your location, you may have rights to access, correct, delete, or restrict processing of your data, and to data portability. To exercise these rights or ask questions, contact us via the{" "}
            <Link href="/contact" className="text-primary hover:underline">contact page</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mt-8">6. Changes</h2>
          <p>
            We may update this policy from time to time. The &quot;Last updated&quot; date at the top will be revised when we do. Continued use of the service after changes constitutes acceptance of the updated policy.
          </p>
        </section>
      </div>

      <p className="mt-10 text-muted-foreground text-sm">
        <Link href="/legal/terms" className="text-primary hover:underline">Terms of Service</Link>
        {" · "}
        <Link href="/legal/cookies" className="text-primary hover:underline">Cookie Policy</Link>
      </p>
    </article>
  );
}
