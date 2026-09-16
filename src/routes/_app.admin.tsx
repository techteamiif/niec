import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { TierBadge } from "@/components/TierBadge";
import { UserAvatar } from "@/components/Avatar";
import { TIER_LABELS, ORG_TYPE_LABELS } from "@/lib/niec";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { logAudit, type AuditAction } from "@/lib/audit";
import {
  Search, X, Pin, Trash2, Mail, ExternalLink, Shield,
  CheckCircle2, XCircle, UserPlus, History, Users as UsersIcon, Tag as TagIcon,
  Network, MessageSquare, Calendar, BookOpen, Briefcase, Award, Activity, Vote, Lightbulb, HeartHandshake, Plus, Pencil, Star, FileText, CreditCard,
} from "lucide-react";
import { COPS } from "@/lib/niec";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_app/admin")({
  component: AdminCRM,
});

const STAGES = [
  { key: "lead",       label: "Lead",       color: "bg-muted text-muted-foreground" },
  { key: "applicant",  label: "Applicant",  color: "bg-blue-100 text-blue-800" },
  { key: "onboarding", label: "Onboarding", color: "bg-purple-100 text-purple-800" },
  { key: "active",     label: "Active",     color: "bg-success/20 text-primary" },
  { key: "nurture",    label: "Nurture",    color: "bg-gold/25 text-gold-foreground" },
  { key: "at_risk",    label: "At risk",    color: "bg-orange-100 text-orange-800" },
  { key: "churned",    label: "Churned",    color: "bg-destructive/15 text-destructive" },
] as const;

type Profile = any;
type Role = { user_id: string; role: "member" | "admin" | "super_admin" };

