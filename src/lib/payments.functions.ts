import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { buildMembershipPaymentReceipt, getMembershipExpiryDate } from "@/lib/membership";

export type PaidTier = "contributor" | "growth_partner" | "anchor";

/** Server-side source of truth for membership pricing (in kobo). */
const TIER_PRICES: Record<string, { amountKobo: number; label: string }> = {
  contributor: { amountKobo: 100_000_00, label: "Enterprise" },
  growth_partner: { amountKobo: 500_000_00, label: "Growth Partner" },
  anchor: { amountKobo: 1_500_000_00, label: "Anchor Partner" },
};

function secretKey() {
  const key =
    process.env["PAYSTACK_SECRET_KEY"] ??
    process.env["STRIPE_LIVE_API_KEY"] ??
    "";
  if (!key) {
    console.error("ENV KEYS", Object.keys(process.env));
    throw new Error("Payment provider is not configured.");
  }
  return key;
}

async function getAuthenticatedUserId() {
  const authorization = getRequest().headers.get("authorization");
  if (!authorization) return null;

  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new Error("Invalid authorization header.");

  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Supabase is not configured.");

  const authClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authClient.auth.getClaims(token);
  if (error || !data?.claims?.sub) throw new Error("Could not verify the signed-in account.");

  return data.claims.sub;
}

