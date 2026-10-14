import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, Download, FileText, Share2 } from "lucide-react";
import { RichTextContent } from "@/components/RichTextContent";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { tierMeets, TIER_LABELS } from "@/lib/niec";
import { UserAvatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type KnowledgeResource = Database["public"]["Tables"]["knowledge_resources"]["Row"];
type ResourceAuthor = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "full_name" | "organisation_name" | "avatar_url"
>;

export const Route = createFileRoute("/_app/knowledge/$resourceId")({
  component: KnowledgeResourcePage,
});

function KnowledgeResourcePage() {
  const { resourceId } = Route.useParams();
  const { profile, isStaff } = useAuth();
  const [resource, setResource] = useState<KnowledgeResource | null>(null);
  const [author, setAuthor] = useState<ResourceAuthor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setResource(null);
    setAuthor(null);

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

      if (data?.uploaded_by) {
        const { data: authorData, error: authorError } = await supabase
          .from("profiles")
          .select("id, full_name, organisation_name, avatar_url")
          .eq("id", data.uploaded_by)
          .maybeSingle();

        if (!active) return;
        if (authorError) toast.error(`Could not load author: ${authorError.message}`);
        setAuthor(authorData);
      }
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

  const share = async () => {
    if (!resource) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: resource.title, url: window.location.href });
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Could not share this resource.");
    }
  };

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
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(270px,1fr)]">
          <article className="min-w-0 rounded-2xl border bg-card p-6 lg:p-8">
            <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl">
              {resource.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-muted-foreground">
              <span className="font-medium text-primary">Published</span>
              <span aria-hidden="true">·</span>
              <time dateTime={resource.created_at}>
                {format(new Date(resource.created_at), "yyyy-MM-dd")}
              </time>
              <span className="ml-1 rounded-full bg-sky-100 px-3 py-1 text-xs font-medium capitalize text-sky-800">
                {resource.resource_type.replace(/_/g, " ")}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 border-b pb-5">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f5f5f5] px-3 py-1 text-xs font-medium text-muted-foreground">
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                {resource.downloads_count ?? 0}{" "}
                {(resource.downloads_count ?? 0) === 1 ? "download" : "downloads"}
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={() => void share()}>
                <Share2 aria-hidden="true" /> Share
              </Button>
            </div>

            <section className="pt-6">
              {resource.cover_image_url && (
                <img
                  src={resource.cover_image_url}
                  alt={`${resource.title} cover`}
                  className="mb-6 max-h-[28rem] w-full rounded-lg object-cover"
                />
              )}
              <h2 className="font-semibold">Abstract</h2>
              {resource.description ? (
                <RichTextContent
                  content={resource.description}
                  className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-foreground/85 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-xl [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:font-semibold [&_li]:ml-6 [&_ol]:my-3 [&_ol]:list-decimal [&_p]:mb-3 [&_ul]:my-3 [&_ul]:list-disc"
                />
              ) : (
                <p className="mt-3 text-[15px] leading-7 text-foreground/85">
                  No description is available for this resource yet.
                </p>
              )}
            </section>

            <section className="mt-8 border-t pt-6">
              {!unlocked && (
                <p className="mb-4 rounded-md border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
                  Downloads require <strong>{TIER_LABELS[resource.min_tier_required]}</strong> tier.
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void download(resource.executive_summary_url)}
                >
                  <Download aria-hidden="true" /> Download executive summary
                </Button>
                <Button
                  type="button"
                  className="bg-[#003302] text-white hover:bg-[#003302]/90"
                  onClick={() => void download(resource.file_url)}
                >
                  <FileText aria-hidden="true" /> Download PDF
                </Button>
              </div>
            </section>
          </article>

          <aside className="rounded-2xl border bg-card p-6 text-center">
            <h2 className="text-base font-medium">About this Author</h2>
            <div className="mt-6 flex justify-center">
              {author ? (
                <Link
                  to="/member/$memberId"
                  params={{ memberId: author.id }}
                  aria-label={`View ${author.organisation_name || author.full_name}'s profile`}
                >
                  <UserAvatar
                    name={author.organisation_name || author.full_name}
                    src={author.avatar_url}
                    size={104}
                    className="bg-muted text-foreground"
                  />
                </Link>
              ) : (
                <div className="grid h-[104px] w-[104px] place-items-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                  NIeC
                </div>
              )}
            </div>
            <p className="mt-5 text-lg font-medium">
              {author?.organisation_name || author?.full_name || "NIeC Knowledge Team"}
            </p>
            {author?.organisation_name && author.full_name && (
              <p className="mt-1 text-sm text-muted-foreground">{author.full_name}</p>
            )}
            <div className="mt-6 border-t pt-5 text-left">
              <h3 className="text-sm font-semibold">About this resource</h3>
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Type</dt>
                  <dd className="text-right capitalize">
                    {resource.resource_type.replace(/_/g, " ")}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Community</dt>
                  <dd className="text-right capitalize">
                    {resource.community_of_practice.replace(/_/g, " ")}
                  </dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
