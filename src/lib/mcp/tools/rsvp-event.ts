import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "rsvp_event",
  title: "RSVP to an event",
  description: "Register the signed-in member for a NIEC event. Tier restrictions still apply.",
  inputSchema: { event_id: z.string().uuid() },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ event_id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const { error } = await supabase
      .from("event_registrations")
      .insert({ event_id, user_id: ctx.getUserId()! } as never);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: "Registered for the event." }] };
  },
});
