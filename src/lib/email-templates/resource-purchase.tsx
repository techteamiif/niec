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
        successful. You can use the link below to view and download your resource.
      </Text>
      <Button href={resourceUrl} style={emailButton}>
        View your resource
      </Button>
      <Heading as="h2" style={heading}>
        Keep your purchases together
      </Heading>
      <Text style={emailText}>
        Create a free NIEC account to keep your resource purchases connected to your profile.
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
