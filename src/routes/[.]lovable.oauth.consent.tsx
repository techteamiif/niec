import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NiecLogo } from "@/components/brand/NiecLogo";

type OAuthDetails = {
  client?: { name?: string | null; client_uri?: string | null } | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
};

const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { next: location.pathname + location.searchStr } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md rounded-xl border bg-card p-6 text-sm">
        Could not load this authorization request: {String((error as Error)?.message ?? error)}
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "an application";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) { setBusy(false); setError(error.message); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("No redirect returned by the authorization server."); return; }
    window.location.href = target;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-soft">
        <NiecLogo variant="horizontal" theme="light" size={36} />
        <h1 className="mt-6 font-display text-2xl tracking-tight">
          Connect {clientName} to your NIEC account
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {clientName} will be able to read and act in NIEC Connect as you — your profile, community
          feed, events, knowledge resources and Deal Room access, within your membership tier.
        </p>
        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
        <div className="mt-7 flex gap-3">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="h-11 flex-1 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "Please wait…" : "Approve"}
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="h-11 flex-1 rounded-lg border text-sm font-medium transition hover:bg-muted disabled:opacity-60"
          >
            Deny
          </button>
        </div>
      </div>
    </main>
  );
}
