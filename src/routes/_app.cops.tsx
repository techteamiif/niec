import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { COPS } from "@/lib/niec";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { requireEnterpriseForWrite } from "@/lib/member-write-access";

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
  const { user, profile, isStaff } = useAuth();
  const [joined, setJoined] = useState<Set<string>>(new Set());

  const load = async () => {
    const { data, error } = await supabase.from("cop_memberships").select("cop, member_id");
    if (error) {
      toast.error(`Could not load CoP memberships: ${error.message}`);
      return;
    }
    const j = new Set<string>();
    (data ?? []).forEach((r) => {
      if (r.member_id === user?.id) j.add(r.cop);
    });
    setJoined(j);
  };
  useEffect(() => { load(); }, [user]);

  const toggle = async (cop: (typeof COPS)[number]["key"]) => {
    if (!user) return;
    if (!requireEnterpriseForWrite(profile?.membership_tier, isStaff)) return;
    if (joined.has(cop)) {
      await supabase.from("cop_memberships").delete().eq("member_id", user.id).eq("cop", cop);
      toast.success("Left CoP");
    } else {
      const { error } = await supabase.from("cop_memberships").insert({ member_id: user.id, cop });
      if (error) return toast.error(error.message);
      toast.success("Joined CoP");
    }
    load();
  };

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-6">
        <h1 className="font-display text-3xl">Communities of Practice</h1>
        <p className="text-sm text-muted-foreground">Specialist working groups within NIEC. Open a CoP to see its feed, working groups, events, and leaderboard.</p>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-primary text-primary-foreground">
            <tr>
              <th className="border border-border/50 px-3 py-2.5 font-semibold">Community of Practice</th>
              <th className="border border-border/50 px-3 py-2.5 font-semibold">Manager</th>
              <th className="border border-border/50 px-3 py-2.5 font-semibold">Mandate</th>
            </tr>
          </thead>
          <tbody>
            {COPS.map((c) => {
              const isIn = joined.has(c.key);
              return (
                <tr key={c.key} className="odd:bg-card even:bg-muted/30">
                  <td className="w-[30%] border border-border p-3 align-top">
                    <h2 className="font-semibold text-primary">{c.name}</h2>
                    {"subgroups" in c && (
                      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm">
                        {c.subgroups.map((subgroup) => <li key={subgroup}>{subgroup}</li>)}
                      </ul>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggle(c.key)}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold ${isIn ? "border bg-background hover:bg-muted" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
                      >
                        {isIn ? "Leave" : "Join"}
                      </button>
                      <Link
                        to="/cops/$cop"
                        params={{ cop: c.key }}
                        className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                      >
                        Open <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </td>
                  <td className="border border-border p-3 align-top">
                    {c.manager.map((manager) => <div key={manager}>{manager}</div>)}
                  </td>
                  <td className="border border-border p-3 align-top">{c.mandate}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
