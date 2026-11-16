import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { sanitizeRichText } from "@/lib/rich-text";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
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

export type PublicationEditRecord = Pick<
  Database["public"]["Tables"]["knowledge_resources"]["Row"],
  "id" | "title" | "description" | "cover_image_url" | "executive_summary_url" | "file_url"
>;

export function EditPublicationDialog({
  open,
  onClose,
  onSaved,
  record,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
  record: PublicationEditRecord | null;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [executiveSummaryUrl, setExecutiveSummaryUrl] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [removeCurrentCover, setRemoveCurrentCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const coverImageInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!record || !open) return;
    setTitle(record.title);
    setDescription(sanitizeRichText(record.description));
    setExecutiveSummaryUrl(record.executive_summary_url ?? "");
    setFileUrl(record.file_url);
    setCoverImage(null);
    setRemoveCurrentCover(false);
    if (coverImageInput.current) coverImageInput.current.value = "";
  }, [record, open]);

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
    if (!file) return;
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
    setRemoveCurrentCover(false);
    setCoverImage(file);
  };

  const save = async () => {
    if (!record || saving) return;
    if (!user) {
      toast.error("You must be signed in to edit a publication.");
      return;
    }

    setSaving(true);
    let uploadedImagePath: string | null = null;
    let resourceSaved = false;
    try {
      let coverImageUrl = removeCurrentCover ? null : record.cover_image_url;
      if (coverImage) {
        const extensionByType: Record<string, string> = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
          "image/gif": "gif",
        };
        const extension = extensionByType[coverImage.type];
        if (!extension) throw new Error("Choose a valid cover image.");

        uploadedImagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("knowledge-resource-images")
          .upload(uploadedImagePath, coverImage, { contentType: coverImage.type });
        if (uploadError) {
          uploadedImagePath = null;
          throw new Error(`Could not upload cover image: ${uploadError.message}`);
        }
        coverImageUrl = supabase.storage
          .from("knowledge-resource-images")
          .getPublicUrl(uploadedImagePath).data.publicUrl;
      }

      const { error } = await supabase
        .from("knowledge_resources")
        .update({
          title: title.trim(),
          description: sanitizeRichText(description.trim()),
          cover_image_url: coverImageUrl,
          executive_summary_url: executiveSummaryUrl.trim() || null,
          file_url: fileUrl.trim(),
        })
        .eq("id", record.id);
      if (error) throw new Error(`Could not save publication: ${error.message}`);

      resourceSaved = true;
      toast.success("Publication updated.");
      onClose();
      await onSaved();
    } catch (error) {
      if (uploadedImagePath && !resourceSaved) {
        const { error: cleanupError } = await supabase.storage
          .from("knowledge-resource-images")
          .remove([uploadedImagePath]);
        if (cleanupError) {
          toast.error(`Could not remove unused cover image: ${cleanupError.message}`);
        }
      }
      toast.error(error instanceof Error ? error.message : "Could not update publication.");
    } finally {
      setSaving(false);
    }
  };

  if (!record) return null;

  const previewUrl = coverImagePreview ?? (removeCurrentCover ? null : record.cover_image_url);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !saving && onClose()}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
          <DialogTitle className="font-display text-xl">Edit Knowledge Hub publication</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="edit-publication-title">Title</Label>
              <Input
                id="edit-publication-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <RichTextEditor
                id="edit-publication-description"
                label="Abstract / description"
                value={description}
                onChange={setDescription}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="edit-publication-cover">Cover image (optional, max 5 MB)</Label>
              <Input
                ref={coverImageInput}
                id="edit-publication-cover"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(event) => {
                  selectCoverImage(event.currentTarget.files?.[0] ?? null);
                  event.currentTarget.value = "";
                }}
              />
              {previewUrl && (
                <div className="space-y-2">
                  <img
                    src={previewUrl}
                    alt="Publication cover preview"
                    className="mt-2 max-h-48 w-full rounded-md object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (coverImage) {
                        setCoverImage(null);
                      } else {
                        setRemoveCurrentCover(true);
                      }
                    }}
                    className="text-sm text-muted-foreground underline hover:text-foreground"
                  >
                    {coverImage ? "Cancel replacement" : "Remove image"}
                  </button>
                  {coverImage && <p className="text-xs text-muted-foreground">{coverImage.name}</p>}
                </div>
              )}
              {removeCurrentCover && !coverImage && (
                <button
                  type="button"
                  onClick={() => setRemoveCurrentCover(false)}
                  className="text-sm text-muted-foreground underline hover:text-foreground"
                >
                  Undo removal
                </button>
              )}
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="edit-publication-file">Full report/publication URL</Label>
              <Input
                id="edit-publication-file"
                value={fileUrl}
                onChange={(event) => setFileUrl(event.target.value)}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="edit-publication-summary">Executive summary URL</Label>
              <Input
                id="edit-publication-summary"
                value={executiveSummaryUrl}
                onChange={(event) => setExecutiveSummaryUrl(event.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
