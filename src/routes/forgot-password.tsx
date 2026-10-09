import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PublicHeader } from "@/components/PublicHeader";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) throw error;
      toast.success("Password reset email sent", { description: "Check your inbox." });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Unable to send password reset email.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7FBFA]">
      <PublicHeader />
      <main className="mx-auto max-w-lg px-6 py-10">
        <section className="rounded-2xl border bg-white p-6 shadow-sm md:p-8">
          <h1 className="font-display text-xl text-primary">Forgot your password?</h1>
          <p className="mt-2 text-sm text-black/75">
            Enter the email address associated with your account and we will send you a password
            reset link.
          </p>
          <form onSubmit={sendReset} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="reset-email"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Email *
              </label>
              <input
                id="reset-email"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organisation.org"
                className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <button
              disabled={busy}
              type="submit"
              className="h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send reset link"}
            </button>
          </form>
          <div className="mt-5 text-center text-sm">
            <Link to="/login" className="text-muted-foreground hover:text-primary hover:underline">
              ← Back to sign in
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
