import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicResourceCard } from "@/components/PublicCatalogCards";
import { getPublicResourcePreviews, type PublicResourcePreview } from "@/lib/public-catalog";
import { toast } from "sonner";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Resources — NIEC Connect" },
      {
        name: "description",
        content:
          "Explore reports, case studies, policy briefs, datasets, and toolkits from the NIEC Knowledge Hub.",
      },
    ],
  }),
  component: PublicResourcesPage,
});

function PublicResourcesPage() {
  const [resources, setResources] = useState<PublicResourcePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data, error } = await getPublicResourcePreviews(100);
        if (!active) return;
        if (error) {
          toast.error(`Could not load resources: ${error.message}`);
          setLoadError(true);
        } else {
          setResources(data ?? []);
        }
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : "Unexpected error";
        toast.error(`Could not load resources: ${message}`);
        setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="mb-10 max-w-2xl">
          <div className="text-[10px] uppercase tracking-[0.22em] text-primary">
            NIEC Knowledge Hub
          </div>
          <h1 className="mt-3 font-display text-4xl md:text-5xl">
            Resources for the impact economy
          </h1>
          <p className="mt-4 text-muted-foreground">
            Explore reports, case studies, policy briefs, datasets, and toolkits from across the
            ecosystem.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading resources…</p>
        ) : loadError ? (
          <p role="alert" className="text-sm text-destructive">
            Resources could not be loaded. Please try again later.
          </p>
        ) : resources.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource) => (
              <PublicResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
            No resources have been published yet. Please check back soon.
          </p>
        )}
      </main>
    </div>
  );
}
