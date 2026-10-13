import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { tierMeets, TIER_LABELS } from "@/lib/niec";
import { toast } from "sonner";

type KnowledgeResource = Database["public"]["Tables"]["knowledge_resources"]["Row"];

export const Route = createFileRoute("/_app/knowledge/$resourceId")({
  component: KnowledgeResourcePage,
});

function KnowledgeResourcePage() {
  const { resourceId } = Route.useParams();
  const { profile, isStaff } = useAuth();
  const [resource, setResource] = useState<KnowledgeResource | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setResource(null);

    void (async () => {
      const { data, error } = await supabase
        .from("knowledge_resources")
        .select("*")
        .eq("id", resourceId)
        .maybeSingle();

      if (!active) return;
      if (error) toast.error(`Could not load resource: ${error.message}`);
      setResource(data);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [resourceId]);

  const download = async (url: string | null) => {
    if (!resource) return;
    if (!tierMeets(profile?.membership_tier, resource.min_tier_required) && !isStaff) {
      toast.error(`Requires ${TIER_LABELS[resource.min_tier_required]} tier`);
      return;
    }
    if (!url) {
      toast.info("No file attached yet.");
      return;
    }

    let safeUrl: URL;
    try {
      safeUrl = new URL(url);
    } catch {
      toast.error("This download link is invalid.");
      return;
    }
    if (safeUrl.protocol !== "https:" && safeUrl.protocol !== "http:") {
      toast.error("This download link is invalid.");
      return;
    }

    const { error } = await supabase.rpc("increment_resource_download", {
      _resource_id: resource.id,
    });
    if (error) {
      toast.error(`Unable to record download: ${error.message}`);
      return;
    }
    setResource((current) =>
      current ? { ...current, downloads_count: (current.downloads_count ?? 0) + 1 } : current,
    );
    window.open(safeUrl.toString(), "_blank", "noopener,noreferrer");
  };

  const unlocked = resource
    ? tierMeets(profile?.membership_tier, resource.min_tier_required) || isStaff
    : false;

  return (
    <div className="p-6 lg:p-10">
      <Link
        to="/knowledge"
        className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Knowledge Hub
      </Link>

      {loading ? (
        <div className="rounded-xl border bg-card p-8 text-sm text-muted-foreground">
          Loading resource…
        </div>
      ) : !resource ? (
        <div className="rounded-xl border bg-card p-8">
          <h1 className="font-display text-2xl">Resource not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This resource is unavailable or you do not have access to it.
          </p>
        </div>
      ) : (
        <article className="mx-auto max-w-4xl overflow-hidden rounded-2xl border bg-card">
          {resource.cover_image_url ? (
            <img
              src={resource.cover_image_url}
              alt={`${resource.title} cover`}
              className="max-h-[28rem] w-full object-cover"
            />
          ) : (
            <div className="grid h-48 place-items-center bg-primary/5 text-primary">
              <FileText className="h-12 w-12" />
            </div>
          )}
          <div className="p-6 lg:p-10">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              {resource.resource_type.replace(/_/g, " ")}
              {resource.community_of_practice !== "general" &&
                ` · ${resource.community_of_practice.replace(/_/g, " ")}`}
            </div>
            <h1 className="mt-2 font-display text-3xl lg:text-4xl">{resource.title}</h1>
            <p className="mt-6 whitespace-pre-wrap text-base leading-7 text-muted-foreground">
              {resource.description || "No description is available for this resource yet."}
            </p>

            <section className="mt-8 border-t pt-6">
              {!unlocked && (
                <p className="mb-4 rounded-md border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
                  Downloads require <strong>{TIER_LABELS[resource.min_tier_required]}</strong> tier.
                </p>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void download(resource.executive_summary_url)}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted"
                >
                  <Download className="h-4 w-4" /> Download executive summary
                </button>
                <button
                  type="button"
                  onClick={() => void download(resource.file_url)}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Download className="h-4 w-4" /> Download full report/publication
                </button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {resource.downloads_count ?? 0} downloads
              </p>
            </section>
          </div>
        </article>
      )}
    </div>
  );
}
