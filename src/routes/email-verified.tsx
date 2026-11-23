import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/email-verified")({
  component: EmailVerifiedPage,
});

function EmailVerifiedPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F7FBFA]">
      <PublicHeader />
      <main className="mx-auto max-w-xl px-6 py-20 text-center">
        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          {loading ? (
            <>
              <h1 className="font-display text-2xl text-primary">Verifying your email</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Please wait while we confirm your email address.
              </p>
            </>
          ) : user ? (
            <>
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-10 w-10 text-primary" aria-hidden="true" />
              </div>
              <h1 className="mt-6 font-display text-3xl text-primary">Email verified</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Your email address has been confirmed. Continue to complete your profile and application.
              </p>
              <button
                type="button"
                onClick={() => navigate({ to: "/onboarding" })}
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
