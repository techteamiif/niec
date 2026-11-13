import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PublicEventPreview = Pick<
  Database["public"]["Tables"]["events"]["Row"],
  | "id"
  | "title"
  | "event_type"
  | "start_date"
  | "end_date"
  | "min_tier_required"
  | "is_paid"
  | "image_url"
>;

export type PublicResourcePreview = Pick<
  Database["public"]["Tables"]["knowledge_resources"]["Row"],
  | "id"
  | "title"
  | "description"
  | "resource_type"
  | "community_of_practice"
  | "min_tier_required"
  | "cover_image_url"
  | "created_at"
>;

export function getPublicEventPreviews(limit = 3) {
  return supabase
    .from("events")
    .select("id, title, event_type, start_date, end_date, min_tier_required, is_paid, image_url")
    .gte("end_date", new Date().toISOString())
    .order("start_date", { ascending: true })
    .limit(limit);
}

export function getPublicResourcePreviews(limit = 3) {
  return supabase
    .from("knowledge_resources")
    .select(
      "id, title, description, resource_type, community_of_practice, min_tier_required, cover_image_url, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
}
