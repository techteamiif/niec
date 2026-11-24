import { createFileRoute } from "@tanstack/react-router";
import { ApplyOnboardingPage } from "./apply";
import { safeReturnPath } from "@/lib/safe-navigation";

export const Route = createFileRoute("/onboarding")({
  validateSearch: (search: Record<string, unknown>) => {
    const next = safeReturnPath(search.next);
    return next ? { next } : {};
  },
  component: OnboardingRoute,
});

function OnboardingRoute() {
  const { next } = Route.useSearch();
  return <ApplyOnboardingPage nextPath={next} />;
}
