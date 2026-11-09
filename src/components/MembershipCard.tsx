import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import type { Profile } from "@/lib/auth";
import { formatMembershipExpiryDate } from "@/lib/membership";
import { TIER_LABELS } from "@/lib/niec";

type MembershipCardProfile = Pick<
  Profile,
  | "id"
  | "full_name"
  | "organisation_name"
  | "membership_tier"
  | "paid_membership_tier"
  | "membership_status"
  | "membership_expires_at"
>;

export function MembershipCard({ profile }: { profile: MembershipCardProfile }) {
  const [downloading, setDownloading] = useState(false);
  const membershipNumber = `NIEC-${profile.id.slice(0, 8).toUpperCase()}`;
  const memberTier = profile.paid_membership_tier ?? profile.membership_tier;
  const tier = TIER_LABELS[memberTier] ?? memberTier;
  const expiryDate = profile.membership_expires_at
    ? formatMembershipExpiryDate(profile.membership_expires_at)
    : "No expiry date set";

  const downloadCard = async () => {
    setDownloading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [85.6, 54] });
      pdf.setFillColor(0, 51, 32);
      pdf.roundedRect(0, 0, 85.6, 54, 2, 2, "F");
      pdf.setFillColor(212, 160, 23);
      pdf.rect(0, 0, 85.6, 2, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text("NIEC MEMBERSHIP", 7, 11);
      pdf.setFontSize(14);
      pdf.text(pdf.splitTextToSize(profile.full_name || "NIEC Member", 70).slice(0, 2), 7, 23);
      pdf.setFontSize(8);
      pdf.setTextColor(224, 194, 109);
      pdf.text(tier, 7, 33);
      pdf.setTextColor(235, 243, 238);
      pdf.setFontSize(6.5);
      pdf.text(profile.organisation_name || "Nigeria Impact Economy Community", 7, 39, {
        maxWidth: 70,
      });
      pdf.text(`Valid through: ${expiryDate}`, 7, 45);
      pdf.setTextColor(192, 212, 201);
      pdf.text(membershipNumber, 7, 50);

      const safeName =
        profile.full_name
          .trim()
          .replace(/[^a-z0-9]+/gi, "-")
          .replace(/^-|-$/g, "")
          .toLowerCase() || "member";
      pdf.save(`niec-membership-${safeName}.pdf`);
    } catch (error) {
      console.error("Could not generate membership card PDF", error);
      toast.error("Could not download your membership card. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="mt-6 border-t pt-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg">Membership card</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your digital NIEC member card.</p>
        </div>
        <button
          type="button"
          onClick={() => void downloadCard()}
          disabled={downloading}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          {downloading ? "Preparing PDF…" : "Download PDF"}
        </button>
      </div>

      <div className="mt-4 max-w-xl overflow-hidden rounded-xl border border-[#D4A017]/40 bg-[#003320] p-5 text-white shadow-sm">
        <div className="mb-5 h-1 w-12 rounded-full bg-[#D4A017]" />
        <div className="text-[10px] font-semibold tracking-[0.18em] text-[#E0C26D]">
          NIEC MEMBERSHIP
        </div>
        <div className="mt-2 font-display text-xl">{profile.full_name || "NIEC Member"}</div>
        <div className="mt-1 text-sm text-[#E0C26D]">{tier}</div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3 text-xs text-white/75">
          <div>
            <div className="truncate">
              {profile.organisation_name || "Nigeria Impact Economy Community"}
            </div>
            <div className="mt-1">
              {profile.membership_status === "active"
                ? `Valid through ${expiryDate}`
                : `${profile.membership_status[0]?.toUpperCase()}${profile.membership_status.slice(1)}`}
            </div>
          </div>
          <div className="font-mono text-[10px]">{membershipNumber}</div>
        </div>
      </div>

      <Link
        to="/payments"
        className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <ReceiptText className="h-4 w-4" /> View payment history
      </Link>
    </section>
  );
}
