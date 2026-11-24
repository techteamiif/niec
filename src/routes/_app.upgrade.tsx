import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { TIER_LABELS, TIER_RANK } from "@/lib/niec";
import { TIER_ORDER, type Tier } from "@/lib/entitlements";
import { TierBadge } from "@/components/TierBadge";
import { TierComparisonTable } from "@/components/TierComparisonTable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/upgrade")({
  component: UpgradePage,
});

const TIER_BLURB: Record<Tier, string> = {
  observer: "Explore the ecosystem and read what's happening.",
  contributor: "Join conversations, one CoP, and start booking mentorship.",
  growth_partner: "Full Deal Room access, propose RFCs, mentor others.",
  anchor: "Shape the agenda — create working groups and see analytics.",
  strategic_partner: "Everything, plus priority support and staff intros.",
};

const TIER_PRICES: Partial<Record<Tier, string>> = {
  contributor: "₦100,000 / yr",
  growth_partner: "₦500,000 / yr",
  anchor: "₦1,500,000 / yr",
  strategic_partner: "Negotiated",
};

function formatTrialEnd(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "long",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}

function UpgradePage() {
  const { profile, refresh } = useAuth();
  const [trialStartingTier, setTrialStartingTier] = useState<Tier | null>(null);
  const current = (profile?.membership_tier ?? "observer") as Tier;
  const applicationSubmitted = Boolean(
    profile &&
    typeof profile.application_data === "object" &&
    profile.application_data !== null &&
    !Array.isArray(profile.application_data) &&
    typeof profile.application_data.submitted_at === "string",
  );
  const trialAvailable = Boolean(
    profile &&
    profile.membership_status === "active" &&
    profile.membership_tier === "observer" &&
    profile.membership_trial_started_at === null &&
    (profile.crm_stage !== "applicant" || applicationSubmitted),
  );
  const trialEnd = profile?.membership_trial_expires_at ?? null;
  const activeTrial = Boolean(
    profile &&
    profile.membership_trial_started_at &&
    trialEnd &&
    profile.membership_trial_expired_at === null &&
    profile.membership_expires_at === null &&
    new Date(trialEnd).getTime() > Date.now(),
  );

  const startTrial = async (tier: Tier) => {
    setTrialStartingTier(tier);
    try {
      const { data: expiresAt, error } = await supabase.rpc("start_membership_trial", {
        _tier: tier,
      });
      if (error) throw error;
      await refresh();
      toast.success(
        `Your free ${TIER_LABELS[tier]} trial ends ${formatTrialEnd(expiresAt)}. No payment or card details were required.`,
      );
    } catch (error) {
      console.error("[membership:trial]", error);
      toast.error(
        error instanceof Error ? error.message : "Could not start the free membership trial.",
      );
    } finally {
      setTrialStartingTier(null);
    }
  };

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Your NIEC membership</h1>
          <p className="text-sm text-muted-foreground">Compare membership tiers and benefits.</p>
        </div>
        <Link
          to="/payments"
          className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
        >
          Payment history
        </Link>
      </div>

      {activeTrial && trialEnd && (
        <p className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
          Your free membership trial is active until <strong>{formatTrialEnd(trialEnd)}</strong>. No
          automatic payment will be taken.
        </p>
      )}

      {/* {usage && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <UsageCard label="Communities of Practice joined" value={usage.cop_count} />
          <UsageCard label="Mentorship bookings this month" value={usage.mentorship_this_month} />
        </div>
      )} */}

      <div className="grid gap-4 lg:grid-cols-5">
        {TIER_ORDER.map((t) => {
          const isCurrent = t === current;
          const rankDiff = (TIER_RANK[t] ?? 0) - (TIER_RANK[current] ?? 0);
          return (
            <article
              key={t}
              className={`flex h-full min-h-50 flex-col rounded-xl border bg-card p-5 transition ${
                isCurrent ? "border-primary ring-1 ring-primary" : "border-border"
              } ${rankDiff < 0 ? "opacity-70" : ""}`}
            >
              <div className="flex-1 text-left">
                <TierBadge tier={t} />
                <div className="mt-3 font-display text-lg">{TIER_LABELS[t]}</div>
                <p className="mt-1 min-h-12 text-xs text-muted-foreground">{TIER_BLURB[t]}</p>
                {t !== "observer" && TIER_PRICES[t] && (
                  <p className="mt-2 text-sm font-semibold text-primary">
                    {trialAvailable ? (
                      <del className="text-muted-foreground">{TIER_PRICES[t]}</del>
                    ) : (
                      TIER_PRICES[t]
                    )}
                  </p>
                )}
                {trialAvailable && t !== "observer" && (
                  <p className="mt-1 text-sm font-semibold text-primary">Free for 3 months</p>
                )}
              </div>
              {isCurrent ? (
                <button
                  type="button"
                  disabled
                  className="mt-auto w-full rounded-full border px-3 py-2 text-xs font-medium text-muted-foreground"
                >
                  Your current plan
                </button>
              ) : rankDiff > 0 ? (
                trialAvailable ? (
                  <button
                    type="button"
                    onClick={() => void startTrial(t)}
                    disabled={trialStartingTier !== null}
                    className="mt-auto w-full rounded-full bg-primary px-3 py-2 text-center text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {trialStartingTier === t ? "Starting trial…" : "Start 3-month free trial"}
                  </button>
                ) : ["contributor", "growth_partner", "anchor"].includes(t) ? (
                  <Link
                    to="/payment"
                    search={{
                      tier: t,
                      email: profile?.email ?? "",
                      name: profile?.full_name ?? "",
                      reference: "",
                    }}
                    className="mt-auto w-full rounded-full bg-primary px-3 py-2 text-center text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    Upgrade
                  </Link>
                ) : (
                  <a
                    href="mailto:support@impactinvestorsfoundation.org"
                    className="mt-auto block w-full rounded-full bg-primary px-3 py-2 text-center text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    Contact IIF
                  </a>
                )
              ) : (
                <div aria-hidden="true" className="mt-auto h-8" />
              )}
            </article>
          );
        })}
      </div>

      <TierComparisonTable currentTier={current} />

      {/* Upgrade request form disabled for now. */}
    </div>
  );
}

function UsageCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl">{value}</div>
    </div>
  );
}
