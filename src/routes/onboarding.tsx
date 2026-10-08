import { createFileRoute } from "@tanstack/react-router";
import { ApplyOnboardingPage } from "./apply";

export const Route = createFileRoute("/onboarding")({
  component: ApplyOnboardingPage,
});
