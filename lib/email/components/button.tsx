import type { ReactNode } from "react";
import { Button as EmailButton } from "@react-email/components";
import { EMAIL_BRAND_COLOR } from "../config";

interface ButtonProps {
  href: string;
  children: ReactNode;
}

export function Button({ href, children }: ButtonProps) {
  return (
    <EmailButton href={href} style={button}>
      {children}
    </EmailButton>
  );
}

const button = {
  backgroundColor: EMAIL_BRAND_COLOR,
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "14px 28px",
  margin: "24px 0",
};
