import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_my_notifications",
  title: "List my notifications",
  description: "List the signed-in member's in-app notifications, newest first.",
  inputSchema: {
    unread_only: z.boolean().default(false),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ unread_only, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("notifications")
      .select("id,type,title,message,link,is_read,created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (unread_only) q = q.eq("is_read", false);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { items: data ?? [] },
    };
  },
});
