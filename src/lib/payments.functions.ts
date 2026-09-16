import { createServerFn } from "@tanstack/react-start";

export type PaidTier = "contributor" | "growth_partner" | "anchor";

/** Server-side source of truth for membership pricing (in kobo). */
const TIER_PRICES: Record<string, { minKobo: number; maxKobo: number; label: string }> = {
  contributor: { minKobo: 100_000_00, maxKobo: 250_000_00, label: "Enterprise" },
  growth_partner: { minKobo: 500_000_00, maxKobo: 500_000_00, label: "Growth Partner" },
  anchor: { minKobo: 1_500_000_00, maxKobo: 1_500_000_00, label: "Anchor Partner" },
};

function secretKey() {
  const key =
    process.env["PAYSTACK_SECRET_KEY"] ??
    process.env["STRIPE_LIVE_API_KEY"] ??
    "";
  if (!key) throw new Error("Payment provider is not configured.");
  return key;
}

export const initMembershipPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; tier: string; amountKobo?: number; fullName?: string; userId?: string; callbackUrl: string }) => {
    if (!input?.email || !/^\S+@\S+\.\S+$/.test(input.email)) throw new Error("A valid email is required.");
    if (!TIER_PRICES[input.tier]) throw new Error("This tier is not payable online.");
    if (!/^https?:\/\//.test(input.callbackUrl)) throw new Error("Invalid callback URL.");
    return input;
  })
  .handler(async ({ data }) => {
    const price = TIER_PRICES[data.tier]!;
    const requested = Math.round(data.amountKobo ?? price.minKobo);
    const amountKobo = Math.min(Math.max(requested, price.minKobo), price.maxKobo);
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
          user_id: data.userId ?? "",
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
    await supabaseAdmin.from("membership_payments").insert({
      user_id: data.userId || null,
      email: data.email,
      full_name: data.fullName ?? null,
      tier: data.tier as never,
      amount_kobo: amountKobo,
      reference,
      status: "pending",
      metadata: { tier_label: price.label },
    } as never);

    return { ok: true as const, authorizationUrl: json.data.authorization_url, reference };
  });

export const verifyMembershipPayment = createServerFn({ method: "POST" })
  .inputValidator((input: { reference: string }) => {
    if (!input?.reference || input.reference.length > 120) throw new Error("Invalid reference.");
    return input;
  })
  .handler(async ({ data }) => {
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("membership_payments")
      .select("id, user_id, tier, amount_kobo")
      .eq("reference", data.reference)
      .maybeSingle();

    await supabaseAdmin
      .from("membership_payments")
      .update({
        status: paid ? "success" : (json.data.status ?? "failed"),
        paid_at: paid ? (json.data.paid_at ?? new Date().toISOString()) : null,
        metadata: { paystack: json.data.metadata ?? {}, amount: json.data.amount, currency: json.data.currency },
      } as never)
      .eq("reference", data.reference);

    if (paid && row?.user_id) {
      await supabaseAdmin
        .from("profiles")
        .update({ membership_tier: row.tier } as never)
        .eq("id", row.user_id);
      await supabaseAdmin.from("notifications").insert({
        recipient_id: row.user_id,
        type: "tier_upgrade" as never,
        title: "Membership payment received",
        message: "Thank you — your NIEC membership payment was confirmed. An IIF admin will complete your onboarding shortly.",
        link: "/dashboard",
      } as never);
    }

    return {
      ok: true as const,
      status: paid ? "success" : (json.data.status ?? "failed"),
      amountKobo: json.data.amount ?? row?.amount_kobo ?? 0,
      tier: row?.tier ?? null,
    };
  });
