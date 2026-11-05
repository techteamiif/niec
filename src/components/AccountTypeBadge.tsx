import { getAccountType } from "@/lib/profile-onboarding";
import type { Json } from "@/integrations/supabase/types";

export function AccountTypeBadge({ applicationData }: { applicationData?: Json | null }) {
  if (getAccountType(applicationData) === "organisation") return null;

  return (
    <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary">
      Individual account
    </span>
  );
}
