import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_posts",
  title: "List community posts",
  description: "List recent NIEC community feed posts, optionally filtered by Community of Practice slug or post type.",
  inputSchema: {
    cop: z.string().optional().describe("Community of Practice slug, e.g. 'niiric'."),
    post_type: z
      .enum(["discussion", "opportunity", "event", "knowledge", "announcement"])
      .optional(),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ cop, post_type, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("community_posts")
      .select("id,title,content,post_type,community_of_practice,tags,likes_count,comments_count,created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (cop) q = q.eq("community_of_practice", cop as never);
    if (post_type) q = q.eq("post_type", post_type as never);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { items: data ?? [] },
    };
  },
});
