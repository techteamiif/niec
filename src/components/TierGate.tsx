import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { can, requiredTier, type FeatureKey } from "@/lib/entitlements";

interface Props {
  feature: FeatureKey;
  children: ReactNode;
  /** If provided, render this in place of children when locked. */
  fallback?: ReactNode;
  /** If true (default), staff bypass the gate. */
  staffBypass?: boolean;
  /** If true, still render children but with a lock overlay. */
  overlay?: boolean;
  className?: string;
}

export function TierGate({ feature, children, fallback, staffBypass = true, overlay, className }: Props) {
  const { profile, isStaff } = useAuth();
  const allowed = (staffBypass && isStaff) || can(profile?.membership_tier, feature);
  if (allowed) return <>{children}</>;
  if (fallback) return <>{fallback}</>;

  const req = requiredTier(feature);
  const cta = (
    <div className={"rounded-lg border border-dashed bg-muted/40 p-4 text-sm " + (className ?? "")}>
      <div className="flex items-start gap-3">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
          <Lock className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium">Requires {req.label} tier</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Upgrade to unlock this feature.
          </div>
        </div>
        <Link
          to="/upgrade"
          className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Upgrade
        </Link>
      </div>
    </div>
  );

  if (overlay) {
    return (
      <div className="relative">
        <div className="pointer-events-none opacity-50 blur-[1px]">{children}</div>
        <div className="absolute inset-0 grid place-items-center">{cta}</div>
      </div>
    );
  }
  return cta;
}
