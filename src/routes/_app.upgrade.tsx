import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { TIER_LABELS, TIER_RANK } from "@/lib/niec";
import { FEATURES, TIER_ORDER, type Tier } from "@/lib/entitlements";
import { TierBadge } from "@/components/TierBadge";

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

function tierIncludesFeature(t: Tier, minTier: Tier) {
  return (TIER_RANK[t] ?? 0) >= (TIER_RANK[minTier] ?? 0);
}

function UpgradePage() {
  const { profile } = useAuth();
  const current = (profile?.membership_tier ?? "observer") as Tier;

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
                ["contributor", "growth_partner", "anchor"].includes(t) ? (
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
                  <button
                    type="button"
                    disabled
                    className="mt-auto w-full cursor-not-allowed rounded-full border px-3 py-2 text-xs font-semibold text-muted-foreground"
                  >
                    Contact IIF to discuss
                  </button>
                )
              ) : (
                <div aria-hidden="true" className="mt-auto h-8" />
              )}
            </article>
          );
        })}
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border bg-card">
        <div className="border-b bg-muted/40 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          What you get
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b bg-muted/20 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Feature</th>
                {TIER_ORDER.map((t) => (
                  <th
                    key={t}
                    className={`px-3 py-3 text-center font-medium ${t === current ? "bg-primary/5" : ""}`}
                  >
                    {TIER_LABELS[t]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.values(FEATURES).map((f) => (
                <tr key={f.key} className="border-b last:border-0">
                  <td className="px-5 py-3">
                    <div className="font-medium">{f.label}</div>
                    {f.description && (
                      <div className="text-xs text-muted-foreground">{f.description}</div>
                    )}
                  </td>
                  {TIER_ORDER.map((t) => {
                    const has = tierIncludesFeature(t, f.minTier);
                    const cap = f.caps?.[t];
                    return (
                      <td
                        key={t}
                        className={`px-3 py-3 text-center ${t === current ? "bg-primary/5" : ""}`}
                      >
                        {has ? (
                          cap != null ? (
                            <span className="text-xs font-semibold text-primary">
                              {cap >= 999
                                ? "Unlimited"
                                : `${cap}${f.capPeriod === "monthly" ? "/mo" : ""}`}
                            </span>
                          ) : (
                            <Check className="mx-auto h-4 w-4 text-primary" />
                          )
                        ) : (
                          <Lock className="mx-auto h-3.5 w-3.5 text-muted-foreground/50" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
