import type { Json } from "@/integrations/supabase/types";

export interface OnboardingData {
  account_type?: "individual" | "organisation";
  requested_tier?: string;
  aum_range?: string;
  investment_stage?: string;
  goals?: string[];
  contributions?: string[];
  events_interested?: string[];
  event_role?: string;
  heard_from?: string;
  comm_preference?: string;
  statement_of_intent?: string;
}

export function readOnboardingData(value: Json): OnboardingData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const data = value as Record<string, Json | undefined>;
  const stringValue = (key: string) => {
    const item = data[key];
    return typeof item === "string" ? item : undefined;
  };
  const stringArray = (key: string) => {
    const item = data[key];
    return Array.isArray(item)
      ? item.filter((entry): entry is string => typeof entry === "string")
      : undefined;
  };

  return {
    account_type:
      stringValue("account_type") === "individual"
        ? "individual"
        : stringValue("account_type") === "organisation"
          ? "organisation"
          : undefined,
    requested_tier: stringValue("requested_tier"),
    aum_range: stringValue("aum_range"),
    investment_stage: stringValue("investment_stage"),
    goals: stringArray("goals"),
    contributions: stringArray("contributions"),
    events_interested: stringArray("events_interested"),
    event_role: stringValue("event_role"),
    heard_from: stringValue("heard_from"),
    comm_preference: stringValue("comm_preference"),
    statement_of_intent: stringValue("statement_of_intent"),
  };
}

export function getAccountType(value: Json | null | undefined): "individual" | "organisation" {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "organisation";
  return (value as Record<string, Json | undefined>).account_type === "individual"
    ? "individual"
    : "organisation";
}
