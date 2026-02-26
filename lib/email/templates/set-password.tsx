import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout } from "../components/layout";
import { EMAIL_APP_NAME } from "../config";

const LINK_TTL_HOURS = 24;

export interface SetPasswordEmailProps {
  firstName: string;
  setPasswordUrl: string;
  /** Organization that added the user (e.g. "North East Food Bank"). */
  organizationName: string;
  /** Display label for the role (e.g. "Back office", "Admin"). */
  roleLabel: string;
  /** Optional organization logo URL for the email header. */
  logoUrl?: string | null;
}

export function SetPasswordEmail({
  firstName,
  setPasswordUrl,
  organizationName,
  roleLabel,
  logoUrl,
}: SetPasswordEmailProps) {
  return (
    <EmailLayout preview={`Set up your ${EMAIL_APP_NAME} password`} logoUrl={logoUrl} organizationName={organizationName}>
      <Heading style={h1}>Set up your password</Heading>
      <Text style={text}>Hi {firstName},</Text>
      <Text style={text}>
        You&apos;ve been added to <strong>{organizationName}</strong> as a <strong>{roleLabel}</strong>. Click the button below to set your password and sign in:
      </Text>
      <Button href={setPasswordUrl}>Set up password</Button>
      <Text style={text}>
        This link will expire in {LINK_TTL_HOURS} hours for security reasons.
      </Text>
      <Text style={text}>
        If you didn&apos;t expect this email, you can safely ignore it.
      </Text>
      <Text style={signature}>
        Best regards,
        <br />
        The {organizationName} team
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
