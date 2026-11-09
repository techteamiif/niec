import { TIER_LABELS } from "@/lib/niec";

export function getMembershipExpiryDate(paidAt: string): string {
  const paymentDate = new Date(paidAt);
  if (Number.isNaN(paymentDate.getTime())) {
    throw new Error("Cannot determine membership expiry from an invalid payment date.");
  }

  const year = paymentDate.getUTCFullYear();
  const expiryYear = paymentDate.getTime() < Date.UTC(year, 10, 1) ? year : year + 1;
  return `${expiryYear}-11-01`;
}

export function formatMembershipExpiryDate(expiryDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${expiryDate}T00:00:00.000Z`));
}

export function buildMembershipPaymentReceipt({
  tier,
  amountKobo,
  reference,
  paidAt,
  expiresAt,
}: {
  tier: string;
  amountKobo: number;
  reference: string;
  paidAt: string;
  expiresAt: string;
}): string {
  const amount = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amountKobo / 100);
  const paymentDate = new Intl.DateTimeFormat("en-NG", {
    dateStyle: "long",
    timeZone: "Africa/Lagos",
  }).format(new Date(paidAt));

  return [
    `We received your ${TIER_LABELS[tier] ?? tier} membership payment.`,
    `Amount: ${amount}`,
    `Payment date: ${paymentDate}`,
    `Reference: ${reference}`,
    `Membership valid through: ${formatMembershipExpiryDate(expiresAt)}.`,
  ].join("\n");
}
