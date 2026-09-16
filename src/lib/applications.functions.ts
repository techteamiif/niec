import { createServerFn } from "@tanstack/react-start";

export interface JoinApplicationInput {
  userId?: string;
  fullName: string;
  email: string;
  phone?: string;
  organisationName: string;
  organisationType?: string;
  roleTitle?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  tier: string;
  tierLabel: string;
  amountNaira: number;
  sdgFocus?: string[];
  sectors?: string[];
  goals?: string[];
  contributions?: string[];
  eventsInterested?: string[];
  eventRole?: string;
  heardFrom?: string;
  commPreference?: string;
  aumRange?: string;
  investmentStage?: string;
  statement?: string;
}

const TIERS = ["observer", "contributor", "growth_partner", "anchor", "strategic_partner"];
const clean = (v: unknown, max = 400) => String(v ?? "").trim().slice(0, max);
const cleanList = (v: unknown) =>
  Array.isArray(v) ? v.slice(0, 40).map((x) => clean(x, 160)).filter(Boolean) : [];

const naira = (n: number) =>
  n > 0 ? `₦${n.toLocaleString("en-NG")}` : "Free";

/**
 * Public endpoint: records a membership application and notifies the NIEC team.
 * Writes only application data — no privileged reads are exposed to the caller.
 */
export const submitJoinApplication = createServerFn({ method: "POST" })
  .inputValidator((input: JoinApplicationInput) => {
    if (!input?.email || !/^\S+@\S+\.\S+$/.test(input.email)) throw new Error("A valid email is required.");
    if (!clean(input.fullName)) throw new Error("Your name is required.");
    if (!clean(input.organisationName)) throw new Error("Organisation name is required.");
    if (!TIERS.includes(input.tier)) throw new Error("Please choose a valid membership tier.");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const amount = Math.max(0, Math.round(Number(data.amountNaira) || 0));
    const paymentRequired = amount > 0;

    const row = {
      user_id: data.userId || null,
      full_name: clean(data.fullName, 160),
      email: clean(data.email, 200).toLowerCase(),
      phone: clean(data.phone, 60) || null,
      organisation_name: clean(data.organisationName, 200),
      organisation_type: clean(data.organisationType, 80) || null,
      role_title: clean(data.roleTitle, 160) || null,
      location: clean(data.location, 160) || null,
      website_url: clean(data.website, 300) || null,
      linkedin_url: clean(data.linkedin, 300) || null,
      requested_tier: data.tier,
      tier_label: clean(data.tierLabel, 80),
      amount_naira: amount,
      payment_required: paymentRequired,
      payment_status: paymentRequired ? "pending" : "not_required",
      sdg_focus: cleanList(data.sdgFocus),
      sectors: cleanList(data.sectors),
      goals: cleanList(data.goals),
      contributions: cleanList(data.contributions),
      events_interested: cleanList(data.eventsInterested),
      event_role: clean(data.eventRole, 80) || null,
      heard_from: clean(data.heardFrom, 80) || null,
      comm_preference: clean(data.commPreference, 40) || null,
      aum_range: clean(data.aumRange, 80) || null,
      investment_stage: clean(data.investmentStage, 80) || null,
      statement: clean(data.statement, 4000) || null,
      status: "submitted",
    };

    const { data: inserted, error } = await supabaseAdmin
      .from("membership_applications")
      .insert(row as never)
      .select("id")
      .single();

    if (error) {
      console.error("[application:insert]", error.message);
      return { ok: false as const, error: "We could not save your application. Please try again." };
    }

    const applicationId = (inserted as { id: string }).id;

    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      await sendTemplateEmail("join-application", "", {
        idempotencyKey: `join-application-${applicationId}`,
        replyTo: row.email,
        templateData: {
          fullName: row.full_name,
          email: row.email,
          phone: row.phone ?? "",
          organisationName: row.organisation_name,
          organisationType: row.organisation_type ?? "",
          roleTitle: row.role_title ?? "",
          location: row.location ?? "",
          website: row.website_url ?? "",
          linkedin: row.linkedin_url ?? "",
          tierLabel: row.tier_label,
          amountLabel: naira(amount),
          paymentStatus: paymentRequired ? "Payment pending" : "No payment required",
          sdgFocus: row.sdg_focus,
          sectors: row.sectors,
          goals: row.goals,
          contributions: row.contributions,
          eventsInterested: row.events_interested,
          eventRole: row.event_role ?? "",
          heardFrom: row.heard_from ?? "",
          commPreference: row.comm_preference ?? "",
          aumRange: row.aum_range ?? "",
          investmentStage: row.investment_stage ?? "",
          statement: row.statement ?? "",
          submittedAt: new Date().toLocaleString("en-GB", { timeZone: "Africa/Lagos" }),
        },
      });
      await supabaseAdmin
        .from("membership_applications")
        .update({ emailed_at: new Date().toISOString() } as never)
        .eq("id", applicationId);
    } catch (err) {
      // The application is safely stored even when the notification fails.
      console.error("[application:email]", err);
    }

    return { ok: true as const, applicationId };
  });
