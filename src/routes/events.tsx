import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicEventCard } from "@/components/PublicCatalogCards";
import { getPublicEventPreviews, type PublicEventPreview } from "@/lib/public-catalog";
import { toast } from "sonner";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events — NIEC Connect" },
      { name: "description", content: "Explore upcoming Nigeria Impact Economy Community events." },
    ],
  }),
  component: PublicEventsPage,
});

function PublicEventsPage() {
  const [events, setEvents] = useState<PublicEventPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data, error } = await getPublicEventPreviews(100);
        if (!active) return;
        if (error) {
          toast.error(`Could not load events: ${error.message}`);
          setLoadError(true);
        } else {
          setEvents(data ?? []);
        }
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : "Unexpected error";
        toast.error(`Could not load events: ${message}`);
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
            NIEC convenings
          </div>
          <h1 className="mt-3 font-display text-4xl md:text-5xl">Upcoming events</h1>
          <p className="mt-4 text-muted-foreground">
            Discover the convenings, learning sessions, and community events bringing Nigeria's
            impact economy together.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading upcoming events…</p>
        ) : loadError ? (
          <p role="alert" className="text-sm text-destructive">
            Events could not be loaded. Please try again later.
          </p>
        ) : events.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <PublicEventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
            No upcoming events are scheduled right now. Please check back soon.
          </p>
        )}
      </main>
    </div>
  );
}
