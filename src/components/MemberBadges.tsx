import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Award, Crown, BookOpen, GraduationCap, Sparkles, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const BADGE_META: Record<string, { icon: LucideIcon; color: string }> = {
  convenor:         { icon: Crown,         color: "bg-gold/25 text-gold-foreground border-gold/40" },
  author:           { icon: BookOpen,      color: "bg-purple-100 text-purple-800 border-purple-200" },
  mentor:           { icon: GraduationCap, color: "bg-success/20 text-primary border-success/40" },
  founding_member:  { icon: Sparkles,      color: "bg-primary/10 text-primary border-primary/30" },
  top_contributor:  { icon: Trophy,        color: "bg-blue-100 text-blue-800 border-blue-200" },
};

export function MemberBadges({ userId, compact = false }: { userId: string; compact?: boolean }) {
  const [badges, setBadges] = useState<Array<{ id: string; badge_key: string; label: string; cop: string | null }>>([]);
  useEffect(() => {
    supabase.from("member_badges").select("id, badge_key, label, cop").eq("user_id", userId)
      .then(({ data }) => setBadges((data as any) ?? []));
  }, [userId]);

  if (!badges.length) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? "" : "mt-2"}`}>
      {badges.map((b) => {
        const m = BADGE_META[b.badge_key] ?? { icon: Award, color: "bg-muted text-foreground border-border" };
        const Icon = m.icon;
        return (
          <span key={b.id} title={b.label} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${m.color}`}>
            <Icon className="h-3 w-3" /> {b.label}
          </span>
        );
      })}
    </div>
  );
}
