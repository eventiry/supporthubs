import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout } from "../components/layout";
import { EMAIL_APP_NAME } from "../config";

export interface InvitationEmailProps {
  organizationName: string;
  subdomainSlug: string;
  joinUrl: string;
  expiresInDays: number;
}

export function InvitationEmail({
  organizationName,
  subdomainSlug,
  joinUrl,
  expiresInDays,
}: InvitationEmailProps) {
  return (
    <EmailLayout preview={`You're invited to join ${organizationName} on ${EMAIL_APP_NAME}`}>
      <Heading style={h1}>You&apos;re invited to join {EMAIL_APP_NAME}</Heading>
      <Text style={text}>
        You have been invited to set up <strong>{organizationName}</strong> on {EMAIL_APP_NAME}.
      </Text>
      <Text style={text}>
        Your organization will use the subdomain: <strong>{subdomainSlug}</strong>
      </Text>
      <Text style={text}>
        Click the button below to create your account and complete the setup. This link will expire in {expiresInDays} days.
      </Text>
      <Button href={joinUrl}>Accept invitation & set up organization</Button>
      <Text style={text}>
        If you didn&apos;t expect this invitation, you can safely ignore this email.
      </Text>
      <Text style={signature}>
        Best regards,
        <br />
        The {EMAIL_APP_NAME} team
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
