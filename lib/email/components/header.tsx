import { Section, Text, Img } from "@react-email/components";
import { EMAIL_APP_NAME, EMAIL_LOGO_URL, EMAIL_BRAND_COLOR } from "../config";

export interface EmailHeaderProps {
  /** Override logo (e.g. organization logo). If not set, uses EMAIL_LOGO_URL then app name text. */
  logoUrl?: string | null;
  /** When set (e.g. tenant emails), text fallback shows org name. Logo image alt always uses platform name for accessibility. */
  organizationName?: string | null;
}

export function EmailHeader({ logoUrl: logoUrlOverride, organizationName }: EmailHeaderProps = {}) {
  const logoUrl = logoUrlOverride != null && logoUrlOverride !== "" ? logoUrlOverride : EMAIL_LOGO_URL;
  const displayName = organizationName != null && organizationName !== "" ? organizationName : EMAIL_APP_NAME;
  return (
    <Section style={{ ...header, backgroundColor: EMAIL_BRAND_COLOR }}>
      {logoUrl ? (
        <Img
          src={logoUrl}
          alt={EMAIL_APP_NAME}
          width={160}
          style={logoImage}
        />
      ) : (
        <Text style={logoText}>{displayName}</Text>
      )}
    </Section>
  );
}

const header = {
  padding: "28px 24px",
  textAlign: "center" as const,
};

const logoText = {
  color: "#ffffff",
  fontSize: "22px",
  fontWeight: "bold",
  margin: "0",
  letterSpacing: "-0.02em",
};

const logoImage = {
  display: "block",
  margin: "0 auto",
  maxHeight: "48px",
  width: "auto",
  objectFit: "contain" as const,
};
