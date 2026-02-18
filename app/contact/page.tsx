"use client";

import { useState } from "react";
import Link from "next/link";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [message, setMessage] = useState("");
  const [wantToUse, setWantToUse] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      await api.contact.submit({
        name: name.trim(),
        email: email.trim(),
        organizationName: organizationName.trim(),
        message: message.trim(),
        wantToUse,
      });
      setSuccess(true);
      setName("");
      setEmail("");
      setOrganizationName("");
      setMessage("");
      setWantToUse(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-background">
      <PublicNav />
      <main className="flex-1 mx-auto w-full max-w-xl px-4 py-12 sm:px-6 md:py-16">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Contact us
        </h1>
        <p className="mt-3 text-muted-foreground">
          Have a question or want to get started? Send us a message and we&apos;ll get back to you.
        </p>

        {success ? (
          <div className="mt-8 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 p-6 text-center">
            <p className="font-medium text-green-800 dark:text-green-200">
              Thank you. We&apos;ve received your message and will be in touch soon.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Your name</Label>
              <Input
                id="contact-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.org"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-org">Organization name</Label>
              <Input
                id="contact-org"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Your food bank or charity"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-message">Message</Label>
              <textarea
                id="contact-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help?"
                required
                disabled={loading}
                rows={4}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="contact-want"
                checked={wantToUse}
                onChange={(e) => setWantToUse(e.target.checked)}
                disabled={loading}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="contact-want" className="font-normal text-muted-foreground cursor-pointer">
                I&apos;m interested in using Support Hubs for my organisation
              </Label>
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Sending…" : "Send message"}
            </Button>
          </form>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
