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
    if (error) throw new Error(`Could not verify purchase: ${error.message}`);
    return purchase !== null;
  });
