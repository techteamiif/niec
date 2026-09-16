import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "create_post",
  title: "Create a community post",
  description: "Publish a post to the NIEC community feed as the signed-in member.",
  inputSchema: {
    title: z.string().trim().min(3).max(200),
    content: z.string().trim().min(1),
    cop: z
      .enum([
        "giis-inclusive-impact",
        "climate-green-finance",
        "niiric",
        "policy-acii",
        "capital-deals",
        "eso-collaborative",
        "general",
      ])
      .default("general"),
    post_type: z
      .enum(["discussion", "opportunity", "event", "knowledge", "announcement"])
      .default("discussion"),
    tags: z.array(z.string().trim().min(1)).max(10).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, content, cop, post_type, tags }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("community_posts")
      .insert({
        author_id: ctx.getUserId()!,
        title,
        content,
        community_of_practice: cop as never,
        post_type: post_type as never,
        tags: tags ?? null,
      })
      .select("id,title,community_of_practice,post_type,created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Posted: ${data.title} (${data.id})` }],
      structuredContent: { post: data },
    };
  },
});
