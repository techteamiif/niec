import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "member" | "admin" | "super_admin";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  organisation_name: string;
  organisation_type: string;
  role_title: string;
  membership_tier: "observer" | "contributor" | "growth_partner" | "anchor" | "strategic_partner";
  membership_status: "pending" | "active" | "lapsed" | "suspended";
  avatar_url: string | null;
  bio: string | null;
  location: string;
  sdg_focus: string[] | null;
  sectors: string[] | null;
  linkedin_url: string | null;
  website_url: string | null;
  engagement_score: number;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  isStaff: boolean;
  isSuperAdmin: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.rpc("get_my_profile").maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((p as Profile) ?? null);
    setRoles(((r ?? []) as { role: AppRole }[]).map((x) => x.role));
  };


  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadProfile(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const refresh = async () => {
    if (user) await loadProfile(user.id);
  };
  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const isStaff = roles.includes("admin") || roles.includes("super_admin");
  const isSuperAdmin = roles.includes("super_admin");

  return (
    <Ctx.Provider value={{ user, session, profile, roles, loading, isStaff, isSuperAdmin, refresh, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
