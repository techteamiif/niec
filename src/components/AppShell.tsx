import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, MessageSquare, Users, Calendar, Briefcase,
  BookOpen, Layers, User, Bell, Settings, LogOut, Menu, X, Search, Mail, GraduationCap, Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { UserAvatar } from "@/components/Avatar";
import { TierBadge } from "@/components/TierBadge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { NiecLogo } from "@/components/brand/NiecLogo";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; badge?: boolean };
const NAV: NavItem[] = [
  { to: "/dashboard",  label: "Dashboard",     icon: LayoutDashboard },
  { to: "/community",  label: "Community",     icon: MessageSquare },
  { to: "/members",    label: "Members",       icon: Users },
  { to: "/messages",   label: "Messages",      icon: Mail },
  { to: "/events",     label: "Events",        icon: Calendar },
  { to: "/deal-room",  label: "Deal Room",     icon: Briefcase },
  { to: "/knowledge",  label: "Knowledge Hub", icon: BookOpen },
  { to: "/cops",       label: "CoPs",          icon: Layers },
  { to: "/mentorship", label: "Mentorship",    icon: GraduationCap },
  { to: "/profile",    label: "My Profile",    icon: User },
  { to: "/upgrade",    label: "Membership",    icon: Sparkles },
  { to: "/notifications", label: "Notifications", icon: Bell, badge: true },
] as const;

export function AppShell() {
  const { user, profile, isStaff, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("is_read", false);
      setUnread(count ?? 0);
    };
    load();
    const ch = supabase
      .channel("notif-" + user.id)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${user.id}` },
        load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  if (loading || !user || !profile) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  const Sidebar = (
    <aside className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
        <Link to="/dashboard" className="flex items-center">
          <NiecLogo variant="horizontal" theme="dark" size={36} withTagline />
        </Link>
        <button className="lg:hidden" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV.map(({ to, label, icon: Icon, badge }) => {
          const active = path === to || path.startsWith(to + "/");
          return (
            <Link
              key={to} to={to} onClick={() => setOpen(false)}
              className={cn(
                "group relative my-0.5 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                active
                  ? "bg-sidebar-accent/15 text-white"
                  : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-white",
              )}
            >
              {active && <span className="absolute left-0 top-1.5 h-[calc(100%-12px)] w-[3px] rounded-r-full bg-sidebar-accent" />}
              <Icon className="h-4 w-4" />
              <span className="flex-1">{label}</span>
              {badge && unread > 0 && (
                <span className="rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">{unread}</span>
              )}
            </Link>
          );
        })}
        {isStaff && (
          <Link
            to="/admin" onClick={() => setOpen(false)}
            className={cn(
              "mt-3 flex items-center gap-3 rounded-md border border-sidebar-border/60 px-3 py-2 text-sm",
              path.startsWith("/admin") ? "bg-sidebar-accent/15 text-white" : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-white",
            )}
          >
            <Settings className="h-4 w-4" />
            <span className="flex-1">Admin Panel</span>
          </Link>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <UserAvatar name={profile.full_name || profile.email} src={profile.avatar_url} size={36} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white">{profile.full_name || "Member"}</div>
            <div className="mt-0.5"><TierBadge tier={profile.membership_tier} /></div>
          </div>
          <button onClick={signOut} title="Sign out" className="rounded p-1.5 text-sidebar-muted hover:bg-white/10 hover:text-white">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">{Sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0">{Sidebar}</div>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur lg:px-8">
          <button className="lg:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
          <form
            onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const q = String(fd.get("q") || "").trim(); navigate({ to: "/members", search: q ? { q } : {} }); }}
            className="relative hidden flex-1 max-w-md md:block"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              placeholder="Search members…"
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </form>
          <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
            <span className="hidden md:inline">{profile.organisation_name || "—"}</span>
          </div>
        </header>
        <div className="flex-1">
          {profile.membership_status === "pending" ? (
            <div className="p-6 lg:p-10">
              <div className="mx-auto max-w-2xl rounded-2xl border bg-card p-8 text-center shadow-sm">
                <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-gold/20 text-gold-foreground">⏳</div>
                <h1 className="font-display text-2xl">Your application is under review</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  An IIF admin will review your membership shortly. You'll receive a notification when you're approved.
                </p>
                <button onClick={signOut} className="mt-6 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-muted">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>
    </div>
  );
}
