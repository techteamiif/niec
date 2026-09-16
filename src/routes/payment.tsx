import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, CreditCard, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { initMembershipPayment, verifyMembershipPayment } from "@/lib/payments.functions";

export const Route = createFileRoute("/payment")({
  head: () => ({
    meta: [
      { title: "Complete your NIEC membership payment" },
      { name: "description", content: "Pay your NIEC membership fee securely with Paystack and activate your Nigeria Impact Economy Community membership." },
      { property: "og:title", content: "Complete your NIEC membership payment" },
      { property: "og:description", content: "Secure Paystack checkout for NIEC membership tiers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    tier: typeof search["tier"] === "string" ? (search["tier"] as string) : "",
    email: typeof search["email"] === "string" ? (search["email"] as string) : "",
    name: typeof search["name"] === "string" ? (search["name"] as string) : "",
    reference: typeof search["reference"] === "string" ? (search["reference"] as string) : "",
  }),
  component: PaymentPage,
});

export const PAYABLE_TIERS: Record<string, { label: string; minNaira: number; maxNaira: number; note?: string }> = {
  contributor: { label: "Enterprise", minNaira: 100_000, maxNaira: 250_000, note: "Annual contribution between ₦100,000 and ₦250,000." },
  growth_partner: { label: "Growth Partner", minNaira: 500_000, maxNaira: 500_000 },
  anchor: { label: "Anchor Partner", minNaira: 1_500_000, maxNaira: 1_500_000 },
};

const naira = (n: number) => "₦" + n.toLocaleString("en-NG");

function PaymentPage() {
  const { tier, email, name, reference } = Route.useSearch();
  const navigate = useNavigate();
  const startPayment = useServerFn(initMembershipPayment);
  const verify = useServerFn(verifyMembershipPayment);

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ status: string } | null>(null);
  const [mail, setMail] = useState(email);
  const plan = PAYABLE_TIERS[tier];
  const [amount, setAmount] = useState(plan?.minNaira ?? 0);

  useEffect(() => setMail(email), [email]);
  useEffect(() => {
    if (plan) setAmount(plan.minNaira);
  }, [plan]);

  useEffect(() => {
    if (!reference) return;
    setBusy(true);
    verify({ data: { reference } })
      .then((r) => setResult({ status: r.ok ? r.status : "failed" }))
      .catch(() => setResult({ status: "failed" }))
      .finally(() => setBusy(false));
  }, [reference, verify]);

  const pay = async () => {
    if (!plan) return toast.error("Select a payable membership tier first.");
    if (!mail) return toast.error("Enter the email for your receipt.");
    if (amount < plan.minNaira || amount > plan.maxNaira) {
      return toast.error(`Enter an amount between ${naira(plan.minNaira)} and ${naira(plan.maxNaira)}.`);
    }
    setBusy(true);
    try {
      const res = await startPayment({
        data: {
          email: mail,
          tier,
          amountKobo: amount * 100,
          fullName: name,
          callbackUrl: `${window.location.origin}/payment?tier=${tier}&email=${encodeURIComponent(mail)}&name=${encodeURIComponent(name)}`,
        },
      });
      if (!res.ok) throw new Error(res.error);
      window.location.href = res.authorizationUrl;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start the payment.");
      setBusy(false);
    }
  };

  if (reference) {
    const success = result?.status === "success";
    return (
      <Shell>
        <div className="mx-auto max-w-lg rounded-2xl border bg-card p-8 text-center">
          {busy || !result ? (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <h1 className="mt-5 font-display text-2xl">Confirming your payment…</h1>
            </>
          ) : success ? (
            <>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <h1 className="mt-5 font-display text-2xl text-primary">Payment confirmed</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Thank you. Your NIEC membership payment has been received and your tier has been recorded. An IIF admin will complete your onboarding shortly.
              </p>
              <div className="mt-7 flex justify-center gap-3">
                <Link to="/login" className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Sign in</Link>
                <Link to="/" className="rounded-md border px-5 py-2.5 text-sm hover:bg-muted">Back to home</Link>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive/10">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="mt-5 font-display text-2xl">Payment not completed</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                We couldn't confirm this transaction. If you were charged, contact the IIF team with reference <code className="rounded bg-muted px-1">{reference}</code>.
              </p>
              <button
                onClick={() => navigate({ to: "/payment", search: { tier, email: mail, name, reference: "" } })}
                className="mt-7 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Try again
              </button>
            </>
          )}
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-lg rounded-2xl border bg-card p-8">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl">Membership payment</h1>
            <p className="text-xs text-muted-foreground">Secure checkout powered by Paystack</p>
          </div>
        </div>

        {plan ? (
          <div className="mt-6 rounded-xl border bg-muted/30 p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Selected tier</div>
            <div className="mt-1 font-display text-xl">{plan.label}</div>
            <div className="mt-2 font-display text-3xl text-primary">
              {naira(amount)}<span className="ml-1 text-sm text-muted-foreground">/ year</span>
            </div>
            {plan.maxNaira > plan.minNaira && (
              <label className="mt-4 block text-sm">
                <span className="text-muted-foreground">Choose your annual contribution</span>
                <input
                  type="number"
                  min={plan.minNaira}
                  max={plan.maxNaira}
                  step={5000}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </label>
            )}
            {plan.note && <p className="mt-2 text-xs text-muted-foreground">{plan.note}</p>}
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            <p className="text-sm text-muted-foreground">Choose the tier you're paying for:</p>
            {Object.entries(PAYABLE_TIERS).map(([key, t]) => (
              <button
                key={key}
                onClick={() => navigate({ to: "/payment", search: { tier: key, email: mail, name, reference: "" } })}
                className="flex w-full items-center justify-between rounded-lg border p-4 text-left hover:border-primary/50"
              >
                <span className="font-medium">{t.label}</span>
                <span className="text-sm text-primary">
                  {t.minNaira === t.maxNaira ? naira(t.minNaira) : `${naira(t.minNaira)} – ${naira(t.maxNaira)}`}
                </span>
              </button>
            ))}
            <p className="pt-2 text-xs text-muted-foreground">
              Observer is free and Strategic Partner is negotiated — no online payment needed.
            </p>
          </div>
        )}

        <label className="mt-6 block text-sm">
          <span className="text-muted-foreground">Email for receipt</span>
          <input
            value={mail}
            onChange={(e) => setMail(e.target.value)}
            placeholder="you@organisation.org"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>

        <button
          onClick={pay}
          disabled={busy || !plan}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {busy ? "Redirecting to Paystack…" : plan ? `Pay ${naira(amount)}` : "Select a tier"}
        </button>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          You'll be redirected to Paystack to complete payment. <Link to="/" className="underline">Back to home</Link>
        </p>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7FBFA]">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-display text-lg text-primary">NIEC</Link>
          <Link to="/apply" className="text-sm text-muted-foreground hover:text-primary">Membership</Link>
        </div>
      </div>
      <main className="px-6 py-16">{children}</main>
    </div>
  );
}
