import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

export type PublicEventDetails = Pick<
  EventRow,
  | "id"
  | "title"
  | "description"
  | "event_type"
  | "start_date"
  | "end_date"
  | "location"
  | "is_virtual"
  | "max_attendees"
  | "min_tier_required"
  | "is_paid"
  | "access_price_kobo"
  | "image_url"
  | "schedule"
  | "community_of_practice"
> & {
  created_by: null;
  virtual_link: null;
  registration_link: null;
};

export const getPublicEventDetails = createServerFn({ method: "GET" })
  .inputValidator((input: { eventId: string }) => {
    if (!input?.eventId || !/^[0-9a-f-]{36}$/i.test(input.eventId)) {
      throw new Error("Invalid event.");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL;
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !publishableKey) {
      throw new Error("Public event details are not configured.");
    }

    const supabase = createClient<Database>(url, publishableKey, {
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    const { data: event, error } = await supabase
      .from("events")
      .select(
        "id, title, description, event_type, start_date, end_date, location, is_virtual, max_attendees, min_tier_required, is_paid, access_price_kobo, image_url, schedule, community_of_practice",
      )
      .eq("id", data.eventId)
      .maybeSingle();

    if (error) throw new Error(`Could not load event: ${error.message}`);
    if (!event) return null;

    return {
      ...event,
      created_by: null,
      virtual_link: null,
      registration_link: null,
    } satisfies PublicEventDetails;
  });
