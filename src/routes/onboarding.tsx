import { createFileRoute } from "@tanstack/react-router";
import { ApplyOnboardingPage } from "./apply";
import { safeInternalPath } from "@/lib/safe-navigation";

export const Route = createFileRoute("/onboarding")({
  validateSearch: (search: Record<string, unknown>) => {
    const next = safeInternalPath(search.next);
    return next ? { next } : {};
  },
  component: OnboardingRoute,
});

function OnboardingRoute() {
  const { next } = Route.useSearch();
  return <ApplyOnboardingPage nextPath={next} />;
}
