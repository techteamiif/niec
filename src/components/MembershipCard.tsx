import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import QRCode from "qrcode";
import { Download, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import iifLogo from "@/assets/iif-logo.png";
import { UserAvatar } from "@/components/Avatar";
import type { Profile } from "@/lib/auth";
import { formatMembershipExpiryDate } from "@/lib/membership";
import { initials, TIER_LABELS } from "@/lib/niec";

type MembershipCardProfile = Pick<
  Profile,
  | "id"
  | "full_name"
  | "avatar_url"
  | "membership_tier"
  | "paid_membership_tier"
  | "membership_status"
  | "membership_expires_at"
>;

const cardQrOptions = {
  errorCorrectionLevel: "M" as const,
  margin: 1,
  width: 320,
  color: { dark: "#003320", light: "#F7F7F7" },
};

function imageToDataUrl(src: string, circular = false): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const size = circular ? 512 : Math.max(image.naturalWidth, image.naturalHeight);
      if (!image.naturalWidth || !image.naturalHeight) {
        reject(new Error("The card image has invalid dimensions."));
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = circular ? size : image.naturalWidth;
      canvas.height = circular ? size : image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Could not prepare an image for the membership card."));
        return;
      }

      if (circular) {
        context.beginPath();
        context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        context.clip();
        const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
        const width = image.naturalWidth * scale;
        const height = image.naturalHeight * scale;
        context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
      } else {
        context.drawImage(image, 0, 0);
      }

      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error("Could not load an image for the membership card."));
    image.src = src;
  });
}

