import { defineTool } from "@lovable.dev/mcp-js";
import { COPS } from "@/lib/niec";

export default defineTool({
  name: "list_communities_of_practice",
  title: "List Communities of Practice",
  description: "List the NIEC Communities of Practice (CoPs) with their slugs and descriptions.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const items = COPS.map((c) => ({ slug: c.key, name: c.name, description: c.description }));
    return {
      content: [{ type: "text", text: JSON.stringify(items, null, 2) }],
      structuredContent: { items },
    };
  },
});
