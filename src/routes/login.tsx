import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { EOI_URL } from "@/lib/niec";
import { ShieldCheck } from "lucide-react";

function safeNext(v: unknown): string | undefined {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : undefined;
}

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — NIEC Connect | Impact Investors Foundation" },
      { name: "description", content: "Sign in to your NIEC member account to access the community feed, Communities of Practice, events, Deal Room and Knowledge Hub." },
      { property: "og:title", content: "Sign in — NIEC Connect" },
      { property: "og:description", content: "Access the Nigeria Impact Economy Community members' platform." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { next?: string } => ({ next: safeNext(s.next) }),
  component: LoginPage,
});

function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const next = Route.useSearch().next ?? "/dashboard";
  const [mode, setMode] = useState<"signin" | "magic">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);

  const sendReset = async () => {
    if (!email) { toast.error("Enter your email above first."); return; }
    setResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setResetting(false);
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent", { description: "Check your inbox." });
  };

  useEffect(() => {
    if (!loading && user) navigate({ href: next });
  }, [loading, user, navigate, next]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ href: next });
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin + next },
        });
        if (error) throw error;
        toast.success("Magic link sent", { description: "Check your inbox to sign in." });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7FBFA]">
      <header className="sticky top-0 z-30 border-b-[3px] border-gold bg-primary text-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-3">
          <Link to="/" className="grid h-9 w-9 place-items-center rounded-md border-2 border-gold">
            <span className="font-display text-base text-gold">N</span>
          </Link>
          <div className="leading-tight">
            <div className="font-display text-sm">Impact Investors Foundation</div>
            <div className="text-[10px] uppercase tracking-widest text-white/55">Nigeria Impact Economy Community</div>
          </div>
          <span className="ml-auto rounded-full bg-gold px-3 py-1 text-[10px] font-medium text-[#3a2500]">NIEC 2026</span>
        </div>
      </header>

      <section className="bg-primary px-6 py-14 text-center text-white">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-3xl md:text-5xl">
            {mode === "signin" ? <>Welcome back to <span className="text-gold">NIEC</span></> : <>Magic link <span className="text-gold">sign-in</span></>}
          </h1>
          <p className="mt-4 text-white/75">
            Sign in to your member account to access the community feed, Communities of Practice, events, Deal Room and Knowledge Hub.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-lg space-y-6 px-6 py-10">
        <section className="rounded-2xl border bg-white p-6 shadow-sm md:p-8">
          <h2 className="font-display text-xl text-primary">Member sign-in</h2>
          <form onSubmit={handle} className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email *</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organisation.org"
                className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary" />
            </div>
            {mode === "signin" && (
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Password *</label>
                  <button type="button" onClick={sendReset} disabled={resetting} className="text-xs text-primary hover:underline disabled:opacity-60">
                    {resetting ? "Sending…" : "Forgot password?"}
                  </button>
                </div>
                <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary" />
              </div>
            )}
            <button disabled={busy} type="submit"
              className="h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60">
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Send magic link"}
            </button>
          </form>

          <div className="mt-4 text-center text-sm">
            <button onClick={() => setMode(mode === "signin" ? "magic" : "signin")} className="text-muted-foreground hover:text-primary hover:underline">
              {mode === "signin" ? "Use a magic link instead" : "Use password instead"}
            </button>
          </div>

          <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Your account is protected by IIF member security
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="font-display text-lg text-primary">New to NIEC?</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Apply for membership and complete your payment in the same flow.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/apply" className="rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-gold-foreground hover:opacity-90">
              Apply for membership
            </Link>
            <a href={EOI_URL} target="_blank" rel="noopener" className="rounded-md border px-5 py-2.5 text-sm hover:bg-muted">
              Submit an Expression of Interest
            </a>
          </div>
        </section>
      </main>

      <footer className="mt-10 border-t py-8 text-center text-xs text-muted-foreground">
        Nigeria Impact Economy Community · Impact Investors Foundation · <a href="mailto:info@impactinvestorsfoundation.org" className="text-primary hover:underline">info@impactinvestorsfoundation.org</a>
      </footer>
    </div>
  );
}
