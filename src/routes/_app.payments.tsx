import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, CreditCard, Download } from "lucide-react";
import { toast } from "sonner";
import iifLogo from "@/assets/iif-logo-white.png";
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
  const [downloadingReference, setDownloadingReference] = useState<string | null>(null);

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

  const downloadReceipt = async (payment: MembershipPayment) => {
    if (payment.status !== "success") return;

    setDownloadingReference(payment.reference);
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const left = 20;
      const right = pageWidth - left;
      const paidAt = payment.paid_at ?? payment.created_at;
      const paymentDate = new Intl.DateTimeFormat("en-NG", {
        dateStyle: "long",
        timeZone: "Africa/Lagos",
      }).format(new Date(paidAt));
      const amountNumber = new Intl.NumberFormat("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(payment.amount_kobo / 100);
      const amount = `NGN ${amountNumber}`;
      const memberName = payment.full_name?.trim() || "NIEC Member";
      const logoImage = new Image();
      await new Promise<void>((resolve, reject) => {
        logoImage.onload = () => resolve();
        logoImage.onerror = () => reject(new Error("Could not load the IIF logo."));
        logoImage.src = iifLogo;
      });
      const logoCanvas = document.createElement("canvas");
      logoCanvas.width = logoImage.naturalWidth;
      logoCanvas.height = logoImage.naturalHeight;
      const logoContext = logoCanvas.getContext("2d");
      if (!logoContext) throw new Error("Could not prepare the IIF logo.");
      logoContext.drawImage(logoImage, 0, 0);

      pdf.setFillColor(10, 46, 24);
      pdf.rect(0, 0, pageWidth, 44, "F");
      const logoWidth = 66;
      const logoHeight = (logoWidth * logoImage.naturalHeight) / logoImage.naturalWidth;
      pdf.addImage(
        logoCanvas.toDataURL("image/png"),
        "PNG",
        left + 3,
        (44 - logoHeight) / 2,
        logoWidth,
        logoHeight,
      );
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text("PAYMENT RECEIPT", right, 21, { align: "right" });

      pdf.setTextColor(35, 45, 40);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text("RECEIPT REFERENCE", left, 58);
      pdf.setFont("helvetica", "bold");
      pdf.text(payment.reference, left, 65);

      pdf.setFont("helvetica", "normal");
      pdf.text("PAYMENT DATE", right, 58, { align: "right" });
      pdf.setFont("helvetica", "bold");
      pdf.text(paymentDate, right, 65, { align: "right" });

      pdf.setDrawColor(220, 226, 222);
      pdf.line(left, 75, right, 75);

      const details = [
        ["Received from", memberName],
        ["Email", payment.email],
        ["Description", `NIEC membership - ${TIER_LABELS[payment.tier] ?? payment.tier}`],
        ["Payment method", "Paystack"],
        ["Status", "PAID"],
      ];
      let y = 89;
      const valueX = left + 38;
      const valueWidth = right - valueX;
      for (const [label, value] of details) {
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(100, 110, 105);
        pdf.text(label, left, y);
        pdf.setTextColor(35, 45, 40);
        pdf.setFont("helvetica", "bold");
        const valueLines = pdf.splitTextToSize(value, valueWidth);
        pdf.text(valueLines, valueX, y);
        y += Math.max(12, valueLines.length * 5 + 5);
      }

      pdf.setFillColor(240, 247, 243);
      pdf.roundedRect(left, y + 3, right - left, 36, 2, 2, "F");
      pdf.setTextColor(35, 75, 55);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("AMOUNT PAID", left + 6, y + 14);
      pdf.setFontSize(18);
      pdf.text(amount, pageWidth / 2, y + 30, {
        align: "center",
        maxWidth: right - left - 16,
      });

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(110, 120, 115);
      pdf.text(
        "This receipt confirms payment for NIEC membership. It is issued electronically.",
        left,
        y + 55,
        { maxWidth: right - left },
      );

      const safeReference = payment.reference.replace(/[^a-z0-9-]/gi, "-");
      pdf.save(`niec-receipt-${safeReference}.pdf`);
    } catch (error) {
      console.error("Could not generate membership payment receipt", error);
      toast.error("Could not download the receipt. Please try again.");
    } finally {
      setDownloadingReference(null);
    }
  };

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
          <p className="mt-1 text-sm text-muted-foreground">
            Download a receipt for any successful payment. Receipts confirm completed payments;
            pending payments are not receipts.
          </p>
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
                  <th className="px-5 py-3 font-medium">Receipt</th>
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
                    <td className="px-5 py-4">
                      {payment.status === "success" && (
                        <button
                          type="button"
                          onClick={() => void downloadReceipt(payment)}
                          disabled={downloadingReference === payment.reference}
                          aria-label={`Download receipt for ${payment.reference}`}
                          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
                        >
                          <Download className="h-4 w-4" />
                          {downloadingReference === payment.reference ? "Preparing…" : "Download"}
                        </button>
                      )}
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
