import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_deal_opportunities",
  title: "List deal opportunities",
  description: "List Deal Room opportunities visible to the signed-in member's membership tier.",
  inputSchema: {
    status: z.enum(["open", "under_review", "matched", "closed"]).optional(),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("deal_opportunities")
      .select("id,title,enterprise_name,sector,category,instrument_type,ticket_size_min,ticket_size_max,currency,status,min_tier_required,created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (status) q = q.eq("status", status as never);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { items: data ?? [] },
    };
  },
});