export const initMembershipPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; tier: string; fullName?: string; callbackUrl: string }) => {
    if (!input?.email || !/^\S+@\S+\.\S+$/.test(input.email)) throw new Error("A valid email is required.");
    if (!TIER_PRICES[input.tier]) throw new Error("This tier is not payable online.");
    if (!/^https?:\/\//.test(input.callbackUrl)) throw new Error("Invalid callback URL.");
    return input;
  })
  .handler(async ({ data }) => {
    const userId = await getAuthenticatedUserId();
    if (!userId) throw new Error("Sign in to your NIEC account before making a membership payment.");
    const price = TIER_PRICES[data.tier]!;
    const amountKobo = price.amountKobo;
    const reference = `niec_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: data.email,
        amount: amountKobo,
        currency: "NGN",
        reference,
        callback_url: data.callbackUrl,
        metadata: {
          tier: data.tier,
          tier_label: price.label,
          full_name: data.fullName ?? "",
          user_id: userId ?? "",
          product: "NIEC membership",
        },
      }),
    });

    const json = (await res.json()) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string; reference?: string };
    };

    if (!res.ok || !json.status || !json.data?.authorization_url) {
      console.error("[paystack:init]", res.status, json.message);
      return { ok: false as const, error: json.message ?? "Could not start the payment." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: insertError } = await supabaseAdmin.from("membership_payments").insert({
      user_id: userId,
      email: data.email,
      full_name: data.fullName ?? null,
      tier: data.tier as never,
      amount_kobo: amountKobo,
      reference,
      status: "pending",
      metadata: { tier_label: price.label },
    } as never);
    if (insertError) throw new Error(`Could not save membership payment: ${insertError.message}`);

    return { ok: true as const, authorizationUrl: json.data.authorization_url, reference };
  });

export const verifyMembershipPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { reference: string }) => {
    if (!input?.reference || input.reference.length > 120) throw new Error("Invalid reference.");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error: paymentLookupError } = await supabaseAdmin
      .from("membership_payments")
      .select("id, user_id, tier, amount_kobo, status, paid_at")
      .eq("reference", data.reference)
      .maybeSingle();

    if (paymentLookupError) throw new Error(`Could not load membership payment: ${paymentLookupError.message}`);
    if (!row) {
      return { ok: false as const, status: "unknown", error: "Payment reference was not found." };
    }

    const ensureReceiptNotification = async (paidAt: string, membershipExpiresAt: string) => {
      if (!row.user_id) return;

      const link = `/payments?reference=${encodeURIComponent(data.reference)}`;
      const { data: existingNotification, error: lookupError } = await supabaseAdmin
        .from("notifications")
        .select("id")
        .eq("recipient_id", row.user_id)
        .eq("title", "NIEC membership payment receipt")
        .eq("link", link)
        .limit(1)
        .maybeSingle();
      if (lookupError) {
        console.error("[paystack:verify] receipt notification lookup failed", lookupError.message);
        return;
      }
      if (existingNotification) return;

      const { error: notificationError } = await supabaseAdmin.from("notifications").insert({
        recipient_id: row.user_id,
        type: "tier_upgrade" as never,
        title: "NIEC membership payment receipt",
        message: buildMembershipPaymentReceipt({
          tier: row.tier,
          amountKobo: row.amount_kobo,
          reference: data.reference,
          paidAt,
          expiresAt: membershipExpiresAt,
        }),
        link,
      } as never);
      if (notificationError) {
        console.error("[paystack:verify] receipt notification insert failed", notificationError.message);
      }
    };

    if (row.status === "success") {
      const paidAt = row.paid_at ?? new Date().toISOString();
      const membershipExpiresAt = getMembershipExpiryDate(paidAt);
      if (row.user_id) {
        const { data: updatedProfile, error: profileUpdateError } = await supabaseAdmin
          .from("profiles")
          .update({
            membership_tier: row.tier,
            membership_status: "active",
            membership_expires_at: membershipExpiresAt,
          } as never)
          .eq("id", row.user_id)
          .select("id")
          .maybeSingle();
        if (profileUpdateError) throw new Error(`Could not update membership tier: ${profileUpdateError.message}`);
        if (!updatedProfile) throw new Error("The payment is confirmed, but the member profile could not be found.");
      }
      await ensureReceiptNotification(paidAt, membershipExpiresAt);

      return {
        ok: true as const,
        status: "success",
        amountKobo: row.amount_kobo,
        tier: row.tier,
        membershipExpiresAt,
      };
    }

    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`,
      { headers: { Authorization: `Bearer ${secretKey()}` } },
    );
    const json = (await res.json()) as {
      status?: boolean;
      message?: string;
      data?: { status?: string; amount?: number; currency?: string; paid_at?: string; metadata?: Record<string, unknown> };
    };

    if (!res.ok || !json.status || !json.data) {
      console.error("[paystack:verify]", res.status, json.message);
      return { ok: false as const, status: "unknown", error: json.message ?? "Could not verify the payment." };
    }

    const paid = json.data.status === "success";

    if (paid && (json.data.amount !== row.amount_kobo || json.data.currency !== "NGN")) {
      console.error("[paystack:verify] amount mismatch", data.reference, json.data.amount, row.amount_kobo);
      return { ok: false as const, status: "unknown", error: "Payment amount could not be verified." };
    }

    const paidAt = row.paid_at ?? json.data.paid_at ?? new Date().toISOString();
    const membershipExpiresAt = paid ? getMembershipExpiryDate(paidAt) : null;
    const paymentUpdate = await supabaseAdmin
      .from("membership_payments")
      .update({
        status: paid ? "success" : (json.data.status ?? "failed"),
        paid_at: paid ? paidAt : null,
        metadata: { paystack: json.data.metadata ?? {}, amount: json.data.amount, currency: json.data.currency },
      } as never)
      .eq("reference", data.reference)
      .neq("status", "success")
      .select("id")
      .maybeSingle();
    const paymentUpdateError = paymentUpdate.error;
    if (paymentUpdateError) throw new Error(`Could not update membership payment: ${paymentUpdateError.message}`);

    if (paid && row.user_id) {
      const { data: updatedProfile, error: profileUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({
          membership_tier: row.tier,
          membership_status: "active",
          membership_expires_at: membershipExpiresAt,
        } as never)
        .eq("id", row.user_id)
        .select("id")
        .maybeSingle();
      if (profileUpdateError) throw new Error(`Could not update membership tier: ${profileUpdateError.message}`);
      if (!updatedProfile) throw new Error("The payment is confirmed, but the member profile could not be found.");
      if (membershipExpiresAt && paymentUpdate.data) {
        await ensureReceiptNotification(paidAt, membershipExpiresAt);
      }
    }

    return {
      ok: true as const,
      status: paid ? "success" : (json.data.status ?? "failed"),
      amountKobo: json.data.amount ?? row.amount_kobo,
      tier: row.tier,
      membershipExpiresAt,
    };
  });
