import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TIER_LABELS } from "@/lib/niec";
import type { Database } from "@/integrations/supabase/types";

type MembershipTier = Database["public"]["Enums"]["membership_tier"];

export function TierAccessDialog({
  open,
  onOpenChange,
  itemType,
  requiredTier,
  currentTier,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: "event" | "resource";
  requiredTier: MembershipTier;
  currentTier: MembershipTier | null | undefined;
}) {
  const requiredLabel = TIER_LABELS[requiredTier] ?? requiredTier;
  const currentLabel = TIER_LABELS[currentTier ?? "observer"] ?? "Observer";
  const itemLabel = itemType === "event" ? "This event" : "This resource";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-1 grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
            <Lock aria-hidden="true" className="h-5 w-5" />
          </div>
          <DialogTitle>Upgrade to access {itemType === "event" ? "this event" : "this resource"}</DialogTitle>
          <DialogDescription>
            {itemLabel} is available to {requiredLabel} members and above. Your current membership is{" "}
            {currentLabel}, so you can’t access it yet. Upgrade your membership to continue.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Button asChild>
            <Link to="/upgrade">View upgrade options</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
