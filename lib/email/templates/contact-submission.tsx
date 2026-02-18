import { Heading, Text } from "@react-email/components";
import { EmailLayout } from "../components/layout";
import { EMAIL_APP_NAME } from "../config";

export interface ContactSubmissionEmailProps {
  name: string;
  email: string;
  organizationName: string;
  message: string;
  wantToUse: boolean;
}

const text = { fontSize: 16, lineHeight: 1.5, color: "#374151" as const };

export function ContactSubmissionEmail({
  name,
  email,
  organizationName,
  message,
  wantToUse,
}: ContactSubmissionEmailProps) {
  return (
    <EmailLayout preview={`New contact form submission from ${name}`}>
      <Heading style={{ fontSize: 22, fontWeight: "bold", color: "#111827" }}>
        New contact form submission
      </Heading>
      <Text style={text}>
        A message was submitted via the {EMAIL_APP_NAME} public contact form.
      </Text>
      <Text style={text}>
        <strong>Name:</strong> {name}
        <br />
        <strong>Email:</strong> {email}
        <br />
        <strong>Organization:</strong> {organizationName}
        {wantToUse && (
          <>
            <br />
            <strong>Interested in using Support Hubs:</strong> Yes
          </>
        )}
      </Text>
      <Text style={text}>
        <strong>Message:</strong>
        <br />
        {message}
      </Text>
      <Text style={{ ...text, marginTop: 16 }}>
        Reply to {email} to respond.
      </Text>
    </EmailLayout>
  );
}
