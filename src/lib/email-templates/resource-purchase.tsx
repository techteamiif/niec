import React from "react";
import { Button, Heading, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { EmailLayout, emailButton, emailText } from "./layout";

interface ResourcePurchaseProps {
  resourceTitle: string;
  amountLabel: string;
  resourceUrl: string;
  accountUrl: string;
}

function ResourcePurchaseEmail({
  resourceTitle,
  amountLabel,
  resourceUrl,
  accountUrl,
}: ResourcePurchaseProps) {
  return (
    <EmailLayout
      preview={`Thank you for purchasing ${resourceTitle}`}
      eyebrow="NIEC Connect · Knowledge Hub"
      title="Thank you for your purchase"
      footer="This is a transactional message about your NIEC resource purchase."
    >
      <Text style={emailText}>
        Your payment of <strong>{amountLabel}</strong> for <strong>{resourceTitle}</strong> was
        successful. Use the link below to view the resource details. Sign in or create a free NIEC
        account to download it.
      </Text>
      <Button href={resourceUrl} style={emailButton}>
        View resource details
      </Button>
      <Heading as="h2" style={heading}>
        Create an account to download
      </Heading>
      <Text style={emailText}>
        Create an account with this email address. After you verify your email, your purchase will
        be linked to your profile and you can download the resource.
      </Text>
      <Button href={accountUrl} style={emailButton}>
        Create your account
      </Button>
    </EmailLayout>
  );
}

export const template = {
  component: ResourcePurchaseEmail,
  subject: (data: Record<string, unknown>) =>
    `Thank you for purchasing ${String(data["resourceTitle"] ?? "an NIEC resource")}`,
  displayName: "Resource purchase confirmation",
  previewData: {
    resourceTitle: "Impact investing resource",
    amountLabel: "₦5,000",
    resourceUrl: "https://example.com/knowledge/example?purchaseReference=example",
    accountUrl: "https://example.com/apply?email=buyer%40example.com",
  },
} satisfies TemplateEntry;

const heading = {
  color: "#0B4F3A",
  fontSize: "16px",
  margin: "24px 0 0",
};
