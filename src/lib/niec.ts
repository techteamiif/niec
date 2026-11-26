// Shared constants and helpers for NIEC

export const TIER_LABELS: Record<string, string> = {
  observer: "Observer",
  contributor: "Enterprise",
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

export const TIER_STYLE: Record<
  string,
  { bg: string; text: string; border: string; icon: string }
> = {
  observer: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", icon: "○" },
  contributor: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300", icon: "◆" },
  growth_partner: {
    bg: "bg-success/20",
    text: "text-primary",
    border: "border-success/50",
    icon: "★",
  },
  anchor: { bg: "bg-gold/25", text: "text-gold-foreground", border: "border-gold/60", icon: "◇" },
  strategic_partner: {
    bg: "bg-primary",
    text: "text-primary-foreground",
    border: "border-primary",
    icon: "♛",
  },
};

export const COPS = [
  {
    key: "icc",
    name: "ICC - Inclusive Capital Community",
    color: "#E24B99",
    manager: ["Ifeoluwa"],
    mandate:
      "Closing Nigeria's gender financing gap through gender-lens investing and GESI practice. 60+ member network, institutionalising the GESI Roadmap 2025–2035.",
  },
  {
    key: "niric",
    name: "Nigerian Impact Investing Research Industry Collaborative (NIIRIC)",
    color: "#3498DB",
    manager: ["Dr. Kingsley", "Dr. Bassey"],
    subgroups: ["Policy Advocacy", "Research, Data & Measurement"],
    mandate:
      "Generating the research, data and capacity that underpin NIEC and the Nigeria Impact Economy Index, and using that evidence to shape a policy agenda that mainstreams impact investing as an investment strategy in Nigeria.",
  },
  {
    key: "capital-deals",
    name: "Capital & Deal Matchmaking",
    color: "#E67E22",
    manager: ["TBC"],
    mandate:
      "Where capital meets pipeline — home of IIF's Deal Matchmaking programme and the WIIF community.",
  },
  {
    key: "eso-collaborative",
    name: "ESO Collaborative",
    color: "#E74C3C",
    manager: ["Ucha"],
    mandate:
      "Enterprise support organisations building investment-ready MSMEs across Financial Inclusion, Agriculture, Climate and Women's Economic Empowerment.",
  },
] as const;

// Previous CoP slugs redirect to the consolidated workspaces.
export const COP_SLUG_REDIRECTS: Record<string, string> = {
  gender_inclusive: "icc",
  "giis-inclusive-impact": "icc",
  data_measurement: "niric",
  niiric: "niric",
  policy_advocacy: "niric",
  "policy-acii": "niric",
  digital_fintech: "capital-deals",
  creative_economy: "eso-collaborative",
  climate_green: "eso-collaborative",
  "climate-green-finance": "eso-collaborative",
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

export function getKnowledgeResourceAccessCategory(
  minTierRequired: string | null | undefined,
): "free" | "paid-membership" | "paid" {
  if (!minTierRequired || minTierRequired === "observer") return "free";
  if (Object.prototype.hasOwnProperty.call(TIER_RANK, minTierRequired)) return "paid-membership";
  return "paid";
}

export function getKnowledgeResourceAccessLabel(
  minTierRequired: string | null | undefined,
): string {
  const category = getKnowledgeResourceAccessCategory(minTierRequired);
  if (category === "free") return "Free";
  if (category === "paid-membership") return "Paid";
  return "Paid";
}
