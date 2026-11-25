import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { COPS, TIER_LABELS } from "@/lib/niec";
import { parsePriceInput } from "@/lib/price-input";
import { sanitizeRichText } from "@/lib/rich-text";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { PriceInput } from "@/components/PriceInput";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";

type PublicationInsert = Database["public"]["Tables"]["knowledge_resources"]["Insert"];
type ResourceType = Database["public"]["Enums"]["resource_type"];
type CommunityOfPractice = Database["public"]["Enums"]["cop_type"];
type MembershipTier = Database["public"]["Enums"]["membership_tier"];

export function CreatePublicationDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resourceType, setResourceType] = useState<ResourceType>("report");
  const [community, setCommunity] = useState<CommunityOfPractice>("general");
  const [minTier, setMinTier] = useState<MembershipTier>("observer");
  const [accessPriceNaira, setAccessPriceNaira] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [publicationPdf, setPublicationPdf] = useState<File | null>(null);
  const [summaryUrl, setSummaryUrl] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const coverImageInput = useRef<HTMLInputElement>(null);
  const publicationPdfInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!coverImage) {
      setCoverImagePreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(coverImage);
    setCoverImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [coverImage]);

  const selectCoverImage = (file: File | null) => {
    if (!file) {
      setCoverImage(null);
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setCoverImage(null);
      toast.error("Choose a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCoverImage(null);
      toast.error("Cover image must be 5 MB or smaller.");
      return;
    }
    setCoverImage(file);
  };

  const save = async () => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      toast.error("Enter a publication title.");
      return;
    }
    if (!user) {
      toast.error("You must be signed in to add a publication.");
      return;
    }

    const isValidHttpUrl = (value: string) => {
      try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
      } catch {
        return false;
      }
    };
    const normalizedFileUrl = fileUrl.trim();
    if (normalizedFileUrl && !isValidHttpUrl(normalizedFileUrl)) {
      toast.error("Enter a valid publication URL.");
      return;
    }
    if (!normalizedFileUrl && !publicationPdf) {
      toast.error("Upload a PDF publication or enter a publication URL.");
      return;
    }
    if (normalizedFileUrl && publicationPdf) {
      toast.error("Choose either a PDF upload or a publication URL, not both.");
      return;
    }
    if (
      publicationPdf &&
      (publicationPdf.type !== "application/pdf" ||
        !publicationPdf.name.toLowerCase().endsWith(".pdf"))
    ) {
      toast.error("Choose a valid PDF file.");
      return;
    }
    if (publicationPdf && publicationPdf.size > 50 * 1024 * 1024) {
      toast.error("PDF publications must be 50 MB or smaller.");
      return;
    }
    const normalizedSummaryUrl = summaryUrl.trim();
    if (normalizedSummaryUrl && !isValidHttpUrl(normalizedSummaryUrl)) {
      toast.error("Enter a valid executive summary URL.");
      return;
    }
    const parsedAccessPrice = accessPriceNaira.trim() ? parsePriceInput(accessPriceNaira) : null;
    if (
      parsedAccessPrice !== null &&
      (!Number.isSafeInteger(parsedAccessPrice) || parsedAccessPrice <= 0)
    ) {
      toast.error("Enter a one-time access price as a positive whole number of naira.");
      return;
    }
    if (parsedAccessPrice !== null && (!publicationPdf || normalizedSummaryUrl)) {
      toast.error(
        "Publications with one-time access pricing must use an uploaded PDF and cannot include a public summary URL.",
      );
      return;
    }
    const imageExtensions: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    setSaving(true);
    try {
      let publicationUrl = normalizedFileUrl;
      let uploadedPdfPath: string | null = null;
      if (publicationPdf) {
        uploadedPdfPath = `${user.id}/${crypto.randomUUID()}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from("knowledge-resource-pdfs")
          .upload(uploadedPdfPath, publicationPdf, { contentType: "application/pdf" });
        if (uploadError) {
          toast.error(`Could not upload publication PDF: ${uploadError.message}`);
          return;
        }
        publicationUrl = uploadedPdfPath;
      }

      let coverImageUrl: string | null = null;
      let uploadedImagePath: string | null = null;
      if (coverImage) {
        uploadedImagePath = `${user.id}/${crypto.randomUUID()}.${imageExtensions[coverImage.type]}`;
        const { error: uploadError } = await supabase.storage
          .from("knowledge-resource-images")
          .upload(uploadedImagePath, coverImage, { contentType: coverImage.type });
        if (uploadError) {
          if (uploadedPdfPath) {
            const { error: cleanupError } = await supabase.storage
              .from("knowledge-resource-pdfs")
              .remove([uploadedPdfPath]);
            if (cleanupError) {
              toast.error(`Could not remove unused publication PDF: ${cleanupError.message}`);
            }
          }
          toast.error(`Could not upload cover image: ${uploadError.message}`);
          return;
        }
        coverImageUrl = supabase.storage
          .from("knowledge-resource-images")
          .getPublicUrl(uploadedImagePath).data.publicUrl;
      }

      const publication: PublicationInsert = {
        title: normalizedTitle,
        description: sanitizeRichText(description.trim()),
        resource_type: resourceType,
        community_of_practice: community,
        min_tier_required: minTier,
        access_price_kobo: parsedAccessPrice === null ? null : parsedAccessPrice * 100,
        file_url: publicationUrl,
        executive_summary_url: normalizedSummaryUrl || null,
        cover_image_url: coverImageUrl,
        uploaded_by: user.id,
      };
      const { error } = await supabase.from("knowledge_resources").insert(publication);
      if (error) {
        if (uploadedPdfPath) {
          const { error: cleanupError } = await supabase.storage
            .from("knowledge-resource-pdfs")
            .remove([uploadedPdfPath]);
          if (cleanupError) {
            toast.error(`Could not remove unused publication PDF: ${cleanupError.message}`);
          }
        }
        if (uploadedImagePath) {
          const { error: cleanupError } = await supabase.storage
            .from("knowledge-resource-images")
            .remove([uploadedImagePath]);
          if (cleanupError) {
            toast.error(`Could not remove unused cover image: ${cleanupError.message}`);
          }
        }
        toast.error(`Could not add publication: ${error.message}`);
        return;
      }

      toast.success("Publication added to the Knowledge Hub.");
      onClose();
      setTitle("");
      setDescription("");
      setResourceType("report");
      setCommunity("general");
      setMinTier("observer");
      setAccessPriceNaira("");
      setFileUrl("");
      setPublicationPdf(null);
      if (publicationPdfInput.current) publicationPdfInput.current.value = "";
      setSummaryUrl("");
      setCoverImage(null);
      if (coverImageInput.current) coverImageInput.current.value = "";
      await onCreated();
    } catch (error) {
      toast.error(
        `Could not add publication: ${error instanceof Error ? error.message : "Unexpected error"}`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !saving && onClose()}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
          <DialogTitle className="font-display text-xl">Add Knowledge Hub publication</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Add publication details and provide its downloadable link.
          </p>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="publication-title">Title</Label>
              <Input
                id="publication-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                maxLength={250}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <RichTextEditor
                id="publication-description"
                label="Abstract / description"
                value={description}
                onChange={setDescription}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="publication-type">Publication type</Label>
              <CustomSelect
                id="publication-type"
                value={resourceType}
                onValueChange={(value) => setResourceType(value as ResourceType)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="report">Report</option>
                <option value="case_study">Case study</option>
                <option value="policy_brief">Policy brief</option>
                <option value="dataset">Dataset</option>
                <option value="presentation">Presentation</option>
                <option value="toolkit">Toolkit</option>
              </CustomSelect>
            </div>
            <div className="space-y-1">
              <Label htmlFor="publication-community">Community of practice</Label>
              <CustomSelect
                id="publication-community"
                value={community}
                onValueChange={(value) => setCommunity(value as CommunityOfPractice)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="general">General</option>
                {COPS.map((cop) => (
                  <option key={cop.key} value={cop.key}>
                    {cop.name}
                  </option>
                ))}
              </CustomSelect>
            </div>
            <div className="space-y-1">
              <Label htmlFor="publication-tier">Membership tier</Label>
              <CustomSelect
                id="publication-tier"
                value={minTier}
                onValueChange={(value) => setMinTier(value as MembershipTier)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                {Object.entries(TIER_LABELS).map(([tier, label]) => (
                  <option key={tier} value={tier}>
                    {label}
                  </option>
                ))}
              </CustomSelect>
              <p className="text-xs text-muted-foreground">
                Members at this tier or above can access the publication.
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="publication-access-price">
                One-time access price (NGN, optional)
              </Label>
              <PriceInput
                id="publication-access-price"
                value={accessPriceNaira}
                onValueChange={setAccessPriceNaira}
                placeholder="Leave blank for tier-only access"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                A one-time purchase can unlock this publication without a membership upgrade.
              </p>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="publication-pdf">Publication PDF (optional, max 50 MB)</Label>
              <Input
                ref={publicationPdfInput}
                id="publication-pdf"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0] ?? null;
                  setPublicationPdf(file);
                  event.currentTarget.value = "";
                }}
              />
              {publicationPdf && (
                <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-muted-foreground">{publicationPdf.name}</span>
                  <button
                    type="button"
                    onClick={() => setPublicationPdf(null)}
                    className="shrink-0 text-muted-foreground underline hover:text-foreground"
                  >
                    Remove PDF
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="publication-file">Or publication URL</Label>
              <Input
                id="publication-file"
                type="url"
                value={fileUrl}
                onChange={(event) => setFileUrl(event.target.value)}
                placeholder="https://…"
              />
              <p className="text-xs text-muted-foreground">Provide either a PDF upload or a URL.</p>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="publication-summary">Executive summary URL (optional)</Label>
              <Input
                id="publication-summary"
                type="url"
                value={summaryUrl}
                onChange={(event) => setSummaryUrl(event.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="publication-cover">Cover image (optional, max 5 MB)</Label>
              <Input
                ref={coverImageInput}
                id="publication-cover"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(event) => {
                  selectCoverImage(event.currentTarget.files?.[0] ?? null);
                  event.currentTarget.value = "";
                }}
              />
              {coverImagePreview && (
                <div className="space-y-2">
                  <img
                    src={coverImagePreview}
                    alt="Publication cover preview"
                    className="mt-2 max-h-48 w-full rounded-md object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setCoverImage(null)}
                    className="text-sm text-muted-foreground underline hover:text-foreground"
                  >
                    Remove image
                  </button>
                  <p className="text-xs text-muted-foreground">{coverImage?.name}</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Adding…" : "Add publication"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
