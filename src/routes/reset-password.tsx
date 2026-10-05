import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PublicHeader } from "@/components/PublicHeader";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase handles the recovery token automatically on load; we just confirm a session exists.
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY" || s) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters.");
    if (password !== confirm) return toast.error("Passwords don't match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated. Redirecting…");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-[#F7FBFA]">
      <PublicHeader />
      <div className="mx-auto max-w-md px-6 py-16">
        <div className="rounded-xl border bg-card p-8">
          <h1 className="font-display text-2xl">Set a new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ready ? "Choose a new password for your NIEC account." : "Verifying recovery link…"}
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">New password</label>
              <div className="relative mt-1.5">
                <input required type={showPassword ? "text" : "password"} minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
                  disabled={!ready}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 pr-10 text-sm outline-none focus:border-primary disabled:opacity-50" />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Confirm password</label>
              <div className="relative mt-1.5">
                <input required type={showConfirm ? "text" : "password"} minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  disabled={!ready}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 pr-10 text-sm outline-none focus:border-primary disabled:opacity-50" />
                <button
                  type="button"
                  onClick={() => setShowConfirm((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button disabled={busy || !ready} className="h-11 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {busy ? "Updating…" : "Update password"}
            </button>
          </form>
          <div className="mt-4 text-center text-sm">
            <Link to="/login" className="text-muted-foreground hover:underline">← Back to sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
