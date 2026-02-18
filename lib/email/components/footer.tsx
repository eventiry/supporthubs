import { Hr, Link, Section, Text, Img } from "@react-email/components";
import {
  EMAIL_APP_NAME,
  EMAIL_SUPPORT_EMAIL,
  EMAIL_COMPANY_NAME,
  EMAIL_COMPANY_URL,
  EMAIL_APP_URL,
  EMAIL_PRIVACY_URL,
  EMAIL_LOGO_URL,
  EMAIL_BRAND_COLOR,
} from "../config";

export function EmailFooter() {
  const currentYear = new Date().getFullYear();
  const appUrl = EMAIL_APP_URL.replace(/\/$/, "");

  return (
    <>
      <Hr style={hr} />
      <Section style={footer}>
        {/* Brand block */}
        <Section style={brandBlock}>
          {EMAIL_LOGO_URL ? (
            <Img
              src={EMAIL_LOGO_URL}
              alt={EMAIL_APP_NAME}
              width={120}
              style={footerLogo}
            />
          ) : null}
          <Text style={footerBrandText}>{EMAIL_APP_NAME}</Text>
          <Text style={tagline}>
            Voucher and client management for food bank partners.
          </Text>
        </Section>

        {/* Links: Product */}
        <Text style={linksHeading}>Product</Text>
        <Text style={linksLine}>
          <Link href={appUrl} style={link}>Home</Link>
          {" · "}
          <Link href={`${appUrl}/pricing`} style={link}>Pricing</Link>
          {" · "}
          <Link href={`${appUrl}/contact`} style={link}>Contact</Link>
        </Text>

        {/* Links: Support */}
        <Text style={linksHeading}>Support</Text>
        <Text style={linksLine}>
          <Link href={`mailto:${EMAIL_SUPPORT_EMAIL}`} style={link}>Contact support</Link>
          {" · "}
          <Link href={EMAIL_COMPANY_URL} style={link}>{EMAIL_COMPANY_NAME}</Link>
          {EMAIL_PRIVACY_URL ? (
            <>
              {" · "}
              <Link href={EMAIL_PRIVACY_URL} style={link}>Privacy policy</Link>
            </>
          ) : null}
        </Text>

        <Hr style={hrThin} />

        {/* Bottom */}
        <Text style={poweredBy}>
          Powered by{" "}
          <Link href={EMAIL_COMPANY_URL} style={link}>
            {EMAIL_COMPANY_NAME}
          </Link>
        </Text>
        <Text style={copyright}>
          © {currentYear} {EMAIL_APP_NAME}. All rights reserved.
        </Text>
      </Section>
    </>
  );
}

const hr = {
  borderColor: "#e2e8f0",
  margin: "28px 0 0",
};

const hrThin = {
  borderColor: "#e2e8f0",
  margin: "20px 0",
};

const footer = {
  padding: "32px 40px 28px",
  backgroundColor: "#f8fafc",
};

const brandBlock = {
  marginBottom: "20px",
};

const footerLogo = {
  display: "block",
  margin: "0 0 8px 0",
  height: "32px",
  width: "auto",
  maxWidth: "120px",
  objectFit: "contain" as const,
};

const footerBrandText = {
  color: "#0f172a",
  fontSize: "16px",
  fontWeight: "bold",
  margin: "0 0 4px 0",
};

const tagline = {
  color: "#64748b",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0",
};

const linksHeading = {
  color: "#0f172a",
  fontSize: "11px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "16px 0 6px 0",
};

const linksLine = {
  color: "#64748b",
  fontSize: "13px",
  lineHeight: "22px",
  margin: "0",
};

const link = {
  color: EMAIL_BRAND_COLOR,
  textDecoration: "none",
};

const poweredBy = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "0 0 4px 0",
  textAlign: "center" as const,
};

const copyright = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "0",
  textAlign: "center" as const,
};
