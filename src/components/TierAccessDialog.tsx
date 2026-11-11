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
  accessPriceKobo,
  onPayOnce,
  purchasing = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: "event" | "resource" | "post";
  requiredTier: MembershipTier;
  currentTier: MembershipTier | null | undefined;
  accessPriceKobo?: number | null;
  onPayOnce?: () => void;
  purchasing?: boolean;
}) {
  const requiredLabel = TIER_LABELS[requiredTier] ?? requiredTier;
  const isPost = itemType === "post";
  const hasIndividualPrice = accessPriceKobo != null && accessPriceKobo > 0 && !!onPayOnce;
  const itemLabel = isPost
    ? "Creating community posts"
    : itemType === "event"
      ? "This event"
      : "This resource";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
            <Lock aria-hidden="true" className="h-5 w-5" />
          </div>
          <DialogTitle>
            {isPost
              ? "Upgrade to create a post"
              : `Upgrade to access ${itemType === "event" ? "this event" : "this resource"}`}
          </DialogTitle>
          <DialogDescription>
            {isPost
              ? `${itemLabel} is available to ${requiredLabel} members and above. Upgrade your membership to continue.`
              : hasIndividualPrice
                ? `${itemLabel} is available to ${requiredLabel} members. Upgrade your membership or purchase one-time access below.`
                : `${itemLabel} is available to ${requiredLabel} members. Upgrade your membership to continue.`}
          </DialogDescription>
        </DialogHeader>
        {hasIndividualPrice && (
          <div className="-mt-2 mb-2">
            <p className="text-xs font-medium text-muted-foreground">One-time access</p>
            <p className="font-display text-3xl font-semibold text-foreground">
              ₦{(accessPriceKobo / 100).toLocaleString("en-NG")}
            </p>
          </div>
        )}
        <DialogFooter>
          {hasIndividualPrice ? (
            <>
              <Button asChild variant="outline">
                <Link to="/upgrade">Upgrade</Link>
              </Button>
              <Button type="button" disabled={purchasing} onClick={onPayOnce}>
                {purchasing ? "Opening checkout…" : "Pay once"}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Not now
              </Button>
              <Button asChild>
                <Link to="/upgrade">Upgrade</Link>
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
