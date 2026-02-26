import {
  Body,
  Container,
  Head,
  Html,
  Preview,
} from "@react-email/components";
import type { ReactNode } from "react";
import { EmailHeader } from "./header";
import { EmailFooter } from "./footer";

interface EmailLayoutProps {
  preview: string;
  children: ReactNode;
  /** Optional logo URL (e.g. organization logo). When set with organizationName, uses org branding. */
  logoUrl?: string | null;
  /** Optional organization name. When set, header/footer show org name; logo alt stays platform name. Omit for platform-only emails (e.g. forgot-password). */
  organizationName?: string | null;
}

export function EmailLayout({ preview, children, logoUrl, organizationName }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader logoUrl={logoUrl} organizationName={organizationName} />
          <div style={content}>{children}</div>
          <EmailFooter logoUrl={logoUrl} organizationName={organizationName} />
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f1f5f9",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "0",
  marginBottom: "48px",
  maxWidth: "600px",
  borderRadius: "8px",
  overflow: "hidden" as const,
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

const content = {
  padding: "40px 40px 36px",
};
