import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_knowledge_resources",
  title: "List knowledge resources",
  description: "List reports, toolkits and other resources in the NIEC knowledge hub.",
  inputSchema: {
    search: z.string().trim().min(1).optional().describe("Match against title and description."),
    cop: z.string().optional(),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ search, cop, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("knowledge_resources")
      .select("id,title,description,resource_type,community_of_practice,min_tier_required,downloads_count,created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (cop) q = q.eq("community_of_practice", cop as never);
    if (search) q = q.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { items: data ?? [] },
    };
  },
});
