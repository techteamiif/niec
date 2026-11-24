import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { useAuth } from "@/lib/auth";
import { linkGuestResourcePurchases } from "@/lib/payments.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { pathWithNext, safeReturnPath } from "@/lib/safe-navigation";

export const Route = createFileRoute("/email-verified")({
  validateSearch: (search: Record<string, unknown>) => {
    const next = safeReturnPath(search.next);
    return next ? { next } : {};
  },
  component: EmailVerifiedPage,
});

function EmailVerifiedPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const linkPurchases = useServerFn(linkGuestResourcePurchases);

  useEffect(() => {
    if (loading || !user) return;
    let active = true;
    void linkPurchases({ data: {} })
      .then(({ linked }) => {
        if (active && linked > 0) {
          toast.success("Your resource purchase has been linked to your account.");
        }
      })
      .catch((error) => {
        if (!active) return;
        console.error(
          "[email-verified:link-resource-purchases]",
          error instanceof Error ? error.message : "Unknown linking error",
        );
        toast.error("Your account is verified, but a resource purchase could not be linked.");
      });
    return () => {
      active = false;
    };
  }, [linkPurchases, loading, user]);

  return (
    <div className="min-h-screen bg-[#F7FBFA]">
      <PublicHeader />
      <main className="mx-auto max-w-xl px-6 py-20 text-center">
        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          {loading ? (
            <div role="status" aria-live="polite">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" aria-hidden="true" />
              <span className="sr-only">Loading</span>
            </div>
          ) : user ? (
            <>
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-10 w-10 text-primary" aria-hidden="true" />
              </div>
              <h1 className="mt-6 font-display text-3xl text-primary">Email verified successfully</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Your email address verification was successful. Continue to complete your profile and application.
              </p>
              <button
                type="button"
                onClick={() => navigate({ href: pathWithNext("/onboarding", next) })}
                className="mt-8 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Continue
              </button>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl text-primary">Email verification failed</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                We couldn’t verify your email. The link may have expired; return to sign in and request a new one.
              </p>
              <Link
                to="/login"
                search={next ? { next } : {}}
                className="mt-8 inline-flex rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