function AdminCRM() {
  const { isStaff, isSuperAdmin, user } = useAuth();
  const [tab, setTab] = useState<"crm" | "applications" | "pipeline" | "cops" | "content" | "programs" | "recognition" | "audit" | "analytics">("crm");
  const [members, setMembers] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Profile | null>(null);

  const load = async () => {
    const [{ data: m }, { data: r }] = await Promise.all([
      supabase.rpc("admin_list_profiles"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setMembers((m ?? []) as Profile[]);
    setRoles(((r ?? []) as Role[]));
  };


  useEffect(() => { if (isStaff) load(); }, [isStaff]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    members.forEach((m) => (m.crm_tags ?? []).forEach((t: string) => s.add(t)));
    return Array.from(s).sort();
  }, [members]);

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (statusFilter !== "all" && m.membership_status !== statusFilter) return false;
      if (stageFilter !== "all" && m.crm_stage !== stageFilter) return false;
      if (tierFilter !== "all" && m.membership_tier !== tierFilter) return false;
      if (tagFilter !== "all" && !(m.crm_tags ?? []).includes(tagFilter)) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = `${m.full_name} ${m.email} ${m.organisation_name} ${(m.sectors ?? []).join(" ")} ${(m.crm_tags ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [members, search, stageFilter, statusFilter, tierFilter, tagFilter]);

  const counts = useMemo(() => {
    const c = { pending: 0, active: 0, lapsed: 0, suspended: 0, total: members.length };
    members.forEach((m) => { if (m.membership_status in c) (c as any)[m.membership_status]++; });
    return c;
  }, [members]);

  if (!isStaff) return <div className="p-10 text-center text-muted-foreground">Admin access required.</div>;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <header className="border-b bg-card px-6 py-4 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl">NIEC CRM &amp; Admin Console</h1>
            <p className="text-xs text-muted-foreground">Manage members, pipeline, role assignments and platform activity.</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Stat label="Total" value={counts.total} />
            <Stat label="Pending" value={counts.pending} tone="bg-blue-100 text-blue-800" />
            <Stat label="Active" value={counts.active} tone="bg-success/20 text-primary" />
            <Stat label="Suspended" value={counts.suspended} tone="bg-destructive/15 text-destructive" />
          </div>
        </div>
        <nav className="mt-4 flex flex-wrap gap-1 rounded-lg border bg-background p-1 text-sm">
          {([
            { k: "crm", label: "CRM", icon: UsersIcon },
            { k: "applications", label: "Applications", icon: FileText },
            { k: "pipeline", label: `Pipeline (${counts.pending})`, icon: UserPlus },
            { k: "cops", label: "CoP Health", icon: Network },
            { k: "content", label: "Content", icon: MessageSquare },
            { k: "programs", label: "Programs", icon: Calendar },
            { k: "recognition", label: "Recognition", icon: Award },
            { k: "audit", label: "Audit log", icon: History },
            { k: "analytics", label: "Analytics", icon: Activity },
          ] as const).map(({ k, label, icon: Icon }) => (
            <button key={k} onClick={() => setTab(k)}
              className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 ${tab === k ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </nav>
      </header>

      <div className="flex flex-1 min-h-0">
        {tab === "crm" && (
          <>
            <aside className="hidden w-64 shrink-0 overflow-y-auto border-r bg-card/40 p-4 lg:block">
              <FilterGroup title="Pipeline stage">
                <FilterPill active={stageFilter === "all"} onClick={() => setStageFilter("all")} label="All stages" />
                {STAGES.map((s) => (
                  <FilterPill key={s.key} active={stageFilter === s.key} onClick={() => setStageFilter(s.key)} label={s.label} />
                ))}
              </FilterGroup>
              <FilterGroup title="Status">
                {["all","pending","active","lapsed","suspended"].map((s) => (
                  <FilterPill key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)} label={s} />
                ))}
              </FilterGroup>
              <FilterGroup title="Tier">
                <FilterPill active={tierFilter === "all"} onClick={() => setTierFilter("all")} label="All tiers" />
                {Object.entries(TIER_LABELS).map(([k, v]) => (
                  <FilterPill key={k} active={tierFilter === k} onClick={() => setTierFilter(k)} label={v} />
                ))}
              </FilterGroup>
              {allTags.length > 0 && (
                <FilterGroup title="Tags">
                  <FilterPill active={tagFilter === "all"} onClick={() => setTagFilter("all")} label="All tags" />
                  {allTags.map((t) => (
                    <FilterPill key={t} active={tagFilter === t} onClick={() => setTagFilter(t)} label={t} />
                  ))}
                </FilterGroup>
              )}
            </aside>

            <div className="flex flex-1 min-w-0 flex-col">
              <div className="flex items-center gap-2 border-b bg-card px-4 py-3">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, organisation, tag…"
                    className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm" />
                </div>
                <span className="text-xs text-muted-foreground">{filtered.length} result{filtered.length === 1 ? "" : "s"}</span>
                <BroadcastButton recipientIds={filtered.map((m) => m.id)} label={`Broadcast to ${filtered.length}`} />
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 border-b bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="p-3">Member</th>
                      <th className="p-3">Organisation</th>
                      <th className="p-3">Stage</th>
                      <th className="p-3">Tier</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((m) => {
                      const stage = STAGES.find((s) => s.key === m.crm_stage) ?? STAGES[0];
                      return (
                        <tr key={m.id} onClick={() => setSelected(m)}
                          className="cursor-pointer border-b transition hover:bg-muted/40">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <UserAvatar name={m.full_name || m.email} src={m.avatar_url} size={32} />
                              <div className="min-w-0">
                                <div className="truncate font-medium">{m.full_name || "—"}</div>
                                <div className="truncate text-xs text-muted-foreground">{m.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            <div className="truncate">{m.organisation_name || "—"}</div>
                            <div className="text-[11px]">{ORG_TYPE_LABELS[m.organisation_type] ?? ""}</div>
                          </td>
                          <td className="p-3"><span className={`rounded px-2 py-0.5 text-[11px] ${stage.color}`}>{stage.label}</span></td>
                          <td className="p-3"><TierBadge tier={m.membership_tier} /></td>
                          <td className="p-3"><span className="rounded bg-muted px-2 py-0.5 text-[11px]">{m.membership_status}</span></td>
                          <td className="p-3 text-xs text-muted-foreground">{format(new Date(m.joined_at), "PP")}</td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr><td colSpan={6} className="p-10 text-center text-sm text-muted-foreground">No members match these filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === "applications" && <ApplicationsTab members={members} />}
        {tab === "pipeline" && <PipelineBoard members={members} actor={user!.id} onChange={load} />}
        {tab === "cops" && <CopHealthTab members={members} />}
        {tab === "content" && <ContentTab actor={user!.id} />}
        {tab === "programs" && <ProgramsTab />}
        {tab === "recognition" && <RecognitionTab actor={user!.id} members={members} />}
        {tab === "audit" && <AuditLog />}
        {tab === "analytics" && <AnalyticsTab members={members} />}
      </div>

      {selected && (
        <MemberDrawer
          member={selected}
          roles={roles.filter((r) => r.user_id === selected.id).map((r) => r.role)}
          isSuperAdmin={isSuperAdmin}
          actorId={user!.id}
          onClose={() => setSelected(null)}
          onChanged={() => { load(); setSelected((cur: Profile | null) => cur ? { ...cur } : null); }}
        />
      )}
    </div>
  );
}

/* ---------- helpers ---------- */

function Stat({ label, value, tone = "bg-muted" }: { label: string; value: number; tone?: string }) {
  return (
    <div className={`rounded-md ${tone} px-3 py-1.5`}>
      <span className="font-semibold">{value}</span> <span className="text-[10px] uppercase tracking-wider opacity-80">{label}</span>
    </div>
  );
}
function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}
function FilterPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      className={`rounded-md px-2 py-1 text-left text-xs capitalize transition ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
      {label}
    </button>
  );
}

/* ---------- Pipeline (kanban-lite) ---------- */

function PipelineBoard({ members, actor, onChange }: { members: Profile[]; actor: string; onChange: () => void }) {
  const pending = members.filter((m) => m.membership_status === "pending");

  const approve = async (p: Profile) => {
    const tier = (p.application_data?.requested_tier as string)
      || (p.application_data?.proposed_tier as string)
      || "contributor";
    const { error } = await supabase.from("profiles").update({
      membership_status: "active", approved_at: new Date().toISOString(), approved_by: actor,
      membership_tier: tier as any, crm_stage: "onboarding",
    }).eq("id", p.id);
    if (error) return toast.error(error.message);
    await supabase.from("notifications").insert([
      {
        recipient_id: p.id, type: "tier_upgrade",
        title: "Welcome to NIEC", message: `Your membership has been approved at the ${TIER_LABELS[tier] ?? tier} tier.`,
        link: "/dashboard",
      },
      {
        recipient_id: p.id, type: "welcome",
        title: "Complete your profile", message: "Add your bio, sectors and SDG focus so we can match you with peers and opportunities.",
        link: "/profile",
      },
    ]);
    await logAudit({ actorId: actor, action: "member.approve", targetType: "profile", targetId: p.id, metadata: { tier } });
    toast.success("Member approved"); onChange();
  };
  const reject = async (p: Profile) => {
    const { error } = await supabase.from("profiles").update({ membership_status: "suspended", crm_stage: "churned" }).eq("id", p.id);
    if (error) return toast.error(error.message);
    await logAudit({ actorId: actor, action: "member.reject", targetType: "profile", targetId: p.id });
    toast.success("Application rejected"); onChange();
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <h2 className="mb-4 font-display text-xl">Onboarding pipeline</h2>
      {pending.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">No pending applications.</div>
      ) : (
        <div className="grid gap-3">
          {pending.map((p) => {
            const reqTier = (p.application_data?.requested_tier as string) || (p.application_data?.proposed_tier as string);
            return (
            <div key={p.id} className="flex items-center gap-4 rounded-xl border bg-card p-4">
              <UserAvatar name={p.full_name || p.email} src={p.avatar_url} size={40} />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{p.full_name || "(no name)"}</div>
                <div className="text-xs text-muted-foreground">
                  {p.email} · {p.organisation_name || "—"} · applied {formatDistanceToNow(new Date(p.joined_at), { addSuffix: true })}
                </div>
                {reqTier && (
                  <div className="mt-1 text-[11px] text-muted-foreground">Requested tier: <b>{TIER_LABELS[reqTier] ?? reqTier}</b></div>
                )}
              </div>
              <button onClick={() => approve(p)} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                <CheckCircle2 className="h-3 w-3" /> Approve
              </button>
              <button onClick={() => reject(p)} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs hover:bg-muted">
                <XCircle className="h-3 w-3" /> Reject
              </button>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- Audit log ---------- */

function AuditLog() {
  const [rows, setRows] = useState<any[]>([]);
  const [actors, setActors] = useState<Record<string, any>>({});
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(500);
      setRows(data ?? []);
      const ids = Array.from(new Set([
        ...(data ?? []).map((r: any) => r.actor_id),
        ...(data ?? []).map((r: any) => r.target_id).filter(Boolean),
      ]));
      if (ids.length) {
        const { data: ps } = await supabase.rpc("admin_get_profiles", { _ids: ids });
        const map: any = {};
        (ps ?? []).forEach((p: any) => { map[p.id] = p; });
        setActors(map);
      }
    })();
  }, []);
  return (
    <div className="flex-1 overflow-auto p-6">
      <h2 className="mb-4 font-display text-xl">Audit log</h2>
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-3">When</th><th className="p-3">Actor</th><th className="p-3">Action</th><th className="p-3">Target</th><th className="p-3">Details</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</td>
                <td className="p-3 text-xs">{actors[r.actor_id]?.full_name ?? r.actor_id.slice(0, 8)}</td>
                <td className="p-3"><code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{r.action}</code></td>
                <td className="p-3 text-xs">{r.target_id ? (actors[r.target_id]?.full_name ?? r.target_type + " · " + r.target_id.slice(0, 8)) : r.target_type}</td>
                <td className="p-3 text-[11px] text-muted-foreground"><code>{JSON.stringify(r.metadata)}</code></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-sm text-muted-foreground">No audit entries yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Analytics tab ---------- */

function AnalyticsTab({ members }: { members: Profile[] }) {
  const tierCounts: Record<string, number> = {};
  const stageCounts: Record<string, number> = {};
  members.forEach((m) => {
    tierCounts[m.membership_tier] = (tierCounts[m.membership_tier] ?? 0) + 1;
    stageCounts[m.crm_stage] = (stageCounts[m.crm_stage] ?? 0) + 1;
  });
  return (
    <div className="flex-1 overflow-auto p-6">
      <h2 className="mb-4 font-display text-xl">Membership snapshot</h2>
      <div className="grid gap-4 md:grid-cols-5">
        {Object.entries(TIER_LABELS).map(([k, label]) => (
          <div key={k} className="rounded-xl border bg-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className="mt-2 font-display text-3xl">{tierCounts[k] ?? 0}</div>
          </div>
        ))}
      </div>
      <h2 className="mb-4 mt-8 font-display text-xl">Pipeline distribution</h2>
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
        {STAGES.map((s) => (
          <div key={s.key} className="rounded-xl border bg-card p-5">
            <span className={`inline-block rounded px-2 py-0.5 text-[11px] ${s.color}`}>{s.label}</span>
            <div className="mt-2 font-display text-3xl">{stageCounts[s.key] ?? 0}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Member detail drawer ---------- */

function MemberDrawer({
  member, roles, isSuperAdmin, actorId, onClose, onChanged,
}: {
  member: Profile;
  roles: ("member" | "admin" | "super_admin")[];
  isSuperAdmin: boolean;
  actorId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [notes, setNotes] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [memberCops, setMemberCops] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [badgeLabel, setBadgeLabel] = useState("");
  const [tags, setTags] = useState<string[]>(member.crm_tags ?? []);
  const [stage, setStage] = useState<string>(member.crm_stage ?? "lead");
  const [tier, setTier] = useState<string>(member.membership_tier);
  const [status, setStatus] = useState<string>(member.membership_status);

  const reloadBadges = async () => {
    const { data } = await supabase.from("member_badges").select("*").eq("user_id", member.id).order("awarded_at", { ascending: false });
    setBadges(data ?? []);
  };

  useEffect(() => {
    setTags(member.crm_tags ?? []);
    setStage(member.crm_stage ?? "lead");
    setTier(member.membership_tier);
    setStatus(member.membership_status);
    (async () => {
      const [{ data: n }, { data: a }, { data: b }, { data: cm }, { data: bk }] = await Promise.all([
        supabase.from("member_notes").select("*").eq("member_id", member.id).order("pinned", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("admin_audit_log").select("*").eq("target_id", member.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("member_badges").select("*").eq("user_id", member.id).order("awarded_at", { ascending: false }),
        supabase.from("cop_memberships").select("cop, joined_at").eq("member_id", member.id),
        supabase.from("mentorship_bookings").select("id, topic, status, mentor_id, requester_id, created_at").or(`mentor_id.eq.${member.id},requester_id.eq.${member.id}`).order("created_at", { ascending: false }).limit(20),
      ]);
      setNotes(n ?? []); setAudit(a ?? []); setBadges(b ?? []); setMemberCops(cm ?? []); setBookings(bk ?? []);
    })();
  }, [member.id]);

  const updateProfile = async (patch: Record<string, any>, action: AuditAction, metadata?: any) => {
    const { error } = await supabase.from("profiles").update(patch as any).eq("id", member.id);
    if (error) return toast.error(error.message);
    await logAudit({ actorId, action, targetType: "profile", targetId: member.id, metadata });
    toast.success("Saved"); onChanged();
  };

  const saveStage = async (val: string) => { setStage(val); await updateProfile({ crm_stage: val }, "member.stage_change", { from: member.crm_stage, to: val }); };
  const saveTier = async (val: string) => { setTier(val); await updateProfile({ membership_tier: val as any }, "member.tier_change", { from: member.membership_tier, to: val }); };
  const saveStatus = async (val: string) => {
    setStatus(val);
    await updateProfile({ membership_status: val as any },
      val === "suspended" ? "member.suspend" : "member.reactivate",
      { from: member.membership_status, to: val });
  };

  const addTag = async () => {
    const t = tagDraft.trim();
    if (!t || tags.includes(t)) return;
    const next = [...tags, t];
    setTags(next); setTagDraft("");
    await updateProfile({ crm_tags: next }, "member.tags_change", { added: t });
  };
  const removeTag = async (t: string) => {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    await updateProfile({ crm_tags: next }, "member.tags_change", { removed: t });
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    const { data, error } = await supabase.from("member_notes").insert({
      member_id: member.id, author_id: actorId, body: newNote.trim(),
    }).select().single();
    if (error) return toast.error(error.message);
    setNotes((p) => [data as any, ...p]); setNewNote("");
    await logAudit({ actorId, action: "note.create", targetType: "note", targetId: (data as any).id, metadata: { member_id: member.id } });
  };
  const togglePin = async (n: any) => {
    const { error } = await supabase.from("member_notes").update({ pinned: !n.pinned }).eq("id", n.id);
    if (error) return toast.error(error.message);
    setNotes((p) => p.map((x) => x.id === n.id ? { ...x, pinned: !x.pinned } : x).sort((a, b) => Number(b.pinned) - Number(a.pinned)));
  };
  const deleteNote = async (n: any) => {
    if (!confirm("Delete this note?")) return;
    const { error } = await supabase.from("member_notes").delete().eq("id", n.id);
    if (error) return toast.error(error.message);
    setNotes((p) => p.filter((x) => x.id !== n.id));
    await logAudit({ actorId, action: "note.delete", targetType: "note", targetId: n.id, metadata: { member_id: member.id } });
  };

  const toggleRole = async (role: "admin" | "super_admin") => {
    const has = roles.includes(role);
    if (has) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", member.id).eq("role", role);
      if (error) return toast.error(error.message);
      await logAudit({ actorId, action: "role.revoke", targetType: "user_role", targetId: member.id, metadata: { role } });
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: member.id, role });
      if (error) return toast.error(error.message);
      await logAudit({ actorId, action: "role.grant", targetType: "user_role", targetId: member.id, metadata: { role } });
    }
    toast.success("Role updated"); onChanged();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <aside onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-card shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b p-5">
          <div className="flex items-start gap-3">
            <UserAvatar name={member.full_name || member.email} src={member.avatar_url} size={56} />
            <div>
              <h2 className="font-display text-xl">{member.full_name || "(no name)"}</h2>
              <div className="text-sm text-muted-foreground">{member.email}</div>
              <div className="text-xs text-muted-foreground">{member.organisation_name} · {ORG_TYPE_LABELS[member.organisation_type] ?? ""}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {roles.map((r) => <span key={r} className="rounded bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">{r.replace("_", " ")}</span>)}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid gap-3 border-b p-5 sm:grid-cols-3">
          <Pick label="Stage" value={stage} onChange={saveStage}
            options={STAGES.map((s) => ({ value: s.key, label: s.label }))} />
          <Pick label="Tier" value={tier} onChange={saveTier}
            options={Object.entries(TIER_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
          <Pick label="Status" value={status} onChange={saveStatus}
            options={["pending","active","lapsed","suspended"].map((s) => ({ value: s, label: s }))} />
        </div>

        <Section title="Tags" icon={TagIcon}>
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                {t}
                <button onClick={() => removeTag(t)} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              placeholder="Add a tag (e.g. VIP, funder, mentor)…"
              className="h-9 flex-1 rounded-md border bg-background px-3 text-sm" />
            <button onClick={addTag} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Add</button>
          </div>
        </Section>

        {isSuperAdmin && (
          <Section title="Role management" icon={Shield}>
            <div className="flex flex-wrap gap-2">
              {(["admin","super_admin"] as const).map((r) => {
                const has = roles.includes(r);
                return (
                  <button key={r} onClick={() => toggleRole(r)}
                    className={`rounded-md border px-3 py-1.5 text-xs ${has ? "border-destructive bg-destructive/10 text-destructive" : "hover:bg-muted"}`}>
                    {has ? `Revoke ${r.replace("_", " ")}` : `Grant ${r.replace("_", " ")}`}
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        <Section title="Private staff notes">
          <div className="space-y-2">
            <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} rows={2} placeholder="Add a CRM note…"
              className="w-full rounded-md border bg-background p-2 text-sm" />
            <div className="flex justify-end"><button onClick={addNote} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Add note</button></div>
          </div>
          <div className="mt-3 space-y-2">
            {notes.map((n) => (
              <div key={n.id} className={`rounded-md border p-3 text-sm ${n.pinned ? "border-gold/50 bg-gold/10" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="whitespace-pre-wrap">{n.body}</p>
                  <div className="flex gap-1">
                    <button onClick={() => togglePin(n)} className="rounded p-1 text-muted-foreground hover:bg-muted"><Pin className="h-3.5 w-3.5" /></button>
                    <button onClick={() => deleteNote(n)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div>
              </div>
            ))}
            {notes.length === 0 && <div className="text-xs text-muted-foreground">No notes yet.</div>}
          </div>
        </Section>

        <Section title="Activity timeline" icon={History}>
          <div className="space-y-2">
            {audit.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border p-2 text-xs">
                <code className="rounded bg-muted px-1.5 py-0.5">{a.action}</code>
                <span className="text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
              </div>
            ))}
            {audit.length === 0 && <div className="text-xs text-muted-foreground">No activity logged.</div>}
          </div>
        </Section>

        <Section title="Engagement & CoPs" icon={Network}>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md border p-2"><div className="font-display text-xl">{member.engagement_score ?? 0}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</div></div>
            <div className="rounded-md border p-2"><div className="font-display text-xl">{memberCops.length}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">CoPs</div></div>
            <div className="rounded-md border p-2"><div className="font-display text-xl">{bookings.length}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Mentor sessions</div></div>
          </div>
          {memberCops.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {memberCops.map((c) => {
                const meta = COPS.find((x) => x.key === c.cop);
                return <span key={c.cop} className="rounded-full bg-accent px-2 py-0.5 text-[10px]" style={{ borderLeft: `3px solid ${meta?.color}` }}>{meta?.name ?? c.cop}</span>;
              })}
            </div>
          )}
        </Section>

        <Section title="Badges" icon={Award}>
          <div className="flex flex-wrap gap-1">
            {badges.length === 0 && <span className="text-xs text-muted-foreground">No badges yet.</span>}
            {badges.map((b) => (
              <span key={b.id} className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-2 py-0.5 text-[11px] text-gold-foreground">
                {b.label}
                <button onClick={async () => {
                  if (!confirm(`Revoke "${b.label}"?`)) return;
                  await supabase.from("member_badges").delete().eq("id", b.id);
                  await logAudit({ actorId, action: "note.delete", targetType: "profile", targetId: member.id, metadata: { badge: b.badge_key } });
                  reloadBadges();
                }} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input value={badgeLabel} onChange={(e) => setBadgeLabel(e.target.value)} placeholder="Award custom badge (e.g. Champion 2026)"
              className="h-9 flex-1 rounded-md border bg-background px-3 text-sm" />
            <button onClick={async () => {
              const label = badgeLabel.trim();
              if (!label) return;
              const key = label.toLowerCase().replace(/\s+/g, "_");
              const { error } = await supabase.from("member_badges").insert({ user_id: member.id, badge_key: key, label, awarded_by: actorId });
              if (error) return toast.error(error.message);
              await logAudit({ actorId, action: "note.create", targetType: "profile", targetId: member.id, metadata: { badge: key } });
              setBadgeLabel(""); reloadBadges(); toast.success("Badge awarded");
            }} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Award</button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["ESO Champion","NIIRIC Contributor","GIIS Advocate","Deal Maker","ACII 2026 Founding Member","Climate Finance Leader"].map((s) => (
              <button key={s} type="button" onClick={() => setBadgeLabel(s)}
                className="rounded-full border border-dashed px-2 py-0.5 text-[10px] text-muted-foreground hover:border-primary hover:text-primary">
                + {s}
              </button>
            ))}
          </div>

        </Section>

        <Section title="Send a message" icon={MessageSquare}>
          <AdminSendMessage recipientId={member.id} actorId={actorId} onSent={onChanged} />
        </Section>

        <Section title="Send a notification" icon={Mail}>
          <AdminSendNotification recipientIds={[member.id]} onSent={onChanged} />
        </Section>

        <Section title="Quick actions">
          <div className="flex flex-wrap gap-2">
            <a href={`mailto:${member.email}`} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs hover:bg-muted">
              <Mail className="h-3 w-3" /> Email
            </a>
            {member.linkedin_url && (
              <a href={member.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs hover:bg-muted">
                <ExternalLink className="h-3 w-3" /> LinkedIn
              </a>
            )}
            <a href={`/messages?to=${member.id}`} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs hover:bg-muted">
              <Mail className="h-3 w-3" /> Open DM
            </a>
          </div>
        </Section>
      </aside>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon?: any; children: React.ReactNode }) {
  return (
    <section className="border-b p-5">
      <h3 className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />} {title}
      </h3>
      {children}
    </section>
  );
}

function Pick({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="block text-xs">
      <div className="mb-1 font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded-md border bg-background px-2 capitalize">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

/* ---------- CoP Health ---------- */

function CopHealthTab({ members }: { members: Profile[] }) {
  const [stats, setStats] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 30 * 86400_000).toISOString();
      const out: any[] = [];
      for (const cop of COPS) {
        const [{ count: posts }, { count: rfcs }, { count: wgs }, { count: polls }, { data: cm }] = await Promise.all([
          supabase.from("community_posts").select("id", { count: "exact", head: true }).eq("community_of_practice", cop.key as any).gte("created_at", since),
          supabase.from("rfcs").select("id", { count: "exact", head: true }).eq("cop", cop.key as any).eq("status", "open" as any),
          supabase.from("working_groups").select("id", { count: "exact", head: true }).eq("cop", cop.key as any).eq("status", "active" as any),
          supabase.from("polls").select("id", { count: "exact", head: true }).eq("cop", cop.key as any),
          supabase.from("cop_memberships").select("member_id").eq("cop", cop.key as any),
        ]);
        out.push({ cop, posts: posts ?? 0, rfcs: rfcs ?? 0, wgs: wgs ?? 0, polls: polls ?? 0, members: cm?.length ?? 0 });
      }
      setStats(out);
    })();
  }, []);

  const champions = members.filter((m) => (m.engagement_score ?? 0) >= 100).length;
  const atRisk = members.filter((m) => m.membership_status === "active" && m.last_active_at && (Date.now() - new Date(m.last_active_at).getTime()) > 60 * 86400_000).length;
  const fresh = members.filter((m) => (Date.now() - new Date(m.joined_at).getTime()) < 14 * 86400_000).length;

  return (
    <div className="flex-1 overflow-auto p-6">
      <h2 className="mb-1 font-display text-xl">Community of Practice health</h2>
      <p className="mb-5 text-xs text-muted-foreground">Activity in the last 30 days. Open RFCs and active working groups are lifetime.</p>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Champions (≥100 pts)" value={champions} tone="bg-gold/25 text-gold-foreground" />
        <Stat label="At risk (60d inactive)" value={atRisk} tone="bg-orange-100 text-orange-800" />
        <Stat label="New (last 14d)" value={fresh} tone="bg-blue-100 text-blue-800" />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-3">CoP</th><th className="p-3">Members</th><th className="p-3">Posts (30d)</th><th className="p-3">Open RFCs</th><th className="p-3">Working groups</th><th className="p-3">Polls</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.cop.key} className="border-b last:border-0">
                <td className="p-3"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: s.cop.color }} />{s.cop.name}</span></td>
                <td className="p-3">{s.members}</td>
                <td className="p-3">{s.posts}</td>
                <td className="p-3">{s.rfcs}</td>
                <td className="p-3">{s.wgs}</td>
                <td className="p-3">{s.polls}</td>
                <td className="p-3"><a href={`/cops/${s.cop.key}`} className="text-xs text-primary hover:underline">Open →</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Content moderation ---------- */

function ContentTab({ actor }: { actor: string }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [rfcs, setRfcs] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [authors, setAuthors] = useState<Record<string, any>>({});
  const [editPost, setEditPost] = useState<any | null>(null);
  const [editRfc, setEditRfc] = useState<any | null>(null);

  const load = async () => {
    const [{ data: p }, { data: r }, { data: po }] = await Promise.all([
      supabase.from("community_posts").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("rfcs").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("polls").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setPosts(p ?? []); setRfcs(r ?? []); setPolls(po ?? []);
    const ids = Array.from(new Set([
      ...(p ?? []).map((x: any) => x.author_id),
      ...(r ?? []).map((x: any) => x.author_id),
      ...(po ?? []).map((x: any) => x.created_by),
    ].filter(Boolean)));
    if (ids.length) {
      const { data: prof } = await supabase.rpc("admin_get_profiles", { _ids: ids });
      const map: any = {}; (prof ?? []).forEach((x: any) => { map[x.id] = x; }); setAuthors(map);
    }
  };
  useEffect(() => { load(); }, []);

  const removePost = async (p: any) => {
    if (!confirm(`Delete post "${p.title}"?`)) return;
    const { error } = await supabase.from("community_posts").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    await logAudit({ actorId: actor, action: "note.delete", targetType: "profile", targetId: p.author_id, metadata: { post_id: p.id, title: p.title } });
    toast.success("Removed"); load();
  };
  const togglePin = async (p: any) => {
    await supabase.from("community_posts").update({ is_pinned: !p.is_pinned }).eq("id", p.id);
    load();
  };
  const setRfcStatus = async (r: any, status: string) => {
    const { error } = await supabase.from("rfcs").update({ status: status as any }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${status}`); load();
  };
  const removeRfc = async (r: any) => {
    if (!confirm(`Delete proposal "${r.title}"?`)) return;
    const { error } = await supabase.from("rfcs").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };
  const togglePoll = async (p: any) => {
    const closed = p.closes_at && new Date(p.closes_at).getTime() < Date.now();
    await supabase.from("polls").update({ closes_at: closed ? null : new Date().toISOString() }).eq("id", p.id);
    load();
  };
  const removePoll = async (p: any) => {
    if (!confirm(`Delete poll "${p.question}"?`)) return;
    const { error } = await supabase.from("polls").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  return (
    <div className="flex-1 overflow-auto p-6 space-y-8">
      <section>
        <h2 className="mb-3 font-display text-xl inline-flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Recent posts ({posts.length})</h2>
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3">Title</th><th className="p-3">Author</th><th className="p-3">CoP</th><th className="p-3">Engagement</th><th className="p-3">When</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="p-3"><div className="font-medium">{p.is_pinned && "📌 "}{p.title}</div><div className="text-[11px] text-muted-foreground line-clamp-1">{p.content}</div></td>
                  <td className="p-3 text-xs">{authors[p.author_id]?.full_name ?? "—"}</td>
                  <td className="p-3 text-xs">{COPS.find((c) => c.key === p.community_of_practice)?.name ?? p.community_of_practice}</td>
                  <td className="p-3 text-xs">❤ {p.likes_count} · 💬 {p.comments_count}</td>
                  <td className="p-3 text-xs text-muted-foreground">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</td>
                  <td className="p-3 text-right"><div className="flex justify-end gap-1">
                    <button onClick={() => togglePin(p)} className="rounded p-1 hover:bg-muted" title="Pin"><Pin className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setEditPost(p)} className="rounded p-1 hover:bg-muted" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => removePost(p)} className="rounded p-1 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div></td>
                </tr>
              ))}
              {posts.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-xs text-muted-foreground">No posts yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl inline-flex items-center gap-2"><Lightbulb className="h-5 w-5" /> RFC proposals ({rfcs.length})</h2>
        <div className="grid gap-2">
          {rfcs.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border bg-card p-4 gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{r.title}</div>
                <div className="text-[11px] text-muted-foreground">{authors[r.author_id]?.full_name ?? "—"} · {COPS.find((c) => c.key === r.cop)?.name ?? r.cop} · <span className="uppercase">{r.status}</span></div>
              </div>
              <select value={r.status} onChange={(e) => setRfcStatus(r, e.target.value)} className="h-7 rounded border bg-background px-2 text-xs">
                <option value="open">open</option>
                <option value="under_review">under_review</option>
                <option value="accepted">accepted</option>
                <option value="rejected">rejected</option>
                <option value="archived">archived</option>
              </select>
              <button onClick={() => setEditRfc(r)} className="rounded p-1 hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={() => removeRfc(r)} className="rounded p-1 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
              <a href={`/cops/${r.cop}`} className="text-xs text-primary hover:underline">Open →</a>
            </div>
          ))}
          {rfcs.length === 0 && <div className="rounded-xl border bg-card p-6 text-center text-xs text-muted-foreground">No proposals yet.</div>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl inline-flex items-center gap-2"><Vote className="h-5 w-5" /> Polls ({polls.length})</h2>
        <div className="grid gap-2">
          {polls.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl border bg-card p-4 gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{p.question}</div>
                <div className="text-[11px] text-muted-foreground">{authors[p.created_by]?.full_name ?? "—"} · {COPS.find((c) => c.key === p.cop)?.name ?? p.cop} · {(p.options as any[])?.length ?? 0} options · {p.is_active ? "active" : "closed"}</div>
              </div>
              <button onClick={() => togglePoll(p)} className="rounded border px-2 py-1 text-xs hover:bg-muted">{p.is_active ? "Close" : "Reopen"}</button>
              <button onClick={() => removePoll(p)} className="rounded p-1 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {polls.length === 0 && <div className="rounded-xl border bg-card p-6 text-center text-xs text-muted-foreground">No polls yet.</div>}
        </div>
      </section>

      <EditDialog
        open={!!editPost}
        onClose={() => setEditPost(null)}
        title="Edit post"
        record={editPost}
        fields={[
          { name: "title", label: "Title" },
          { name: "content", label: "Content", multiline: true },
        ]}
        onSave={async (vals) => {
          const { error } = await supabase.from("community_posts").update(vals as never).eq("id", editPost.id);
          if (error) throw error;
          setEditPost(null); load();
        }}
      />
      <EditDialog
        open={!!editRfc}
        onClose={() => setEditRfc(null)}
        title="Edit proposal"
        record={editRfc}
        fields={[
          { name: "title", label: "Title" },
          { name: "summary", label: "Summary", multiline: true },
          { name: "decision_notes", label: "Decision notes", multiline: true },
        ]}
        onSave={async (vals) => {
          const { error } = await supabase.from("rfcs").update(vals as never).eq("id", editRfc.id);
          if (error) throw error;
          setEditRfc(null); load();
        }}
      />
    </div>
  );
}

/* ---------- Programs ---------- */

function ProgramsTab() {
  const [events, setEvents] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [editEvent, setEditEvent] = useState<any | null>(null);
  const [editResource, setEditResource] = useState<any | null>(null);
  const [editDeal, setEditDeal] = useState<any | null>(null);

  const load = async () => {
    const [{ data: e }, { data: b }, { data: r }, { data: d }] = await Promise.all([
      supabase.from("events").select("*").order("start_date", { ascending: false }).limit(30),
      supabase.from("mentorship_bookings").select("*").order("created_at", { ascending: false }).limit(30),
      supabase.from("knowledge_resources").select("*").order("created_at", { ascending: false }).limit(30),
      supabase.from("deal_opportunities").select("*").order("created_at", { ascending: false }).limit(30),
    ]);
    setEvents(e ?? []); setBookings(b ?? []); setResources(r ?? []); setDeals(d ?? []);
  };
  useEffect(() => { load(); }, []);

  const del = async (table: string, id: string, label: string) => {
    if (!confirm(`Delete ${label}?`)) return;
    const { error } = await supabase.from(table as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };
  const toggleField = async (table: string, id: string, field: string, value: any) => {
    const { error } = await supabase.from(table as any).update({ [field]: value }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <section className="rounded-xl border bg-card p-5">
        <h3 className="mb-3 font-display text-lg inline-flex items-center gap-2"><Calendar className="h-4 w-4" /> Events <span className="text-xs text-muted-foreground">({events.length})</span></h3>
        <div className="space-y-2">
          {events.map((e) => (
            <div key={e.id} className="flex items-center gap-3 border-b py-2 last:border-0 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{e.is_featured && "⭐ "}{e.title}</div>
                <div className="text-[11px] text-muted-foreground">{format(new Date(e.start_date), "PPp")} · {e.event_type} · {e.status}</div>
              </div>
              <button onClick={() => toggleField("events", e.id, "is_featured", !e.is_featured)} title="Feature" className="rounded p-1 hover:bg-muted"><Star className={`h-3.5 w-3.5 ${e.is_featured ? "fill-gold text-gold" : ""}`} /></button>
              <select value={e.status} onChange={(ev) => toggleField("events", e.id, "status", ev.target.value)} className="h-7 rounded border bg-background px-2 text-xs">
                <option value="draft">draft</option><option value="published">published</option><option value="cancelled">cancelled</option><option value="completed">completed</option>
              </select>
              <button onClick={() => setEditEvent(e)} className="rounded p-1 hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={() => del("events", e.id, e.title)} className="rounded p-1 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {events.length === 0 && <div className="text-center text-xs text-muted-foreground py-4">No events.</div>}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h3 className="mb-3 font-display text-lg inline-flex items-center gap-2"><HeartHandshake className="h-4 w-4" /> Mentorship bookings <span className="text-xs text-muted-foreground">({bookings.length})</span></h3>
        <div className="space-y-2">
          {bookings.map((b) => (
            <div key={b.id} className="flex items-center gap-3 border-b py-2 last:border-0 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{b.topic}</div>
                <div className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}</div>
              </div>
              <select value={b.status} onChange={(ev) => toggleField("mentorship_bookings", b.id, "status", ev.target.value)} className="h-7 rounded border bg-background px-2 text-xs">
                <option value="requested">requested</option><option value="confirmed">confirmed</option><option value="declined">declined</option><option value="completed">completed</option><option value="cancelled">cancelled</option>
              </select>
              <button onClick={() => del("mentorship_bookings", b.id, b.topic)} className="rounded p-1 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {bookings.length === 0 && <div className="text-center text-xs text-muted-foreground py-4">No bookings.</div>}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h3 className="mb-3 font-display text-lg inline-flex items-center gap-2"><BookOpen className="h-4 w-4" /> Knowledge resources <span className="text-xs text-muted-foreground">({resources.length})</span></h3>
        <div className="space-y-2">
          {resources.map((r) => (
            <div key={r.id} className="flex items-center gap-3 border-b py-2 last:border-0 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{r.is_featured && "⭐ "}{r.title}</div>
                <div className="text-[11px] text-muted-foreground">{r.resource_type} · ⬇ {r.downloads_count} · min tier {r.min_tier_required}</div>
              </div>
              <button onClick={() => toggleField("knowledge_resources", r.id, "is_featured", !r.is_featured)} className="rounded p-1 hover:bg-muted"><Star className={`h-3.5 w-3.5 ${r.is_featured ? "fill-gold text-gold" : ""}`} /></button>
              <button onClick={() => setEditResource(r)} className="rounded p-1 hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={() => del("knowledge_resources", r.id, r.title)} className="rounded p-1 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {resources.length === 0 && <div className="text-center text-xs text-muted-foreground py-4">No resources.</div>}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h3 className="mb-3 font-display text-lg inline-flex items-center gap-2"><Briefcase className="h-4 w-4" /> Deal opportunities <span className="text-xs text-muted-foreground">({deals.length})</span></h3>
        <div className="space-y-2">
          {deals.map((d) => (
            <div key={d.id} className="flex items-center gap-3 border-b py-2 last:border-0 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{d.title} <span className="text-muted-foreground">· {d.enterprise_name}</span></div>
                <div className="text-[11px] text-muted-foreground">{d.deal_type} · min tier {d.min_tier_required}</div>
              </div>
              <select value={d.status} onChange={(ev) => toggleField("deal_opportunities", d.id, "status", ev.target.value)} className="h-7 rounded border bg-background px-2 text-xs">
                <option value="draft">draft</option><option value="open">open</option><option value="matched">matched</option><option value="closed">closed</option>
              </select>
              <button onClick={() => setEditDeal(d)} className="rounded p-1 hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={() => del("deal_opportunities", d.id, d.title)} className="rounded p-1 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {deals.length === 0 && <div className="text-center text-xs text-muted-foreground py-4">No deals.</div>}
        </div>
      </section>

      <EditDialog
        open={!!editEvent}
        onClose={() => setEditEvent(null)}
        title="Edit event"
        record={editEvent}
        fields={[
          { name: "title", label: "Title" },
          { name: "description", label: "Description", multiline: true },
          { name: "location", label: "Location" },
          { name: "meeting_url", label: "Meeting URL" },
        ]}
        onSave={async (vals) => {
          const { error } = await supabase.from("events").update(vals as never).eq("id", editEvent.id);
          if (error) throw error;
          setEditEvent(null); load();
        }}
      />
      <EditDialog
        open={!!editResource}
        onClose={() => setEditResource(null)}
        title="Edit resource"
        record={editResource}
        fields={[
          { name: "title", label: "Title" },
          { name: "description", label: "Description", multiline: true },
          { name: "file_url", label: "File URL" },
        ]}
        onSave={async (vals) => {
          const { error } = await supabase.from("knowledge_resources").update(vals as never).eq("id", editResource.id);
          if (error) throw error;
          setEditResource(null); load();
        }}
      />
      <EditDialog
        open={!!editDeal}
        onClose={() => setEditDeal(null)}
        title="Edit deal"
        record={editDeal}
        fields={[
          { name: "title", label: "Title" },
          { name: "enterprise_name", label: "Enterprise" },
          { name: "description", label: "Description", multiline: true },
        ]}
        onSave={async (vals) => {
          const { error } = await supabase.from("deal_opportunities").update(vals as never).eq("id", editDeal.id);
          if (error) throw error;
          setEditDeal(null); load();
        }}
      />
    </div>
  );
}

/* ---------- Reusable edit dialog ---------- */

function EditDialog({
  open, onClose, title, record, fields, onSave,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  record: any;
  fields: { name: string; label: string; multiline?: boolean }[];
  onSave: (vals: Record<string, any>) => Promise<void>;
}) {
  const [vals, setVals] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (record) {
      const v: Record<string, any> = {};
      fields.forEach((f) => { v[f.name] = record[f.name] ?? ""; });
      setVals(v);
    }
  }, [record]);
  if (!record) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.name} className="space-y-1">
              <Label>{f.label}</Label>
              {f.multiline ? (
                <Textarea rows={4} value={vals[f.name] ?? ""} onChange={(e) => setVals({ ...vals, [f.name]: e.target.value })} />
              ) : (
                <Input value={vals[f.name] ?? ""} onChange={(e) => setVals({ ...vals, [f.name]: e.target.value })} />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving} onClick={async () => {
            setSaving(true);
            try { await onSave(vals); toast.success("Saved"); } catch (e: any) { toast.error(e.message ?? "Failed"); } finally { setSaving(false); }
          }}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProgramCard({ icon: Icon, title, count, href, children }: { icon: any; title: string; count: number; href: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg inline-flex items-center gap-2"><Icon className="h-4 w-4" /> {title} <span className="text-xs text-muted-foreground">({count})</span></h3>
        <a href={href} className="text-xs text-primary hover:underline">Open →</a>
      </div>
      <ul className="text-sm">{children}</ul>
    </section>
  );
}

/* ---------- Recognition ---------- */

function RecognitionTab({ actor, members }: { actor: string; members: Profile[] }) {
  const [badges, setBadges] = useState<any[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, any>>({});

  const load = async () => {
    const { data } = await supabase.from("member_badges").select("*").order("awarded_at", { ascending: false }).limit(200);
    setBadges(data ?? []);
    const map: any = {};
    members.forEach((m) => { map[m.id] = m; });
    setProfilesById(map);
  };
  useEffect(() => { load(); }, [members]);

  const top = [...members].sort((a, b) => (b.engagement_score ?? 0) - (a.engagement_score ?? 0)).slice(0, 15);

  return (
    <div className="flex-1 overflow-auto p-6 space-y-8">
      <section>
        <h2 className="mb-3 font-display text-xl inline-flex items-center gap-2"><Activity className="h-5 w-5" /> Engagement leaderboard</h2>
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3">#</th><th className="p-3">Member</th><th className="p-3">Tier</th><th className="p-3">Score</th><th className="p-3">Last active</th></tr>
            </thead>
            <tbody>
              {top.map((m, i) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="p-3 font-display">{i + 1}</td>
                  <td className="p-3"><div className="flex items-center gap-2"><UserAvatar name={m.full_name || m.email} src={m.avatar_url} size={28} /><div><div className="font-medium">{m.full_name || "—"}</div><div className="text-[11px] text-muted-foreground">{m.organisation_name}</div></div></div></td>
                  <td className="p-3"><TierBadge tier={m.membership_tier} /></td>
                  <td className="p-3 font-semibold">{m.engagement_score ?? 0}</td>
                  <td className="p-3 text-xs text-muted-foreground">{m.last_active_at ? formatDistanceToNow(new Date(m.last_active_at), { addSuffix: true }) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl inline-flex items-center gap-2"><Award className="h-5 w-5" /> Recently awarded badges</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {badges.slice(0, 30).map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-xl border bg-card p-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{b.label}</div>
                <div className="text-[11px] text-muted-foreground truncate">{profilesById[b.user_id]?.full_name ?? b.user_id.slice(0,8)}{b.cop ? ` · ${COPS.find((c)=>c.key===b.cop)?.name}` : ""}</div>
              </div>
              <button onClick={async () => {
                if (!confirm(`Revoke "${b.label}"?`)) return;
                await supabase.from("member_badges").delete().eq("id", b.id);
                await logAudit({ actorId: actor, action: "note.delete", targetType: "profile", targetId: b.user_id, metadata: { badge: b.badge_key } });
                load();
              }} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {badges.length === 0 && <div className="col-span-full rounded-xl border bg-card p-6 text-center text-xs text-muted-foreground">No badges awarded yet.</div>}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">Tip: open a member from the CRM tab to award a custom badge.</p>
      </section>
    </div>
  );
}

/* ---------- Messaging & broadcast helpers ---------- */

function AdminSendMessage({ recipientId, actorId, onSent }: { recipientId: string; actorId: string; onSent?: () => void }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    const content = body.trim();
    if (!content) return;
    setBusy(true);
    const { error } = await supabase.from("direct_messages").insert({
      sender_id: actorId, recipient_id: recipientId, content,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setBody("");
    toast.success("Message sent");
    await logAudit({ actorId, action: "note.create", targetType: "profile", targetId: recipientId, metadata: { channel: "dm", preview: content.slice(0, 80) } });
    onSent?.();
  };
  return (
    <div className="space-y-2">
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3}
        placeholder="Write a direct message. The member will see it in Messages and be notified."
        className="w-full rounded-md border bg-background p-2 text-sm" />
      <div className="flex justify-end">
        <button disabled={busy || !body.trim()} onClick={send}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">
          <MessageSquare className="h-3 w-3" /> Send DM
        </button>
      </div>
    </div>
  );
}

function AdminSendNotification({ recipientIds, onSent }: { recipientIds: string[]; onSent?: () => void }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!title.trim()) return toast.error("Title required");
    if (recipientIds.length === 0) return toast.error("No recipients");
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_broadcast_notification", {
      _recipient_ids: recipientIds, _title: title.trim(), _message: message.trim(), _link: link.trim() || undefined,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Notification sent to ${data ?? recipientIds.length} member${recipientIds.length === 1 ? "" : "s"}`);
    setTitle(""); setMessage(""); setLink("");
    onSent?.();
  };
  return (
    <div className="space-y-2">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" className="h-9 text-sm" />
      <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Message body (optional)" className="text-sm" />
      <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link (optional, e.g. /events or https://…)" className="h-9 text-sm" />
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{recipientIds.length} recipient{recipientIds.length === 1 ? "" : "s"}</span>
        <button disabled={busy || !title.trim() || recipientIds.length === 0} onClick={send}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">
          <Mail className="h-3 w-3" /> Send notification
        </button>
      </div>
    </div>
  );
}

function BroadcastButton({ recipientIds, label }: { recipientIds: string[]; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} disabled={recipientIds.length === 0}
        className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">
        <Mail className="h-3 w-3" /> {label}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Broadcast notification</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">
            This sends an in-app notification to the {recipientIds.length} member{recipientIds.length === 1 ? "" : "s"} currently in your filtered CRM view.
          </p>
          <AdminSendNotification recipientIds={recipientIds} onSent={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─────────────────────────── Applications & payments ─────────────────────────── */

type AppRow = any;
type PayRow = any;

const APP_STATUSES = [
  { key: "submitted", label: "Submitted", color: "bg-blue-100 text-blue-800" },
  { key: "reviewing", label: "In review", color: "bg-purple-100 text-purple-800" },
  { key: "approved", label: "Approved", color: "bg-success/20 text-primary" },
  { key: "rejected", label: "Rejected", color: "bg-destructive/15 text-destructive" },
] as const;

function money(kobo: number) {
  return "₦" + Math.round((kobo ?? 0) / 100).toLocaleString("en-NG");
}

function ApplicationsTab({ members }: { members: Profile[] }) {
  const [apps, setApps] = useState<AppRow[]>([]);
  const [pays, setPays] = useState<PayRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState<AppRow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: a }, { data: p }] = await Promise.all([
      supabase.from("membership_applications").select("*").order("created_at", { ascending: false }),
      supabase.from("membership_payments").select("*").order("created_at", { ascending: false }),
    ]);
    setApps((a ?? []) as AppRow[]);
    setPays((p ?? []) as PayRow[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const payByEmail = useMemo(() => {
    const m = new Map<string, PayRow>();
    for (const p of pays) {
      const k = String(p.email ?? "").toLowerCase();
      const prev = m.get(k);
      if (!prev || (p.status === "success" && prev.status !== "success")) m.set(k, p);
    }
    return m;
  }, [pays]);

  const profileByEmail = useMemo(() => {
    const m = new Map<string, Profile>();
    for (const p of members) m.set(String(p.email ?? "").toLowerCase(), p);
    return m;
  }, [members]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return apps.filter((a) => {
      if (status !== "all" && a.status !== status) return false;
      if (!needle) return true;
      return [a.full_name, a.email, a.organisation_name, a.tier_label]
        .some((v) => String(v ?? "").toLowerCase().includes(needle));
    });
  }, [apps, q, status]);

  const totals = useMemo(() => {
    const paid = pays.filter((p) => p.status === "success");
    return {
      apps: apps.length,
      pendingPay: apps.filter((a) => a.payment_required && payByEmail.get(String(a.email).toLowerCase())?.status !== "success").length,
      collected: paid.reduce((s, p) => s + (p.amount_kobo ?? 0), 0),
      paidCount: paid.length,
    };
  }, [apps, pays, payByEmail]);

  const setAppStatus = async (id: string, next: string) => {
    const { error } = await supabase.from("membership_applications").update({ status: next } as never).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Application updated");
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status: next } : a)));
    setOpen((o: AppRow | null) => (o && o.id === id ? { ...o, status: next } : o));
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <Stat label="Applications" value={totals.apps} />
        <Stat label="Awaiting payment" value={totals.pendingPay} tone="bg-gold/25 text-gold-foreground" />
        <Stat label="Payments received" value={totals.paidCount} tone="bg-success/20 text-primary" />
        <Stat label="Total collected" value={money(totals.collected) as unknown as number} tone="bg-primary/10 text-primary" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, organisation…"
            className="h-9 w-72 rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="all">All statuses</option>
          {APP_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Applicant</th>
              <th className="px-4 py-3">Organisation</th>
              <th className="px-4 py-3">Tier requested</th>
              <th className="px-4 py-3">Fee</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Account tier</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Loading…</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No applications yet.</td></tr>
            )}
            {rows.map((a) => {
              const pay = payByEmail.get(String(a.email).toLowerCase());
              const prof = profileByEmail.get(String(a.email).toLowerCase());
              const st = APP_STATUSES.find((s) => s.key === a.status) ?? APP_STATUSES[0];
              return (
                <tr key={a.id} onClick={() => setOpen(a)} className="cursor-pointer border-t hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <div className="font-medium">{a.full_name}</div>
                    <div className="text-xs text-muted-foreground">{a.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{a.organisation_name}</div>
                    <div className="text-xs text-muted-foreground">{a.organisation_type || "—"}</div>
                  </td>
                  <td className="px-4 py-3">{a.tier_label || TIER_LABELS[a.requested_tier]}</td>
                  <td className="px-4 py-3">{a.amount_naira > 0 ? "₦" + Number(a.amount_naira).toLocaleString("en-NG") : "Free"}</td>
                  <td className="px-4 py-3">
                    {!a.payment_required ? (
                      <span className="text-xs text-muted-foreground">Not required</span>
                    ) : pay?.status === "success" ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-success/20 px-2 py-0.5 text-xs text-primary">
                        <CreditCard className="h-3 w-3" /> {money(pay.amount_kobo)} paid
                      </span>
                    ) : (
                      <span className="rounded-md bg-gold/25 px-2 py-0.5 text-xs text-gold-foreground">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{prof ? <TierBadge tier={prof.membership_tier} /> : <span className="text-xs text-muted-foreground">No account</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-0.5 text-xs ${st.color}`}>{st.label}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {a.created_at ? format(new Date(a.created_at), "d MMM yyyy") : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{open.organisation_name} — {open.tier_label || TIER_LABELS[open.requested_tier]}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="flex flex-wrap gap-2">
                  {APP_STATUSES.map((s) => (
                    <button key={s.key} onClick={() => setAppStatus(open.id, s.key)}
                      className={`rounded-md px-3 py-1.5 text-xs ${open.status === s.key ? s.color : "border hover:bg-muted"}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
                <Detail label="Contact" value={`${open.full_name} · ${open.role_title || "—"}`} />
                <Detail label="Email" value={open.email} />
                <Detail label="Phone" value={open.phone || "—"} />
                <Detail label="Location" value={open.location || "—"} />
                <Detail label="Website" value={open.website_url || "—"} />
                <Detail label="LinkedIn" value={open.linkedin_url || "—"} />
                <Detail label="AUM / budget" value={open.aum_range || "—"} />
                <Detail label="Investment stage" value={open.investment_stage || "—"} />
                <Detail label="SDG focus" value={(open.sdg_focus ?? []).join(", ") || "—"} />
                <Detail label="Sectors" value={(open.sectors ?? []).join(", ") || "—"} />
                <Detail label="Goals" value={(open.goals ?? []).join(", ") || "—"} />
                <Detail label="Can contribute" value={(open.contributions ?? []).join(", ") || "—"} />
                <Detail label="Events" value={(open.events_interested ?? []).join(", ") || "—"} />
                <Detail label="Heard about NIEC" value={open.heard_from || "—"} />
                <Detail label="Preferred channel" value={open.comm_preference || "—"} />
                <Detail label="Statement of intent" value={open.statement || "—"} />
                <Detail label="Team notified" value={open.emailed_at ? format(new Date(open.emailed_at), "d MMM yyyy, HH:mm") : "Not sent"} />
                <div className="rounded-lg border p-3">
                  <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Payments</div>
                  {pays.filter((p) => String(p.email).toLowerCase() === String(open.email).toLowerCase()).length === 0 && (
                    <div className="text-xs text-muted-foreground">No payment attempts recorded.</div>
                  )}
                  {pays.filter((p) => String(p.email).toLowerCase() === String(open.email).toLowerCase()).map((p) => (
                    <div key={p.id} className="flex items-center justify-between border-b py-1.5 last:border-0">
                      <span>{money(p.amount_kobo)} · {TIER_LABELS[p.tier] ?? p.tier}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.status} · {p.created_at ? format(new Date(p.created_at), "d MMM yyyy") : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <a href={`mailto:${open.email}`} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
                  <Mail className="h-4 w-4" /> Email applicant
                </a>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="whitespace-pre-wrap">{value}</div>
    </div>
  );
}
