import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout } from "../components/layout";
import { EMAIL_APP_NAME } from "../config";

const RESET_LINK_TTL_HOURS = 1;

export interface PasswordResetEmailProps {
  firstName: string;
  resetUrl: string;
  /** When user belongs to an org, pass for org-scoped branding; otherwise platform branding is used. */
  organizationName?: string | null;
  /** Organization logo URL when org-scoped. */
  logoUrl?: string | null;
}

export function PasswordResetEmail({
  firstName,
  resetUrl,
  organizationName,
  logoUrl,
}: PasswordResetEmailProps) {
  return (
    <EmailLayout
      preview={`Reset your ${EMAIL_APP_NAME} password`}
      organizationName={organizationName}
      logoUrl={logoUrl}
    >
      <Heading style={h1}>Password reset</Heading>
      <Text style={text}>Hi {firstName},</Text>
      <Text style={text}>
        We received a request to reset your password. Click the button below to
        set a new password:
      </Text>
      <Button href={resetUrl}>Reset password</Button>
      <Text style={text}>
        This link will expire in {RESET_LINK_TTL_HOURS} hour{RESET_LINK_TTL_HOURS !== 1 ? "s" : ""} for security
        reasons.
      </Text>
      <Text style={text}>
        If you didn&apos;t request a password reset, you can safely ignore this
        email.
      </Text>
      <Text style={signature}>
        Best regards,
        <br />
        The {organizationName ?? EMAIL_APP_NAME} team
      </Text>
    </EmailLayout>
  );
}

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "40px 0",
  padding: "0",
  textAlign: "center" as const,
};

const signature = {
  color: "#333333",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "32px 0 0",
  fontWeight: "500",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 0",
};
