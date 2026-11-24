import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function sendGuestResourcePurchaseConfirmationEmail({
  email,
  resourceType,
  resourceId,
  amountKobo,
  reference,
  origin,
}: {
  email: string;
  resourceType: string;
  resourceId: string;
  amountKobo: number;
  reference: string;
  origin: string;
}) {
  if (resourceType !== "knowledge") return "not_applicable" as const;
  const { data: resource, error } = await supabaseAdmin
    .from("knowledge_resources")
    .select("title")
    .eq("id", resourceId)
    .maybeSingle();
  if (error) throw new Error(`Could not load purchased resource for email: ${error.message}`);
  if (!resource) throw new Error("Could not find the purchased resource for email.");

  const resourceUrl = new URL(`/knowledge/${encodeURIComponent(resourceId)}`, origin);
  resourceUrl.searchParams.set("purchaseReference", reference);
  const accountUrl = new URL("/apply", origin);
  accountUrl.searchParams.set("email", email);
  const amountLabel = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amountKobo / 100);

  const result = await sendTemplateEmail("resource-purchase", email, {
    templateData: {
      resourceTitle: resource.title,
      amountLabel,
      resourceUrl: resourceUrl.toString(),
      accountUrl: accountUrl.toString(),
    },
    idempotencyKey: `resource-purchase-confirmation:${reference}`,
  });
  return result.sent ? ("sent" as const) : ("suppressed" as const);
}
