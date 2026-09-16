// Shared constants and helpers for NIEC

export const TIER_LABELS: Record<string, string> = {
  observer: "Observer",
  contributor: "Contributor",
  growth_partner: "Growth Partner",
  anchor: "Anchor",
  strategic_partner: "Strategic Partner",
};

export const TIER_RANK: Record<string, number> = {
  observer: 1,
  contributor: 2,
  growth_partner: 3,
  anchor: 4,
  strategic_partner: 5,
};

export const TIER_STYLE: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  observer:          { bg: "bg-muted",                    text: "text-muted-foreground", border: "border-border",          icon: "○" },
  contributor:       { bg: "bg-blue-100",                 text: "text-blue-800",         border: "border-blue-300",        icon: "◆" },
  growth_partner:    { bg: "bg-success/20",               text: "text-primary",          border: "border-success/50",      icon: "★" },
  anchor:            { bg: "bg-gold/25",                  text: "text-gold-foreground",  border: "border-gold/60",         icon: "◇" },
  strategic_partner: { bg: "bg-primary",                  text: "text-primary-foreground", border: "border-primary",       icon: "♛" },
};

export const COPS = [
  { key: "giis-inclusive-impact", name: "GIIS — Gender & Inclusive Impact", color: "#E24B99",
    description: "The community of the Gender Impact Investment Summit (GIIS). We convene investors, enterprises and advocates to close Nigeria's gender financing gap — advancing gender-lens investing, GESI practice and inclusive capital." },
  { key: "niiric", name: "NIIRIC — Research, Data & Measurement", color: "#3498DB",
    description: "The digital home of the Nigerian Impact Investing Research and Industry Collaborative. We drive research and data generation, capacity building, policy advocacy and investor network development for Nigeria's impact economy." },
  { key: "policy-acii", name: "Policy, Advocacy & ACII Community", color: "#9B59B6",
    description: "The year-round community of the Annual Convening on Impact Investing (ACII). We shape the policy agenda, coordinate advocacy, and build toward each Convening — including the launch of NIEC at ACII 2026." },
  { key: "capital-deals", name: "Capital & Deal Matchmaking", color: "#E67E22",
    description: "Where capital meets pipeline. Home of IIF's Deal Matchmaking programme and the WIIF (Nigeria Wholesale Impact Investment Fund) community — connecting investors, fund managers and investment-ready enterprises through the Deal Room." },
  { key: "eso-collaborative", name: "ESO Collaborative", color: "#E74C3C",
    description: "The workspace of the Nigeria ESO Collaborative — enterprise support organizations pooling expertise to build investment-ready MSMEs, share tools, set standards and coordinate the ecosystem." },
  { key: "climate-green-finance", name: "Climate & Green Finance", color: "#2ECC71",
    description: "Mobilising green and climate-aligned capital for Nigeria — renewable energy, climate adaptation and green finance instruments across the impact economy." },
] as const;

// Old CoP slugs → new slugs (for redirects from links shared before the rename).
export const COP_SLUG_REDIRECTS: Record<string, string> = {
  gender_inclusive: "giis-inclusive-impact",
  data_measurement: "niiric",
  policy_advocacy: "policy-acii",
  digital_fintech: "capital-deals",
  creative_economy: "eso-collaborative",
  climate_green: "climate-green-finance",
};


export const POST_TYPE_LABELS: Record<string, string> = {
  discussion: "Discussion",
  opportunity: "Opportunity",
  event: "Event",
  knowledge: "Knowledge",
  announcement: "Announcement",
};

export const POST_TYPE_COLOR: Record<string, string> = {
  discussion: "bg-blue-100 text-blue-800",
  opportunity: "bg-gold/25 text-gold-foreground",
  event: "bg-success/20 text-primary",
  knowledge: "bg-purple-100 text-purple-800",
  announcement: "bg-destructive/15 text-destructive",
};

export const ORG_TYPE_LABELS: Record<string, string> = {
  investor: "Investor",
  dfi: "DFI",
  social_enterprise: "Social Enterprise",
  government: "Government",
  foundation: "Foundation",
  accelerator: "Accelerator",
  research: "Research",
  corporate: "Corporate",
  other: "Other",
};

export const EOI_URL = "https://forms.gle/tvgL49B35pgapRYq7";

export function initials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function tierMeets(userTier: string | undefined | null, required: string) {
  return (TIER_RANK[userTier ?? "observer"] ?? 0) >= (TIER_RANK[required] ?? 0);
}
