import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, CreditCard } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { TIER_LABELS } from "@/lib/niec";

type MembershipPayment = Database["public"]["Tables"]["membership_payments"]["Row"];

export const Route = createFileRoute("/_app/payments")({
  component: PaymentHistoryPage,
});

const ngn = (kobo: number) => {
  const naira = kobo / 100;
  return `₦${naira.toLocaleString("en-NG")}`;
};

function PaymentHistoryPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<MembershipPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    let active = true;
    setLoading(true);
    setLoadError(null);

    const load = async () => {
      const { data, error } = await supabase
        .from("membership_payments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!active) return;
      if (error) {
        console.error("Unable to load payment history", error);
        setLoadError(error.message);
      } else {
        setPayments(data ?? []);
      }
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [user]);

  const successful = payments.filter((payment) => payment.status === "success");
  const totalPaid = successful.reduce((sum, payment) => sum + Number(payment.amount_kobo ?? 0), 0);

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/upgrade"
            className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Membership
          </Link>
          <h1 className="font-display text-3xl">Payment history</h1>
        </div>
        <Link
          to="/upgrade"
          className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
        >
          <CreditCard className="h-4 w-4" /> View membership plans
        </Link>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Stat label="Transactions" value={payments.length} />
        <Stat label="Successful" value={successful.length} />
        <Stat label="Total paid" value={ngn(totalPaid)} emphasize />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b bg-muted/40 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Payment history
        </div>

        {loading ? (
          <div className="p-8 text-sm text-muted-foreground">Loading payment history…</div>
        ) : loadError ? (
          <div role="alert" className="p-8 text-sm text-destructive">
            Unable to load payment history: {loadError}
          </div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            You have not made any membership payments yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b bg-muted/20 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Tier</th>
                  <th className="px-5 py-3 font-medium">Reference</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b last:border-0">
                    <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">
                      {format(new Date(payment.paid_at ?? payment.created_at), "dd MMM yyyy")}
                    </td>
                    <td className="px-5 py-4 font-medium">
                      {TIER_LABELS[payment.tier] ?? payment.tier}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                      {payment.reference}
                    </td>
                    <td className="px-5 py-4 font-medium">{ngn(payment.amount_kobo ?? 0)}</td>
                    <td className="px-5 py-4">
                      <span
                        className={[
                          "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
                          payment.status === "success"
                            ? "bg-success/15 text-primary"
                            : payment.status === "pending"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-destructive/10 text-destructive",
                        ].join(" ")}
                      >
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string | number;
  emphasize?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${emphasize ? "bg-primary/5" : "bg-card"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 font-display text-2xl ${emphasize ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}
