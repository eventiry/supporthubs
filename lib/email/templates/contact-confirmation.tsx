import { Heading, Text } from "@react-email/components";
import { EmailLayout } from "../components/layout";
import { EMAIL_APP_NAME } from "../config";

export interface ContactConfirmationEmailProps {
  name: string;
}

const text = { fontSize: 16, lineHeight: 1.5, color: "#374151" as const };

/**
 * Sent to the person who submitted the contact form to confirm we received their enquiry.
 */
export function ContactConfirmationEmail({ name }: ContactConfirmationEmailProps) {
  const displayName = name?.trim() || "there";
  return (
    <EmailLayout preview={`We've received your message – ${EMAIL_APP_NAME}`}>
      <Heading style={{ fontSize: 22, fontWeight: "bold", color: "#111827" }}>
        Thanks for getting in touch
      </Heading>
      <Text style={text}>
        Hi {displayName},
      </Text>
      <Text style={text}>
        We&apos;ve received your message and will get back to you as soon as we can.
      </Text>
      <Text style={{ ...text, marginTop: 16 }}>
        If you have any urgent questions in the meantime, please reply to this email or use the
        contact details on our website.
      </Text>
      <Text style={{ ...text, marginTop: 24, color: "#6b7280" }}>
        The {EMAIL_APP_NAME} team
      </Text>
    </EmailLayout>
  );
}
