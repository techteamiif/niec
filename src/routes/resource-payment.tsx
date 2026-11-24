import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, XCircle } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { verifyResourcePayment, type PurchasableResourceType } from "@/lib/payments.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [state, setState] = useState<"checking" | "success" | "pending" | "failed">("checking");
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [purchase, setPurchase] = useState<{
    resourceType: PurchasableResourceType;
    resourceId: string;
    guestEmail: string | null;
    emailDelivery: "sent" | "suppressed" | "failed" | "not_applicable";
  } | null>(null);

  useEffect(() => {
    if (!reference) {
      setState("failed");
      return;
    }
    let active = true;
    const confirmPurchase = async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const result = await verify({ data: { reference } });
        if (!active) return;
        if (result.ok && result.status === "success") {
          setPurchase({
            resourceType: result.resourceType,
            resourceId: result.resourceId,
            guestEmail: result.guestEmail,
            emailDelivery: result.emailDelivery,
          });
          setAccountDialogOpen(Boolean(result.guestEmail));
          setState("success");
          return;
        }
        if (result.status === "failed" || result.status === "abandoned") {
          setState("failed");
          return;
        }
        if (attempt < 2) {
          await new Promise((resolve) => window.setTimeout(resolve, 1500));
        }
      }
      if (active) setState("pending");
    };
    void confirmPurchase().catch((error) => {
      console.error(
        "[resource-payment:verify]",
        error instanceof Error ? error.message : "Unknown verification error",
      );
      if (active) setState("pending");
    });
    return () => {
      active = false;
    };
  }, [reference, verify]);

  const confirmedType = purchase?.resourceType ?? (resourceType as PurchasableResourceType);
  const confirmedId = purchase?.resourceId ?? resourceId;
  const destinations: Record<PurchasableResourceType, { href: string; label: string }> = {
    event: { href: `/event/${encodeURIComponent(confirmedId)}`, label: "Return to event" },
    knowledge: {
      href: `/knowledge/${encodeURIComponent(confirmedId)}${purchase?.guestEmail ? `?purchaseReference=${encodeURIComponent(reference)}` : ""}`,
      label: "Return to resource",
    },
    deal: { href: "/deal-room", label: "Return to Deal Room" },
  };
  const destination =
    destinations[confirmedType] ?? destinations.event;

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
              <h1 className="mt-5 font-display text-2xl text-primary">
                {purchase?.guestEmail ? "Payment successful" : "Access unlocked"}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                {purchase?.guestEmail
                  ? purchase.emailDelivery === "sent"
                    ? `Thank you. Your purchase is confirmed. A link to view the resource details has been sent to ${purchase.guestEmail}. Sign up to download it.`
                    : "Thank you. Your purchase is confirmed. Open the resource below to view its details. Sign up to download it."
                  : "Your purchase is confirmed. Event purchases also register you as attending."}
              </p>
              {purchase?.guestEmail &&
                (purchase.emailDelivery === "failed" || purchase.emailDelivery === "suppressed") && (
                  <p role="alert" className="mt-3 text-sm text-destructive">
                    We could not send the purchase email. You can still view the resource details from this page.
                  </p>
                )}
              <a href={destination.href} className="mt-7 inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
                {destination.label}
              </a>
            </>
          ) : state === "pending" ? (
            <>
              <Loader2 className="mx-auto h-10 w-10 text-amber-600" />
              <h1 className="mt-5 font-display text-2xl">Payment confirmation pending</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                We’re still waiting for the payment provider to confirm this transaction. If you
                were charged, keep reference{" "}
                <code className="rounded bg-muted px-1">{reference}</code> and refresh this page
                shortly.
              </p>
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
      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thank you for your purchase</DialogTitle>
            <DialogDescription>
              Create a free NIEC account using{" "}
              <span className="font-medium text-foreground">{purchase?.guestEmail}</span> to
              download the resource. Your purchase will be linked after you verify your email.
            </DialogDescription>
          </DialogHeader>
          {purchase?.emailDelivery === "failed" || purchase?.emailDelivery === "suppressed" ? (
            <p role="alert" className="text-sm text-destructive">
              We could not send the follow-up email. You can still view the resource details here.
            </p>
          ) : null}
          <DialogFooter className="sm:justify-between">
            <a
              href={destination.href}
              className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium"
            >
              Continue to resource
            </a>
            <ButtonCreateAccount email={purchase?.guestEmail ?? ""} />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ButtonCreateAccount({ email }: { email: string }) {
  return (
    <Link
      to="/apply"
      search={{ email }}
      className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
    >
      Create an account
    </Link>
  );
}