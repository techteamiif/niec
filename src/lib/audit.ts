import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "member.approve"
  | "member.reject"
  | "member.tier_change"
  | "member.stage_change"
  | "member.tags_change"
  | "member.suspend"
  | "member.reactivate"
  | "role.grant"
  | "role.revoke"
  | "note.create"
  | "note.delete"
  | "event.create"
  | "deal.create"
  | "knowledge.create";

export async function logAudit(opts: {
  actorId: string;
  action: AuditAction;
  targetType: "profile" | "user_role" | "event" | "deal" | "resource" | "note";
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  await supabase.from("admin_audit_log").insert({
    actor_id: opts.actorId,
    action: opts.action,
    target_type: opts.targetType,
    target_id: opts.targetId ?? null,
    metadata: (opts.metadata ?? {}) as any,
  });
}
