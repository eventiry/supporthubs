import { Section, Text, Img } from "@react-email/components";
import { EMAIL_APP_NAME, EMAIL_LOGO_URL, EMAIL_BRAND_COLOR } from "../config";

export function EmailHeader() {
  return (
    <Section style={{ ...header, backgroundColor: EMAIL_BRAND_COLOR }}>
      {EMAIL_LOGO_URL ? (
        <Img
          src={EMAIL_LOGO_URL}
          alt={EMAIL_APP_NAME}
          width={160}
          style={logoImage}
        />
      ) : (
        <Text style={logoText}>{EMAIL_APP_NAME}</Text>
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
