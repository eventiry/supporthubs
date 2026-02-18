import { Heading, Text } from "@react-email/components";
import { EmailLayout } from "../components/layout";
import { EMAIL_APP_NAME } from "../config";

export interface ContactReplyEmailProps {
  enquirerName: string;
  replyMessage: string;
}

const text = { fontSize: 16, lineHeight: 1.5, color: "#374151" as const };

/**
 * Sent to the enquirer when a platform admin replies to their contact submission.
 */
export function ContactReplyEmail({ enquirerName, replyMessage }: ContactReplyEmailProps) {
  const displayName = enquirerName?.trim() || "there";
  return (
    <EmailLayout preview={`Reply from ${EMAIL_APP_NAME}`}>
      <Heading style={{ fontSize: 22, fontWeight: "bold", color: "#111827" }}>
        Reply to your enquiry
      </Heading>
      <Text style={text}>
        Hi {displayName},
      </Text>
      <Text style={text}>
        Thank you for getting in touch. Here is our reply:
      </Text>
      <Text
        style={{
          ...text,
          marginTop: 16,
          padding: 16,
          backgroundColor: "#f3f4f6",
          borderRadius: 8,
          whiteSpace: "pre-wrap" as const,
        }}
      >
        {replyMessage}
      </Text>
      <Text style={{ ...text, marginTop: 24, color: "#6b7280" }}>
        The {EMAIL_APP_NAME} team
      </Text>
    </EmailLayout>
  );
}
