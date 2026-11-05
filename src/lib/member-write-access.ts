import { toast } from "sonner";
import { tierMeets } from "@/lib/niec";

export const ENTERPRISE_WRITE_UPGRADE_MESSAGE =
  "Upgrade to an Enterprise account to carry out this action.";

export function requireEnterpriseForWrite(
  tier: string | null | undefined,
  isStaff: boolean,
) {
  if (isStaff || tierMeets(tier, "contributor")) return true;
  toast.error(ENTERPRISE_WRITE_UPGRADE_MESSAGE);
  return false;
}
