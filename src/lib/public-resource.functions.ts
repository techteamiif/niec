import { createServerFn } from "@tanstack/react-start";
import type { Database } from "@/integrations/supabase/types";

type KnowledgeResource = Database["public"]["Tables"]["knowledge_resources"]["Row"];
type ResourceAuthor = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "full_name" | "organisation_name" | "avatar_url" | "organisation_type"
>;

export type PublicKnowledgeResource = Pick<
  KnowledgeResource,
  | "id"
  | "title"
  | "description"
  | "resource_type"
  | "community_of_practice"
  | "min_tier_required"
  | "cover_image_url"
  | "created_at"
  | "access_price_kobo"
  | "downloads_count"
  | "uploaded_by"
>;

export const getPublicKnowledgeResource = createServerFn({ method: "GET" })
  .inputValidator((input: { resourceId: string }) => {
    if (!input?.resourceId || !/^[0-9a-f-]{36}$/i.test(input.resourceId)) {
      throw new Error("Invalid resource.");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: resource, error } = await supabaseAdmin
      .from("knowledge_resources")
      .select(
        "id, title, description, resource_type, community_of_practice, min_tier_required, cover_image_url, created_at, access_price_kobo, downloads_count, uploaded_by",
      )
      .eq("id", data.resourceId)
      .maybeSingle();

    if (error) throw new Error(`Could not load resource: ${error.message}`);
    if (!resource) return { resource: null, author: null };

    let author: ResourceAuthor | null = null;
    if (resource.uploaded_by) {
      const { data: authorData, error: authorError } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, organisation_name, avatar_url, organisation_type")
        .eq("id", resource.uploaded_by)
        .maybeSingle();
      if (authorError) throw new Error(`Could not load resource author: ${authorError.message}`);
      author = authorData;
    }

    return { resource, author };
  });

export const hasGuestKnowledgePurchase = createServerFn({ method: "POST" })
  .inputValidator((input: { resourceId: string; purchaseReference: string }) => {
    if (
      !input?.resourceId ||
      !/^[0-9a-f-]{36}$/i.test(input.resourceId) ||
      !input.purchaseReference ||
      input.purchaseReference.length > 120
    ) {
      throw new Error("Invalid purchase reference.");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: purchase, error } = await supabaseAdmin
      .from("resource_purchases")
      .select("id")
      .eq("reference", data.purchaseReference)
      .eq("resource_type", "knowledge")
      .eq("resource_id", data.resourceId)
      .eq("status", "success")
      .maybeSingle();
    if (error) throw new Error(`Could not verify resource access: ${error.message}`);
    return purchase !== null;
  });

export const getGuestKnowledgeDownloadUrl = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { resourceId: string; fileType: "pdf" | "summary"; purchaseReference?: string }) => {
      if (!input?.resourceId || !/^[0-9a-f-]{36}$/i.test(input.resourceId)) {
        throw new Error("Invalid resource.");
      }
      if (!["pdf", "summary"].includes(input.fileType)) {
        throw new Error("Invalid download type.");
      }
      if (input.purchaseReference && input.purchaseReference.length > 120) {
        throw new Error("Invalid purchase reference.");
      }
      return input;
    },
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: resource, error: resourceError } = await supabaseAdmin
      .from("knowledge_resources")
      .select("id, min_tier_required, access_price_kobo, file_url, executive_summary_url")
      .eq("id", data.resourceId)
      .maybeSingle();
    if (resourceError) throw new Error(`Could not load resource: ${resourceError.message}`);
    if (!resource) throw new Error("This resource is unavailable.");

    if (data.purchaseReference) {
      const { data: purchase, error: purchaseError } = await supabaseAdmin
        .from("resource_purchases")
        .select("id")
        .eq("reference", data.purchaseReference)
        .eq("resource_type", "knowledge")
        .eq("resource_id", data.resourceId)
        .eq("status", "success")
        .maybeSingle();
      if (purchaseError) throw new Error(`Could not verify purchase: ${purchaseError.message}`);
      if (!purchase) throw new Error("This purchase does not grant access to the resource.");
    } else if (resource.min_tier_required !== "observer" || resource.access_price_kobo !== null) {
      throw new Error("A completed purchase is required to download this resource.");
    }

    const filePath = data.fileType === "pdf" ? resource.file_url : resource.executive_summary_url;
    if (!filePath) throw new Error("No file is attached for this download.");

    let downloadUrl: string;
    if (/^https?:\/\//i.test(filePath)) {
      const safeUrl = new URL(filePath);
      if (safeUrl.protocol !== "https:" && safeUrl.protocol !== "http:") {
        throw new Error("This download link is invalid.");
      }
      downloadUrl = safeUrl.toString();
    } else {
      const { data: signedUrl, error: signedUrlError } = await supabaseAdmin.storage
        .from("knowledge-resource-pdfs")
        .createSignedUrl(filePath, 60);
      if (signedUrlError || !signedUrl?.signedUrl) {
        throw new Error(
          `Could not create a secure download link: ${signedUrlError?.message ?? "Unknown error"}`,
        );
      }
      downloadUrl = signedUrl.signedUrl;
    }

    const { error: countError } = await supabaseAdmin.rpc("increment_resource_download", {
      _resource_id: data.resourceId,
    });
    if (countError) throw new Error(`Unable to record download: ${countError.message}`);

    return { downloadUrl };
  });
