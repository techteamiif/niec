import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { tierMeets, TIER_LABELS, COPS } from "@/lib/niec";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/knowledge")({
  component: KnowledgePage,
});

function KnowledgePage() {
  const { profile, isStaff } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [type, setType] = useState("all");
  const [cop, setCop] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      let q = supabase.from("knowledge_resources").select("*").order("created_at", { ascending: false });
      if (type !== "all") q = q.eq("resource_type", type as any);
      if (cop !== "all") q = q.eq("community_of_practice", cop as any);
      const { data } = await q;
      setItems(data ?? []);
    })();
  }, [type, cop]);

  const filtered = items.filter((r) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (r.title ?? "").toLowerCase().includes(s) ||
      (r.description ?? "").toLowerCase().includes(s) ||
      (r.tags ?? []).join(" ").toLowerCase().includes(s)
    );
  });

  const download = async (r: any) => {
    if (!tierMeets(profile?.membership_tier, r.min_tier_required) && !isStaff) {
      toast.error(`Requires ${TIER_LABELS[r.min_tier_required]} tier`);
      return;
    }
    await supabase.rpc("increment_resource_download", { _resource_id: r.id });
    setItems((prev) => prev.map((x) => x.id === r.id ? { ...x, downloads_count: (x.downloads_count ?? 0) + 1 } : x));
    if (r.file_url) window.open(r.file_url, "_blank");
    else toast.info("No file attached yet.");
  };

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
          placeholder="Search title, description, tags…"
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
            <div key={r.id} className={"rounded-xl border bg-card p-5 " + (unlocked ? "" : "opacity-90")}>
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.resource_type.replace(/_/g, " ")}</div>
                  <h3 className="font-display text-base leading-tight">{r.title}</h3>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground line-clamp-3">{r.description}</p>
              {!unlocked && (
                <div className="mt-3 rounded-md border border-dashed bg-muted/30 p-2 text-[11px] text-muted-foreground">
                  Preview locked — upgrade to <strong>{TIER_LABELS[r.min_tier_required]}</strong> to download.
                </div>
              )}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">↓ {r.downloads_count}</div>
                <button onClick={() => download(r)} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60" disabled={!unlocked}>
                  <Download className="h-3 w-3" /> {unlocked ? "Download" : "Locked"}
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="col-span-full rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">No resources match — try clearing filters or search terms.</div>}
      </div>
    </div>
  );
}
