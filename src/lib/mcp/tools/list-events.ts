import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_events",
  title: "List events",
  description: "List NIEC events. Defaults to upcoming events; set past=true for events that already happened.",
  inputSchema: {
    past: z.boolean().default(false),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ past, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const now = new Date().toISOString();
    const q = supabase
      .from("events")
      .select("id,title,description,event_type,start_date,end_date,location,is_virtual,min_tier_required,community_of_practice")
      .order("start_date", { ascending: !past })
      .limit(limit ?? 20);
    const { data, error } = past ? await q.lt("start_date", now) : await q.gte("start_date", now);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { items: data ?? [] },
    };
  },
});
