import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { COPS, tierMeets } from "@/lib/niec";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_app/cops")({
  component: CopsLayout,
});

function CopsLayout() {
  const matches = useMatches();
  const isChild = matches.some((m) => m.routeId.startsWith("/_app/cops/"));
  if (isChild) return <Outlet />;
  return <CopsIndex />;
}

function CopsIndex() {
  const { user, profile } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [joined, setJoined] = useState<Set<string>>(new Set());

  const load = async () => {
    const { data } = await supabase.from("cop_memberships").select("cop, member_id");
    const c: Record<string, number> = {};
    const j = new Set<string>();
    (data ?? []).forEach((r: any) => {
      c[r.cop] = (c[r.cop] ?? 0) + 1;
      if (r.member_id === user?.id) j.add(r.cop);
    });
    setCounts(c);
    setJoined(j);
  };
  useEffect(() => { load(); }, [user]);

  const toggle = async (cop: string) => {
    if (!user) return;
    if (!tierMeets(profile?.membership_tier, "contributor")) {
      toast.error("Join NIEC at Contributor tier or above to join a CoP.");
      return;
    }
    if (joined.has(cop)) {
      await supabase.from("cop_memberships").delete().eq("member_id", user.id).eq("cop", cop as any);
      toast.success("Left CoP");
    } else {
      const { error } = await supabase.from("cop_memberships").insert({ member_id: user.id, cop: cop as any });
      if (error) return toast.error(error.message);
      toast.success("Joined CoP");
    }
    load();
  };

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-6">
        <h1 className="font-display text-3xl">Communities of Practice</h1>
        <p className="text-sm text-muted-foreground">Specialist working groups within NIEC. Open a CoP to see its feed, working groups, polls, events, and leaderboard.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {COPS.map((c) => {
          const isIn = joined.has(c.key);
          return (
            <div key={c.key} className="group overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-lg">
              <div className="h-3" style={{ backgroundColor: c.color }} />
              <div className="p-6">
                <h3 className="font-display text-xl">{c.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{counts[c.key] ?? 0} members</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggle(c.key)}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold ${isIn ? "border bg-background hover:bg-muted" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
                      {isIn ? "Leave" : "Join"}
                    </button>
                    <Link to="/cops/$cop" params={{ cop: c.key }}
                      className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                      Open <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
