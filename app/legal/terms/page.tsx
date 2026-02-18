import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of use for the Support Hubs platform.",
};

const APP_NAME = "Support Hubs";
const COMPANY_NAME = "Ordafy";
const COMPANY_URL = "https://ordafy.com";

export default function TermsPage() {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Terms of Service
      </h1>
      <p className="text-muted-foreground text-sm mt-2">
        Last updated: February 2025
      </p>

      <div className="mt-8 space-y-6 text-muted-foreground text-base leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-foreground mt-8">1. Agreement</h2>
          <p>
            By accessing or using {APP_NAME}, you agree to these Terms of Service. {APP_NAME} is operated by{" "}
            <Link href={COMPANY_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {COMPANY_NAME}
            </Link>
            . If you are using the service on behalf of an organisation, you represent that you have authority to bind that organisation.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mt-8">2. Use of the service</h2>
          <p>
            You must use the platform only for lawful purposes and in accordance with these terms. You are responsible for keeping your account credentials secure and for all activity under your account. You must not misuse the service, attempt to gain unauthorised access, or interfere with other users.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mt-8">3. Data and privacy</h2>
          <p>
            Your use of {APP_NAME} is also governed by our{" "}
            <Link href="/legal/privacy" className="text-primary hover:underline">Privacy Policy</Link>. You must ensure that any personal data you enter (e.g. client data) is collected and processed in line with applicable data protection law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mt-8">4. Availability and changes</h2>
          <p>
            We strive to keep the service available but do not guarantee uninterrupted access. We may change or discontinue features with reasonable notice where practicable. We may update these terms; continued use after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mt-8">5. Limitation of liability</h2>
          <p>
            The service is provided &quot;as is&quot;. To the fullest extent permitted by law, we exclude liability for indirect, consequential, or special damages arising from your use of the service. Our total liability shall not exceed the amount paid by you (or your organisation) for the service in the twelve months preceding the claim.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mt-8">6. Contact</h2>
          <p>
            For questions about these terms, please use our{" "}
            <Link href="/contact" className="text-primary hover:underline">contact form</Link>.
          </p>
        </section>
      </div>

      <p className="mt-10 text-muted-foreground text-sm">
        <Link href="/legal/privacy" className="text-primary hover:underline">Privacy Policy</Link>
        {" · "}
        <Link href="/legal/cookies" className="text-primary hover:underline">Cookie Policy</Link>
      </p>
    </article>
  );
}
