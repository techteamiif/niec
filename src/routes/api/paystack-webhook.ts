import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Json } from "@/integrations/supabase/types";
import { buildMembershipPaymentReceipt, getMembershipExpiryDate } from "@/lib/membership";

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
    metadata?: Json;
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
          .select("id, user_id, tier, amount_kobo, status, paid_at")
          .eq("reference", reference)
          .maybeSingle();

        if (!row) {
          const { data: purchase } = await supabaseAdmin
            .from("resource_purchases")
            .select("id, user_id, resource_type, resource_id, amount_kobo, status, paid_at")
            .eq("reference", reference)
            .maybeSingle();

          if (!purchase) return new Response("ok", { status: 200 });

          if (evt.event === "charge.success") {
            if (evt.data.amount !== purchase.amount_kobo || evt.data.currency !== "NGN") {
              console.error("[paystack:webhook] resource amount mismatch", reference, evt.data.amount, purchase.amount_kobo);
              await supabaseAdmin
                .from("resource_purchases")
                .update({ status: "flagged" })
                .eq("reference", reference)
                .neq("status", "success");
              return new Response("ok", { status: 200 });
            }

            const { error: purchaseUpdateError } = await supabaseAdmin
              .from("resource_purchases")
              .update({
                status: "success",
                paid_at: purchase.paid_at ?? evt.data.paid_at ?? new Date().toISOString(),
                metadata: { paystack: evt.data.metadata ?? {}, amount: evt.data.amount, currency: evt.data.currency },
              })
              .eq("reference", reference)
              .neq("status", "success");
            if (purchaseUpdateError) {
              console.error("[paystack:webhook] resource purchase update failed", reference, purchaseUpdateError.message);
              return new Response("Could not update resource purchase", { status: 500 });
            }

            if (purchase.resource_type === "event") {
              const { error: attendanceError } = await supabaseAdmin.from("event_attendees").upsert(
                { event_id: purchase.resource_id, member_id: purchase.user_id, attending: true },
                { onConflict: "event_id,member_id" },
              );
              if (attendanceError) {
                console.error("[paystack:webhook] event attendance registration failed", reference, attendanceError.message);
                return new Response("Could not register event attendance", { status: 500 });
              }
            }
          } else if (evt.event === "charge.failed" && purchase.status === "pending") {
            await supabaseAdmin
              .from("resource_purchases")
              .update({ status: "failed" })
              .eq("reference", reference);
          }

          return new Response("ok", { status: 200 });
        }

        if (evt.event === "charge.success") {
          // Never trust the event blindly: amount and currency must match what we initialised
          if (evt.data.amount !== row.amount_kobo || evt.data.currency !== "NGN") {
            console.error("[paystack:webhook] amount mismatch", reference, evt.data.amount, row.amount_kobo);
            await supabaseAdmin
              .from("membership_payments")
              .update({ status: "flagged" } as never)
              .eq("reference", reference);
            return new Response("ok", { status: 200 });
          }

          const paidAt = row.paid_at ?? evt.data.paid_at ?? new Date().toISOString();
          const membershipExpiresAt = getMembershipExpiryDate(paidAt);

          // Conditional update makes this idempotent under concurrent deliveries
          const { data: updated, error: paymentUpdateError } = await supabaseAdmin
            .from("membership_payments")
            .update({
              status: "success",
              paid_at: paidAt,
              metadata: { paystack: evt.data.metadata ?? {}, amount: evt.data.amount, currency: evt.data.currency },
            } as never)
            .eq("reference", reference)
            .neq("status", "success")
            .select("id");

          if (paymentUpdateError) {
            console.error("[paystack:webhook] payment update failed", reference, paymentUpdateError.message);
            return new Response("Could not update payment", { status: 500 });
          }

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
            if (profileUpdateError || !updatedProfile) {
              console.error("[paystack:webhook] membership tier update failed", reference, profileUpdateError?.message ?? "Profile not found");
              return new Response("Could not update membership tier", { status: 500 });
            }
            if (updated && updated.length > 0) {
              const { error: notificationError } = await supabaseAdmin.from("notifications").insert({
                recipient_id: row.user_id,
                type: "tier_upgrade" as never,
                title: "NIEC membership payment receipt",
                message: buildMembershipPaymentReceipt({
                  tier: row.tier,
                  amountKobo: row.amount_kobo,
                  reference,
                  paidAt,
                  expiresAt: membershipExpiresAt,
                }),
                link: `/payments?reference=${encodeURIComponent(reference)}`,
              } as never);
              if (notificationError) {
                console.error("[paystack:webhook] notification insert failed", notificationError.message);
              }
            }
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