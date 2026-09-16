import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Lock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { TIER_LABELS, TIER_RANK } from "@/lib/niec";
import { FEATURES, TIER_ORDER, nextTier, type Tier } from "@/lib/entitlements";
import { TierBadge } from "@/components/TierBadge";
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

function tierIncludesFeature(t: Tier, minTier: Tier) {
  return (TIER_RANK[t] ?? 0) >= (TIER_RANK[minTier] ?? 0);
}

function UpgradePage() {
  const { profile, user } = useAuth();
  const current = (profile?.membership_tier ?? "observer") as Tier;
  const [selected, setSelected] = useState<Tier>(nextTier(current) ?? current);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [usage, setUsage] = useState<{ cop_count: number; mentorship_this_month: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_tier_usage", { _user_id: user.id }).then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : data;
      if (row) setUsage(row as any);
    });
  }, [user]);

  const submit = async () => {
    if (!selected || selected === current) return toast.error("Pick a higher tier than your current one.");
    setSubmitting(true);
    const { error } = await supabase.rpc("request_tier_upgrade", { _requested: selected, _note: note || undefined });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Upgrade request sent to IIF admins.");
    setNote("");
  };

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Your NIEC membership</h1>
          <p className="text-sm text-muted-foreground">Compare tiers and request an upgrade — an IIF admin will follow up.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Current tier:</span>
          <TierBadge tier={current} />
        </div>
      </div>

      {usage && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <UsageCard label="Communities of Practice joined" value={usage.cop_count} />
          <UsageCard label="Mentorship bookings this month" value={usage.mentorship_this_month} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        {TIER_ORDER.map((t) => {
          const isCurrent = t === current;
          const isSelected = t === selected;
          const rankDiff = (TIER_RANK[t] ?? 0) - (TIER_RANK[current] ?? 0);
          return (
            <button
              type="button"
              key={t}
              onClick={() => rankDiff > 0 && setSelected(t)}
              disabled={rankDiff <= 0}
              className={`text-left rounded-xl border bg-card p-5 transition ${
                isSelected ? "border-primary ring-2 ring-primary/30" : "border-border"
              } ${rankDiff <= 0 ? "opacity-70" : "hover:border-primary/60"}`}
            >
              <div className="flex items-center justify-between">
                <TierBadge tier={t} />
                {isCurrent && <span className="text-[10px] font-semibold uppercase text-primary">Current</span>}
              </div>
              <div className="mt-3 font-display text-lg">{TIER_LABELS[t]}</div>
              <p className="mt-1 text-xs text-muted-foreground">{TIER_BLURB[t]}</p>
            </button>
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
                  <th key={t} className={`px-3 py-3 text-center font-medium ${t === current ? "bg-primary/5" : ""}`}>
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
                    {f.description && <div className="text-xs text-muted-foreground">{f.description}</div>}
                  </td>
                  {TIER_ORDER.map((t) => {
                    const has = tierIncludesFeature(t, f.minTier);
                    const cap = f.caps?.[t];
                    return (
                      <td key={t} className={`px-3 py-3 text-center ${t === current ? "bg-primary/5" : ""}`}>
                        {has ? (
                          cap != null ? (
                            <span className="text-xs font-semibold text-primary">
                              {cap >= 999 ? "Unlimited" : `${cap}${f.capPeriod === "monthly" ? "/mo" : ""}`}
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

      <div className="mt-8 rounded-xl border bg-card p-6">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg">Request an upgrade</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Tell us a bit about why you'd like to upgrade to <strong>{TIER_LABELS[selected]}</strong>. An IIF admin will reach out to discuss next steps.
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="Optional — share context (organisation focus, deal-flow needs, mentorship interest, etc.)"
          className="mt-3 w-full rounded-md border bg-background p-3 text-sm"
        />
        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          {["contributor", "growth_partner", "anchor"].includes(selected) && (
            <Link
              to="/payment"
              search={{ tier: selected, email: profile?.email ?? "", name: profile?.full_name ?? "", reference: "" }}
              className="rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5"
            >
              Pay now with Paystack
            </Link>
          )}
          <button
            onClick={submit}
            disabled={submitting || selected === current}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "Sending…" : `Request ${TIER_LABELS[selected]}`}
          </button>
        </div>
      </div>
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
