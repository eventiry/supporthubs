import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How Support Hubs uses cookies and similar technologies.",
};

const APP_NAME = "Support Hubs";

export default function CookiesPage() {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Cookie Policy
      </h1>
      <p className="text-muted-foreground text-sm mt-2">
        Last updated: February 2025
      </p>

      <div className="mt-8 space-y-6 text-muted-foreground text-base leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-foreground mt-8">1. What are cookies</h2>
          <p>
            Cookies are small text files stored on your device when you visit a website. They are widely used to make sites work, remember preferences, and understand how visitors use the site.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mt-8">2. How we use cookies</h2>
          <p>
            {APP_NAME} uses cookies that are strictly necessary for the platform to function. For example, we use a session cookie to keep you signed in after you log in. This cookie is essential and cannot be disabled if you want to use the service. We do not use third-party advertising or tracking cookies on the core platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mt-8">3. Session cookie</h2>
          <p>
            Our session cookie stores a secure token that identifies your logged-in session. It is HttpOnly (not accessible to JavaScript), is sent only over HTTPS in production, and expires after a set period of inactivity. Clearing cookies will log you out.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mt-8">4. Your choices</h2>
          <p>
            You can control or delete cookies via your browser settings. Disabling or removing the session cookie will prevent you from staying signed in to {APP_NAME}. For more on how we handle personal data, see our{" "}
            <Link href="/legal/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
          </p>
        </section>
      </div>

      <p className="mt-10 text-muted-foreground text-sm">
        <Link href="/legal/privacy" className="text-primary hover:underline">Privacy Policy</Link>
        {" · "}
        <Link href="/legal/terms" className="text-primary hover:underline">Terms of Service</Link>
      </p>
    </article>
  );
}
