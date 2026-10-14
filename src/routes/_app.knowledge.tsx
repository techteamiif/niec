import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RichTextContent } from "@/components/RichTextContent";
import { EventImage } from "@/components/EventImage";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { tierMeets, TIER_LABELS, COPS } from "@/lib/niec";
import { richTextToPlainText } from "@/lib/rich-text";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

type KnowledgeResource = Database["public"]["Tables"]["knowledge_resources"]["Row"];

export const Route = createFileRoute("/_app/knowledge")({
  component: KnowledgePage,
});

function KnowledgePage() {
  const matches = useMatches();
  if (matches.some((match) => match.routeId.startsWith("/_app/knowledge/"))) {
    return <Outlet />;
  }
  return <KnowledgeIndex />;
}

function KnowledgeIndex() {
  const { profile, isStaff } = useAuth();
  const [items, setItems] = useState<KnowledgeResource[]>([]);
  const [type, setType] = useState("all");
  const [cop, setCop] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      let q = supabase.from("knowledge_resources").select("*").order("created_at", { ascending: false });
      if (type !== "all") q = q.eq("resource_type", type as Database["public"]["Enums"]["resource_type"]);
      if (cop !== "all") q = q.eq("community_of_practice", cop as Database["public"]["Enums"]["cop_type"]);
      const { data, error } = await q;
      if (error) {
        setItems([]);
        toast.error(`Unable to load resources: ${error.message}`);
        return;
      }
      setItems(data ?? []);
    })();
  }, [type, cop]);

  const filtered = items.filter((r) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (r.title ?? "").toLowerCase().includes(s) ||
      richTextToPlainText(r.description ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-6">
        <h1 className="font-display text-3xl">Knowledge Hub</h1>
        <p className="text-sm text-muted-foreground">Reports, case studies, policy briefs, datasets and toolkits.</p>
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title or description…"
          className="h-9 min-w-[220px] flex-1 rounded-md border bg-background px-3 text-sm"
        />
        <select value={type} onChange={(e) => setType(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="all">All types</option>
          {["report","case_study","policy_brief","dataset","presentation","toolkit"].map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={cop} onChange={(e) => setCop(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="all">All CoPs</option>
          <option value="general">General</option>
          {COPS.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => {
          const unlocked = tierMeets(profile?.membership_tier, r.min_tier_required) || isStaff;
          return (
            <Link
              key={r.id}
              to="/knowledge/$resourceId"
              params={{ resourceId: r.id }}
              className="group flex items-stretch gap-3 rounded-xl border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <EventImage
                src={r.cover_image_url}
                title={r.title}
                alt={`${r.title} cover`}
                className="h-24 w-20 shrink-0 self-start overflow-hidden rounded-md sm:h-28 sm:w-24"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.resource_type.replace(/_/g, " ")}</div>
                  <h3 className="font-display text-base leading-tight">{r.title}</h3>
                </div>
                <RichTextContent
                  content={r.description}
                  className="mt-3 line-clamp-3 text-xs text-muted-foreground [&_h2]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_ul]:list-disc"
                />
                {!unlocked && (
                  <div className="mt-3 rounded-md border border-dashed bg-muted/30 p-2 text-[11px] text-muted-foreground">
                    Preview locked — upgrade to <strong>{TIER_LABELS[r.min_tier_required]}</strong> to download.
                  </div>
                )}
                <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">↓ {r.downloads_count ?? 0}</div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline">
                    View resource <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
        {filtered.length === 0 && <div className="col-span-full rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">No resources match — try clearing filters or search terms.</div>}
      </div>
    </div>
  );
}
