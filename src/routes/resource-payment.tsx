import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, XCircle } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { verifyResourcePayment, type PurchasableResourceType } from "@/lib/payments.functions";

export const Route = createFileRoute("/resource-payment")({
  validateSearch: (search: Record<string, unknown>) => ({
    resourceType: typeof search["resourceType"] === "string" ? search["resourceType"] : "",
    resourceId: typeof search["resourceId"] === "string" ? search["resourceId"] : "",
    reference: typeof search["reference"] === "string" ? search["reference"] : "",
  }),
  component: ResourcePaymentPage,
});

function ResourcePaymentPage() {
  const { resourceType, resourceId, reference } = Route.useSearch();
  const verify = useServerFn(verifyResourcePayment);
  const [state, setState] = useState<"checking" | "success" | "failed">("checking");

  useEffect(() => {
    if (!reference) {
      setState("failed");
      return;
    }
    let active = true;
    void verify({ data: { reference } })
      .then((result) => {
        if (active) setState(result.ok && result.status === "success" ? "success" : "failed");
      })
      .catch(() => {
        if (active) setState("failed");
      });
    return () => {
      active = false;
    };
  }, [reference, verify]);

  const destinations: Record<PurchasableResourceType, { href: string; label: string }> = {
    event: { href: `/event/${encodeURIComponent(resourceId)}`, label: "Return to event" },
    knowledge: { href: `/knowledge/${encodeURIComponent(resourceId)}`, label: "Return to resource" },
    deal: { href: "/deal-room", label: "Return to Deal Room" },
  };
  const destination = destinations[resourceType as PurchasableResourceType] ?? destinations.event;

  return (
    <div className="min-h-screen bg-[#F7FBFA]">
      <PublicHeader />
      <main className="px-6 py-16">
        <div className="mx-auto max-w-lg rounded-2xl border bg-card p-8 text-center">
          {state === "checking" ? (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <h1 className="mt-5 font-display text-2xl">Confirming your purchase…</h1>
            </>
          ) : state === "success" ? (
            <>
              <Check className="mx-auto h-12 w-12 text-primary" />
              <h1 className="mt-5 font-display text-2xl text-primary">Access unlocked</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Your purchase is confirmed. Event purchases also register you as attending.
              </p>
              <a href={destination.href} className="mt-7 inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
                {destination.label}
              </a>
            </>
          ) : (
            <>
              <XCircle className="mx-auto h-12 w-12 text-destructive" />
              <h1 className="mt-5 font-display text-2xl">Purchase not confirmed</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                If you were charged, keep reference <code className="rounded bg-muted px-1">{reference || "missing"}</code> and contact the NIEC team.
              </p>
              <a href={destination.href} className="mt-7 inline-flex rounded-md border px-5 py-2.5 text-sm font-medium">
                {destination.label}
              </a>
            </>
          )}
        </div>
      </main>
    </div>
  );
}