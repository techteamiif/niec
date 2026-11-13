import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ArrowRight, CalendarDays, FileText } from "lucide-react";
import { EventImage } from "@/components/EventImage";
import { useAuth } from "@/lib/auth";
import { getKnowledgeResourceAccessCategory } from "@/lib/niec";
import { richTextToPlainText } from "@/lib/rich-text";
import type { PublicEventPreview, PublicResourcePreview } from "@/lib/public-catalog";

function EventCardContent({ event }: { event: PublicEventPreview }) {
  return (
    <article className="h-full overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant">
      <EventImage
        src={event.image_url}
        title={event.title}
        alt={`${event.title} cover`}
        fit="natural"
        placeholderIcon="image"
        className="max-h-56 w-full overflow-hidden"
      />
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>{event.event_type.replace(/_/g, " ")}</span>
          <span className="rounded-full border border-border bg-muted/60 px-2 py-0.5 font-semibold normal-case tracking-normal text-foreground/80">
            {event.min_tier_required === "observer" ? "Free" : "Membership"}
          </span>
        </div>
        <h3 className="mt-2 font-display text-xl leading-tight text-foreground">{event.title}</h3>
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
          {format(new Date(event.start_date), "EEE, MMM d, yyyy")}
        </p>
        <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
          View event <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </article>
  );
}

export function PublicEventCard({ event }: { event: PublicEventPreview }) {
  const { user } = useAuth();
  const content = <EventCardContent event={event} />;

  return user ? (
    <Link
      to="/event/$eventId"
      params={{ eventId: event.id }}
      className="block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {content}
    </Link>
  ) : (
    <Link
      to="/login"
      search={{ next: `/event/${event.id}` }}
      className="block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {content}
    </Link>
  );
}

function ResourceCardContent({ resource }: { resource: PublicResourcePreview }) {
  const description = richTextToPlainText(resource.description);
  const accessLabel =
    getKnowledgeResourceAccessCategory(resource.min_tier_required) === "free"
      ? "Free"
      : "Membership";

  return (
    <article className="h-full overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant">
      {resource.cover_image_url ? (
        <EventImage
          src={resource.cover_image_url}
          title={resource.title}
          alt={`${resource.title} cover`}
          fit="natural"
          placeholderIcon="file"
          className="max-h-56 w-full overflow-hidden"
        />
      ) : (
        <div className="grid h-44 place-items-center bg-muted/50 text-primary">
          <FileText className="h-10 w-10" aria-hidden="true" />
        </div>
      )}
      <div className="flex min-h-52 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>{resource.resource_type.replace(/_/g, " ")}</span>
          <span className="rounded-full border border-border bg-muted/60 px-2 py-0.5 font-semibold normal-case tracking-normal text-foreground/80">
            {accessLabel}
          </span>
        </div>
        <h3 className="mt-2 font-display text-xl leading-tight text-foreground">
          {resource.title}
        </h3>
        {description && (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
        <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-primary">
          View resource <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </article>
  );
}

export function PublicResourceCard({ resource }: { resource: PublicResourcePreview }) {
  const { user } = useAuth();
  const content = <ResourceCardContent resource={resource} />;

  return user ? (
    <Link
      to="/knowledge/$resourceId"
      params={{ resourceId: resource.id }}
      className="block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {content}
    </Link>
  ) : (
    <Link
      to="/login"
      search={{ next: `/knowledge/${resource.id}` }}
      className="block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {content}
    </Link>
  );
}
