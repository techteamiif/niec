import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

function verifySignature(rawBody: string, signature: string | null) {
  const secret = process.env["PAYSTACK_SECRET_KEY"];
  if (!secret || !signature) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

type PaystackEvent = {
  event: string;
  data: {
    reference?: string;
    status?: string;
    amount?: number;
    currency?: string;
    paid_at?: string;
    metadata?: Record<string, unknown>;
  };
};

export const Route = createFileRoute("/api/paystack-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Read the raw body: the signature is computed over the exact bytes
        const rawBody = await request.text();

        if (!verifySignature(rawBody, request.headers.get("x-paystack-signature"))) {
          return new Response("Invalid signature", { status: 401 });
        }

        let evt: PaystackEvent;
        try {
          evt = JSON.parse(rawBody);
        } catch {
          return new Response("Bad payload", { status: 400 });
        }

        const reference = evt.data?.reference;
        if (!reference) return new Response("ok", { status: 200 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: row } = await supabaseAdmin
          .from("membership_payments")
          .select("id, user_id, tier, amount_kobo, status")
          .eq("reference", reference)
          .maybeSingle();

        // Unknown reference: acknowledge so Paystack stops retrying
        if (!row) return new Response("ok", { status: 200 });

        if (evt.event === "charge.success") {
          // Already processed (by the verify call or an earlier webhook delivery)
          if (row.status === "success") return new Response("ok", { status: 200 });

          // Never trust the event blindly: amount and currency must match what we initialised
          if (evt.data.amount !== row.amount_kobo || evt.data.currency !== "NGN") {
            console.error("[paystack:webhook] amount mismatch", reference, evt.data.amount, row.amount_kobo);
            await supabaseAdmin
              .from("membership_payments")
              .update({ status: "flagged" } as never)
              .eq("reference", reference);
            return new Response("ok", { status: 200 });
          }

          // Conditional update makes this idempotent under concurrent deliveries
          const { data: updated } = await supabaseAdmin
            .from("membership_payments")
            .update({
              status: "success",
              paid_at: evt.data.paid_at ?? new Date().toISOString(),
              metadata: { paystack: evt.data.metadata ?? {}, amount: evt.data.amount, currency: evt.data.currency },
            } as never)
            .eq("reference", reference)
            .neq("status", "success")
            .select("id");

          if (updated && updated.length > 0 && row.user_id) {
            await supabaseAdmin
              .from("profiles")
              .update({ membership_tier: row.tier } as never)
              .eq("id", row.user_id);
            await supabaseAdmin.from("notifications").insert({
              recipient_id: row.user_id,
              type: "tier_upgrade" as never,
              title: "Membership payment received",
              message: "Thank you, your NIEC membership payment was confirmed. An IIF admin will complete your onboarding shortly.",
              link: "/dashboard",
            } as never);
          }
        } else if (evt.event === "charge.failed" && row.status === "pending") {
          await supabaseAdmin
            .from("membership_payments")
            .update({ status: "failed" } as never)
            .eq("reference", reference);
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});