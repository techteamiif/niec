import { Check, ChevronDown, Lock } from "lucide-react";
import { FEATURES, TIER_ORDER, type Tier } from "@/lib/entitlements";
import { TIER_LABELS, tierMeets } from "@/lib/niec";

export function TierComparisonTable({ currentTier }: { currentTier?: Tier | null }) {
  return (
    <details open className="group mt-8 overflow-hidden rounded-xl border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 bg-muted/40 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground [&::-webkit-details-marker]:hidden">
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 transition-transform group-open:rotate-180"
        />
        What you get
      </summary>
      <div className="overflow-x-auto border-t">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-muted/20 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 font-medium">Feature</th>
              {TIER_ORDER.map((tier) => (
                <th
                  key={tier}
                  className={`px-3 py-3 text-center font-medium ${
                    tier === currentTier ? "bg-primary/5" : ""
                  }`}
                >
                  {TIER_LABELS[tier]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.values(FEATURES).map((feature) => (
              <tr key={feature.key} className="border-b last:border-0">
                <td className="px-5 py-3">
                  <div className="font-medium">{feature.label}</div>
                  {feature.description && (
                    <div className="text-xs text-muted-foreground">{feature.description}</div>
                  )}
                </td>
                {TIER_ORDER.map((tier) => {
                  const included = tierMeets(tier, feature.minTier);
                  const cap = feature.caps?.[tier];
                  return (
                    <td
                      key={tier}
                      className={`px-3 py-3 text-center ${
                        tier === currentTier ? "bg-primary/5" : ""
                      }`}
                    >
                      {included ? (
                        cap != null ? (
                          <span className="text-xs font-semibold text-primary">
                            {cap >= 999
                              ? "Unlimited"
                              : `${cap}${feature.capPeriod === "monthly" ? "/mo" : ""}`}
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
    </details>
  );
}
