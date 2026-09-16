import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Check, Circle, Sparkles } from "lucide-react";

type Step = { key: string; label: string; to: string; done: boolean };

export function OnboardingChecklist() {
  const { user, profile } = useAuth();
  const [steps, setSteps] = useState<Step[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const d = typeof window !== "undefined" && localStorage.getItem("niec_onboarding_dismissed");
    if (d) setDismissed(true);
  }, []);

  useEffect(() => {
    if (!user || !profile) return;
    (async () => {
      const [{ count: copCount }, { count: postCount }, { count: rsvpCount }, { count: bookingCount }] = await Promise.all([
        supabase.from("cop_memberships").select("*", { count: "exact", head: true }).eq("member_id", user.id),
        supabase.from("community_posts").select("*", { count: "exact", head: true }).eq("author_id", user.id),
        supabase.from("event_registrations").select("*", { count: "exact", head: true }).eq("member_id", user.id),
        supabase.from("mentorship_bookings").select("*", { count: "exact", head: true }).eq("requester_id", user.id),
      ]);
      const profileDone = !!(profile.bio && profile.organisation_name && profile.role_title);
      setSteps([
        { key: "profile",  label: "Complete your profile",        to: "/profile",     done: profileDone },
        { key: "cops",     label: "Join 2 Communities of Practice", to: "/cops",      done: (copCount ?? 0) >= 2 },
        { key: "post",     label: "Introduce yourself in the feed", to: "/community", done: (postCount ?? 0) >= 1 },
        { key: "event",    label: "RSVP to an upcoming event",     to: "/events",     done: (rsvpCount ?? 0) >= 1 },
        { key: "mentor",   label: "Request a mentor or browse offers", to: "/mentorship", done: (bookingCount ?? 0) >= 1 },
      ]);
    })();
  }, [user, profile]);

  if (!steps.length || dismissed) return null;
  const done = steps.filter((s) => s.done).length;
  const pct = Math.round((done / steps.length) * 100);
  if (done === steps.length) return null;

  return (
    <div className="rounded-xl border bg-gradient-to-br from-card to-muted/30 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><Sparkles className="h-3.5 w-3.5" /> Getting started</div>
          <h3 className="mt-1 font-display text-lg">Welcome to NIEC — {done}/{steps.length} done</h3>
        </div>
        <button onClick={() => { localStorage.setItem("niec_onboarding_dismissed", "1"); setDismissed(true); }} className="text-xs text-muted-foreground hover:underline">Dismiss</button>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="mt-4 space-y-1.5">
        {steps.map((s) => (
          <li key={s.key}>
            <Link to={s.to} className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-muted ${s.done ? "text-muted-foreground" : ""}`}>
              {s.done
                ? <Check className="h-4 w-4 text-success" />
                : <Circle className="h-4 w-4 text-muted-foreground" />}
              <span className={s.done ? "line-through" : "group-hover:text-primary"}>{s.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