export function MembershipCard({ profile }: { profile: MembershipCardProfile }) {
  const [downloading, setDownloading] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [qrCodeError, setQrCodeError] = useState(false);
  const membershipNumber = `NIEC-${profile.id.slice(0, 8).toUpperCase()}`;
  const memberName = profile.full_name || "NIEC Member";
  const memberTier = profile.paid_membership_tier ?? profile.membership_tier;
  const tier = TIER_LABELS[memberTier] ?? memberTier;
  const expiryDate = profile.membership_expires_at
    ? formatMembershipExpiryDate(profile.membership_expires_at)
    : "No expiry date set";
  const validity =
    profile.membership_status === "active"
      ? { label: "EXPIRY DATE", value: expiryDate }
      : {
          label: "STATUS",
          value: `${profile.membership_status[0]?.toUpperCase()}${profile.membership_status.slice(1)}`,
        };

  useEffect(() => {
    let cancelled = false;
    setQrCodeDataUrl(null);
    setQrCodeError(false);
    void QRCode.toDataURL(membershipNumber, cardQrOptions)
      .then((dataUrl) => {
        if (!cancelled) setQrCodeDataUrl(dataUrl);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("Could not generate membership card QR code", error);
        setQrCodeError(true);
        toast.error("Could not display your membership QR code.");
      });

    return () => {
      cancelled = true;
    };
  }, [membershipNumber]);

  const downloadCard = async () => {
    setDownloading(true);
    try {
      const [{ jsPDF }, qrCode] = await Promise.all([
        import("jspdf"),
        qrCodeDataUrl
          ? Promise.resolve(qrCodeDataUrl)
          : QRCode.toDataURL(membershipNumber, cardQrOptions),
      ]);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [85.6, 104.5] });
      const logoDataUrl = await imageToDataUrl(iifLogo);
      let avatarDataUrl: string | null = null;
      if (profile.avatar_url) {
        try {
          avatarDataUrl = await imageToDataUrl(profile.avatar_url, true);
        } catch (error) {
          console.error("Could not include the member avatar in the membership card PDF", error);
          toast.warning("Your profile photo could not be included in the PDF.");
        }
      }

      const width = 85.6;
      const height = 104.5;
      const center = width / 2;
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(1, 1, width - 2, height - 2, 2, 2, "F");
      pdf.setFillColor(247, 247, 247);
      pdf.rect(2.5, 59, width - 5, height - 61.5, "F");
      pdf.setFillColor(209, 162, 58);
      pdf.rect(2.5, 57.7, width - 5, 1.3, "F");
      pdf.addImage(logoDataUrl, "PNG", 7, 5, 34, 11.9);

      pdf.setTextColor(72, 72, 72);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(5.5);
      pdf.text("MEMBER ID", 78.6, 7, { align: "right" });
      pdf.setFontSize(7);
      pdf.text(membershipNumber, 78.6, 12, { align: "right" });

      pdf.setFillColor(209, 162, 58);
      pdf.circle(center, 30, 12.2, "F");
      if (avatarDataUrl) {
        pdf.addImage(avatarDataUrl, "PNG", center - 11.2, 18.8, 22.4, 22.4);
      } else {
        pdf.setFillColor(244, 244, 244);
        pdf.circle(center, 30, 10.8, "F");
        pdf.setTextColor(0, 51, 32);
        pdf.setFontSize(12);
        pdf.text(initials(memberName), center, 32, { align: "center" });
      }

      const nameLines = pdf.splitTextToSize(memberName, 70).slice(0, 2);
      pdf.setTextColor(27, 27, 27);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text(nameLines, center, nameLines.length > 1 ? 50 : 53, { align: "center" });

      pdf.setTextColor(83, 83, 83);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(5.5);
      pdf.text("MEMBERSHIP TIER", 7, 64.5);
      pdf.text(validity.label, 78.6, 64.5, { align: "right" });
      pdf.setTextColor(30, 30, 30);
      pdf.setFontSize(8);
      pdf.text(pdf.splitTextToSize(tier, 32).slice(0, 2), 7, 69.5);
      pdf.text(pdf.splitTextToSize(validity.value, 38).slice(0, 2), 78.6, 69.5, {
        align: "right",
      });
      pdf.addImage(qrCode, "PNG", center - 12, 76, 24, 24);
      pdf.setDrawColor(215, 220, 216);
      pdf.setLineWidth(0.7);
      pdf.roundedRect(1, 1, width - 2, height - 2, 2, 2, "S");

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

      <div className="mt-4 max-w-[390px] overflow-hidden rounded-md border-[5px] border-[#D7DDD9] bg-white shadow-sm">
        <div className="min-h-[232px] px-6 pt-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <img src={iifLogo} alt="Impact Investors Foundation" className="w-[138px]" />
            <div className="text-right text-[10px] leading-4 text-zinc-700">
              <div className="font-semibold tracking-wide">MEMBER ID</div>
              <div className="font-mono font-medium">{membershipNumber}</div>
            </div>
          </div>
          <div className="mt-3 flex justify-center">
            <UserAvatar
              name={memberName}
              src={profile.avatar_url}
              size={88}
              className="border-[4px] border-[#D1A23A] ring-0"
            />
          </div>
          <h3 className="mt-2 text-center font-display text-lg font-semibold leading-6 text-zinc-900">
            {memberName}
          </h3>
        </div>
        <div className="h-1 bg-[#D1A23A]" />
        <div className="flex min-h-[220px] flex-col bg-[#F7F7F7] px-7 pt-4 pb-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] font-semibold tracking-wide text-zinc-600">
                MEMBERSHIP TIER
              </div>
              <div className="mt-1 text-sm font-bold text-zinc-900">{tier}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold tracking-wide text-zinc-600">
                {validity.label}
              </div>
              <div className="mt-1 text-sm font-bold text-zinc-900">{validity.value}</div>
            </div>
          </div>
          <div className="flex flex-1 items-end justify-center pt-2">
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt={`QR code for membership ${membershipNumber}`}
                className="h-[96px] w-[96px]"
              />
            ) : (
              <div
                className="flex h-[96px] w-[96px] items-center justify-center text-center text-xs text-zinc-500"
                aria-live="polite"
              >
                {qrCodeError ? "QR code unavailable" : "Generating QR code…"}
              </div>
            )}
          </div>
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
