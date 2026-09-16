// Canonical tier entitlements. Single source of truth used across UI.
// DB triggers/policies enforce the same rules; UI is optimistic.
import { TIER_LABELS, TIER_RANK, tierMeets } from "@/lib/niec";

export type Tier = "observer" | "contributor" | "growth_partner" | "anchor" | "strategic_partner";

export type FeatureKey =
  | "community.post"
  | "community.comment"
  | "messages.send"
  | "cops.join"
  | "events.register"
  | "knowledge.download"
  | "mentorship.book"
  | "mentorship.offer"
  | "dealroom.viewFull"
  | "dealroom.submit"
  | "dealroom.interest"
  | "workinggroups.join"
  | "workinggroups.create"
  | "rfcs.comment"
  | "rfcs.propose"
  | "analytics.view"
  | "support.priority";

export interface Feature {
  key: FeatureKey;
  label: string;
  minTier: Tier;
  // Numeric caps (per period). Higher tiers may override with a larger value.
  caps?: Partial<Record<Tier, number>>;
  capPeriod?: "monthly" | "total";
  description?: string;
}

export const FEATURES: Record<FeatureKey, Feature> = {
  "community.post":       { key: "community.post",       label: "Post in the community",        minTier: "contributor", description: "Start discussions, share opportunities and announcements." },
  "community.comment":    { key: "community.comment",    label: "Comment on posts",              minTier: "contributor" },
  "messages.send":        { key: "messages.send",        label: "Direct message members",        minTier: "contributor" },
  "cops.join":            { key: "cops.join",            label: "Join Communities of Practice",  minTier: "contributor",
                            caps: { contributor: 1, growth_partner: 3, anchor: 999, strategic_partner: 999 }, capPeriod: "total",
                            description: "Contributor: 1 CoP · Growth Partner: 3 · Anchor+: unlimited." },
  "events.register":      { key: "events.register",      label: "Register for gated events",     minTier: "observer", description: "Each event has its own minimum tier." },
  "knowledge.download":   { key: "knowledge.download",   label: "Download knowledge resources",  minTier: "observer", description: "Each resource has its own minimum tier." },
  "mentorship.book":      { key: "mentorship.book",      label: "Book mentorship sessions",      minTier: "contributor",
                            caps: { contributor: 1, growth_partner: 3, anchor: 999, strategic_partner: 999 }, capPeriod: "monthly",
                            description: "Contributor: 1/month · Growth Partner: 3/month · Anchor+: unlimited." },
  "mentorship.offer":     { key: "mentorship.offer",     label: "Offer mentorship as a mentor",  minTier: "growth_partner" },
  "dealroom.viewFull":    { key: "dealroom.viewFull",    label: "See full deal details",         minTier: "growth_partner", description: "Below Growth Partner, only anonymised teasers are shown." },
  "dealroom.submit":      { key: "dealroom.submit",      label: "Submit a deal opportunity",     minTier: "growth_partner" },
  "dealroom.interest":    { key: "dealroom.interest",    label: "Express interest in a deal",    minTier: "growth_partner" },
  "workinggroups.join":   { key: "workinggroups.join",   label: "Join working groups",           minTier: "contributor" },
  "workinggroups.create": { key: "workinggroups.create", label: "Create a working group",        minTier: "anchor" },
  "rfcs.comment":         { key: "rfcs.comment",         label: "Comment & react on proposals",  minTier: "contributor" },
  "rfcs.propose":         { key: "rfcs.propose",         label: "Propose a Request for Comment", minTier: "growth_partner" },
  "analytics.view":       { key: "analytics.view",       label: "View community analytics",      minTier: "anchor" },
  "support.priority":     { key: "support.priority",     label: "Priority support & intros",     minTier: "strategic_partner" },
};

export function can(tier: Tier | string | null | undefined, feature: FeatureKey) {
  const f = FEATURES[feature];
  if (!f) return false;
  return tierMeets(tier, f.minTier);
}

export function capFor(tier: Tier | string | null | undefined, feature: FeatureKey): number | null {
  const f = FEATURES[feature];
  const t = (tier ?? "observer") as Tier;
  if (!f?.caps) return null;
  return f.caps[t] ?? 0;
}

export function remaining(
  tier: Tier | string | null | undefined,
  feature: FeatureKey,
  used: number,
): number | null {
  const cap = capFor(tier, feature);
  if (cap === null) return null;
  return Math.max(cap - used, 0);
}

export function requiredTier(feature: FeatureKey): { key: Tier; label: string } {
  const key = FEATURES[feature].minTier;
  return { key, label: TIER_LABELS[key] };
}

export function nextTier(tier: Tier | string | null | undefined): Tier | null {
  const rank = TIER_RANK[tier ?? "observer"] ?? 1;
  const entry = Object.entries(TIER_RANK).find(([, r]) => r === rank + 1);
  return (entry?.[0] as Tier) ?? null;
}

export const TIER_ORDER: Tier[] = ["observer", "contributor", "growth_partner", "anchor", "strategic_partner"];
