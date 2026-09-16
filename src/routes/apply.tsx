import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { initMembershipPayment } from "@/lib/payments.functions";
import { submitJoinApplication } from "@/lib/applications.functions";
import { toast } from "sonner";
import { Check, ChevronRight, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/apply")({
  head: () => ({
    meta: [
      { title: "Apply for NIEC membership — Impact Investors Foundation" },
      { name: "description", content: "Apply to join the Nigeria Impact Economy Community — a members' network for impact investors, social enterprises and ecosystem partners." },
    ],
  }),
  component: ApplyPage,
});

const TIERS = [
  { key: "observer",          label: "Observer",          fee: "Free" },
  { key: "contributor",       label: "Enterprise",        fee: "₦100k – ₦250k / yr" },
  { key: "growth_partner",    label: "Growth Partner",    fee: "₦500k / yr" },
  { key: "anchor",            label: "Anchor Partner",    fee: "₦1.5M / yr" },
  { key: "strategic_partner", label: "Strategic Partner", fee: "Negotiated" },
] as const;

const PAYABLE: Record<string, number> = {
  contributor: 100_000,
  growth_partner: 500_000,
  anchor: 1_500_000,
};

const ORG_TYPES: { key: string; label: string }[] = [
  { key: "investor", label: "Impact investor / fund manager" },
  { key: "dfi", label: "Development finance institution (DFI)" },
  { key: "corporate", label: "Corporate / private sector" },
  { key: "social_enterprise", label: "NGO / social enterprise" },
  { key: "government", label: "Government / public institution" },
  { key: "research", label: "Academic / research institution" },
  { key: "accelerator", label: "Accelerator / incubator" },
  { key: "foundation", label: "Foundation" },
  { key: "other", label: "Other" },
];

const AUM_OPTS = ["Under ₦50M", "₦50M – ₦500M", "₦500M – ₦5B", "₦5B – ₦50B", "Above ₦50B", "Not applicable"];
const STAGE_OPTS = ["Seed / early stage", "Growth stage", "Scale / expansion", "Debt / blended finance", "Grant / catalytic capital", "Multiple stages"];

const SDGS = ["SDG 1 — No poverty","SDG 2 — Zero hunger","SDG 3 — Good health","SDG 4 — Quality education","SDG 5 — Gender equality","SDG 7 — Clean energy","SDG 8 — Decent work","SDG 9 — Industry & innovation","SDG 10 — Reduced inequality","SDG 11 — Sustainable cities","SDG 13 — Climate action","SDG 17 — Partnerships"];
const SECTORS = ["Agri-food systems","Fintech / financial inclusion","Healthcare","EdTech","Clean energy / climate","Housing / real estate","Digital infrastructure","Creative economy","Gender lens investing","Supply chain / logistics"];
const GOALS = ["Deal flow & co-investment","Policy influence & advocacy","Capacity building & training","Impact data & market intelligence","Network & partnerships","Event access (GIIS, Summit, ACII)","Visibility & brand profile","ESG / SDG reporting support"];
const CONTRIBUTIONS = ["Capital / investment","Technical expertise","Market access / networks","Research & data","Policy knowledge","Mentorship & advisory"];
const EVENTS = ["GIIS 2026 (Sept, Lagos)","Africa Impact Summit 2026 (June, Nairobi)","ACII 2026 (November, Abuja)","Creative Economy Roundtable"];
const HEARD = ["Referral","LinkedIn","IIF event","Website","Media / press","Other"];
const COMMS = ["Email","WhatsApp","Phone call","In-person"];
const ROLES = ["Attendee","Speaker / panellist","Sponsor","Exhibitor","Partner organisation"];

const CONSENTS = [
  "I confirm that the information provided is accurate and I am authorised to represent my organisation.",
  "I consent to IIF / NIEC storing and using this data for membership processing, community matching, and event communications.",
  "I understand that my membership profile may be shared within the NIEC CRM for ecosystem matchmaking purposes.",
];

function toggle<T>(arr: T[], v: T) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function ApplyPage() {
  const navigate = useNavigate();
  const [tier, setTier] = useState<typeof TIERS[number]["key"] | "">("");
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("");
  const [city, setCity] = useState("");
  const [website, setWebsite] = useState("");
  const [aum, setAum] = useState("");
  const [stage, setStage] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [password, setPassword] = useState("");
  const [commPref, setCommPref] = useState("Email");
  const [sdgs, setSdgs] = useState<string[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [contributions, setContributions] = useState<string[]>([]);
  const [eventsInterested, setEventsInterested] = useState<string[]>([]);
  const [eventRole, setEventRole] = useState("");
  const [heard, setHeard] = useState("");
  const [statement, setStatement] = useState("");
  const [consents, setConsents] = useState<boolean[]>([false, false, false]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const progress = useMemo(() => {
    const required = [orgName, orgType, city, firstName, lastName, jobTitle, email, password, tier];
    const filled = required.filter(Boolean).length;
    return Math.round((filled / required.length) * 100);
  }, [orgName, orgType, city, firstName, lastName, jobTitle, email, password, tier]);

  const allConsented = consents.every(Boolean);

  const submit = async () => {
    if (!tier || !orgName || !orgType || !city || !firstName || !lastName || !jobTitle || !email || !password) {
      toast.error("Please complete all required fields and pick a tier.");
      return;
    }
    if (password.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    if (!allConsented) { toast.error("Please tick all three consent boxes."); return; }

    setBusy(true);
    try {
      const full_name = `${firstName} ${lastName}`.trim();
      const { data: signUp, error: signErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + "/dashboard",
          data: { full_name },
        },
      });
      if (signErr) throw signErr;

      const userId = signUp.user?.id;
      if (userId) {
        const application_data = {
          requested_tier: tier,
          aum_range: aum,
          investment_stage: stage,
          goals,
          contributions,
          events_interested: eventsInterested,
          event_role: eventRole,
          heard_from: heard,
          comm_preference: commPref,
          statement_of_intent: statement,
          submitted_at: new Date().toISOString(),
        };
        const { error: rpcErr } = await supabase.rpc("submit_application", {
          _user_id: userId,
          _full_name: full_name,
          _organisation_name: orgName,
          _organisation_type: orgType as any,
          _role_title: jobTitle,
          _location: city,
          _website_url: website || "",
          _linkedin_url: linkedin || "",
          _phone: phone || "",
          _sdg_focus: sdgs,
          _sectors: sectors,
          _bio: statement || "",
          _application_data: application_data as any,
        });
        if (rpcErr) throw rpcErr;
      }

      // Record the application for the NIEC team (CRM + email notification)
      try {
        const res = await submitJoinApplication({
          data: {
            userId: userId ?? undefined,
            fullName: full_name,
            email,
            phone,
            organisationName: orgName,
            organisationType: ORG_TYPES.find((o) => o.key === orgType)?.label ?? orgType,
            roleTitle: jobTitle,
            location: city,
            website,
            linkedin,
            tier,
            tierLabel: TIERS.find((t) => t.key === tier)?.label ?? tier,
            amountNaira: PAYABLE[tier] ?? 0,
            sdgFocus: sdgs,
            sectors,
            goals,
            contributions,
            eventsInterested,
            eventRole,
            heardFrom: heard,
            commPreference: commPref,
            aumRange: aum,
            investmentStage: stage,
            statement,
          },
        });
        if (!res.ok) toast.error(res.error);
      } catch (e) {
        console.error("[apply:record]", e);
      }


      if (PAYABLE[tier]) {
        toast.success("Application saved — taking you to secure payment…");
        try {
          const res = await initMembershipPayment({
            data: {
              email,
              tier,
              amountKobo: PAYABLE[tier]! * 100,
              fullName: full_name,
              userId: userId ?? undefined,
              callbackUrl: `${window.location.origin}/payment?tier=${tier}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(full_name)}`,
            },
          });
          if (res.ok) {
            window.location.href = res.authorizationUrl;
            return;
          }
          toast.error(res.error);
        } catch {
          toast.error("We saved your application but couldn't open the payment page. You can pay from the next screen.");
        }
        setDone(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      const msg = String(err?.message ?? "");
      if (/fetch|network|Failed to fetch|timeout/i.test(msg)) {
        toast.error("We couldn't reach the NIEC servers", {
          description: "Your application wasn't saved. Please try again in a few minutes.",
        });
      } else {
        toast.error(msg || "Could not submit application.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-[#F7FBFA]">
        <Header />
        <div className="mx-auto max-w-xl px-6 py-20 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary/10">
            <Check className="h-10 w-10 text-primary" />
          </div>
          <h1 className="mt-6 font-display text-3xl text-primary">Application submitted</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Thank you, {firstName}. Your application for <strong>{orgName}</strong> has been received as a <strong>{TIERS.find(t => t.key === tier)?.label}</strong> applicant.
            We've sent a confirmation email — please verify your address. The IIF team will review your application and be in touch within 5 business days.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {PAYABLE[tier] && (
              <Link
                to="/payment"
                search={{ tier, email, name: `${firstName} ${lastName}`.trim(), reference: "" }}
                className="rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-gold-foreground hover:opacity-90"
              >
                Pay membership fee
              </Link>
            )}
            <Link to="/login" className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Go to sign in</Link>
            <Link to="/" className="rounded-md border px-5 py-2.5 text-sm hover:bg-muted">Back to home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7FBFA]">
      <Header />

      {/* Hero */}
      <section className="bg-primary px-6 py-14 text-center text-white">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-3xl md:text-5xl">Join the <span className="text-gold">NIEC</span> Community</h1>
          <p className="mt-4 text-white/75">Apply for membership in Nigeria's premier impact economy network — connecting capital, conviction, and community for Africa's new economy.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {["Deal Flow","Policy Influence","GIIS · Summit · ACII","SDG Reporting","Market Intelligence"].map(p => (
              <span key={p} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs">{p}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Progress */}
      <div className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-3">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Application progress</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="w-10 text-right text-xs font-medium text-primary">{progress}%</span>
        </div>
      </div>

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">

        <Section title="Membership tier" desc="Select the tier that best reflects your organisation's capacity and engagement level.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TIERS.map((t) => (
              <button key={t.key} type="button" onClick={() => setTier(t.key)}
                className={`rounded-xl border p-4 text-left transition ${tier === t.key ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "hover:border-primary/40"}`}>
                <div className="font-display text-lg">{t.label}</div>
                <div className="mt-1 text-xs text-muted-foreground">{t.fee}</div>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Organisation details">
          <Row>
            <Field label="Organisation name *"><Input value={orgName} onChange={setOrgName} placeholder="Full registered name" /></Field>
            <Field label="Organisation type *">
              <Select value={orgType} onChange={setOrgType} options={[{key:"",label:"Select type"}, ...ORG_TYPES]} />
            </Field>
          </Row>
          <Row>
            <Field label="City / State *"><Input value={city} onChange={setCity} placeholder="e.g. Lagos, Abuja, Kano" /></Field>
            <Field label="Website"><Input value={website} onChange={setWebsite} placeholder="https://" /></Field>
          </Row>
          <Row>
            <Field label="AUM / Annual budget">
              <Select value={aum} onChange={setAum} options={[{key:"",label:"Select range"}, ...AUM_OPTS.map(o=>({key:o,label:o}))]} />
            </Field>
            <Field label="Investment stage focus">
              <Select value={stage} onChange={setStage} options={[{key:"",label:"Select stage"}, ...STAGE_OPTS.map(o=>({key:o,label:o}))]} />
            </Field>
          </Row>
        </Section>

        <Section title="Primary contact">
          <Row>
            <Field label="First name *"><Input value={firstName} onChange={setFirstName} /></Field>
            <Field label="Last name *"><Input value={lastName} onChange={setLastName} /></Field>
          </Row>
          <Row>
            <Field label="Job title *"><Input value={jobTitle} onChange={setJobTitle} placeholder="e.g. CEO, Director of Investments" /></Field>
            <Field label="Work email *"><Input value={email} onChange={setEmail} type="email" placeholder="name@organisation.org" /></Field>
          </Row>
          <Row>
            <Field label="Phone"><Input value={phone} onChange={setPhone} type="tel" placeholder="+234 xxx xxx xxxx" /></Field>
            <Field label="LinkedIn"><Input value={linkedin} onChange={setLinkedin} placeholder="https://linkedin.com/in/..." /></Field>
          </Row>
          <Field label="Set a password * (min 8 characters)">
            <Input value={password} onChange={setPassword} type="password" placeholder="Choose a strong password" />
          </Field>
          <Field label="Preferred communication channel">
            <PillRow options={COMMS} value={commPref} onChange={setCommPref} />
          </Field>
        </Section>

        <Section title="SDG focus areas" desc="Select all Sustainable Development Goals your organisation actively works on.">
          <ChipGrid options={SDGS} selected={sdgs} onToggle={(v) => setSdgs(toggle(sdgs, v))} />
          <Divider>Investment sectors</Divider>
          <CheckGrid options={SECTORS} selected={sectors} onToggle={(v) => setSectors(toggle(sectors, v))} />
        </Section>

        <Section title="Ecosystem engagement">
          <Divider noTop>What do you hope to gain from NIEC?</Divider>
          <CheckGrid options={GOALS} selected={goals} onToggle={(v) => setGoals(toggle(goals, v))} />
          <Divider>What can your organisation contribute?</Divider>
          <CheckGrid options={CONTRIBUTIONS} selected={contributions} onToggle={(v) => setContributions(toggle(contributions, v))} />
          <Divider>How did you hear about NIEC?</Divider>
          <PillRow options={HEARD} value={heard} onChange={setHeard} />
          <Field label="Statement of intent">
            <p className="mb-2 text-xs text-muted-foreground">In 2–3 sentences, describe why your organisation wants to join NIEC and what impact you aim to make.</p>
            <textarea value={statement} onChange={(e) => setStatement(e.target.value)} rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          </Field>
        </Section>

        <Section title="IIF 2026 events" desc="Which flagship events would your organisation like to attend or sponsor?">
          <CheckGrid options={EVENTS} selected={eventsInterested} onToggle={(v) => setEventsInterested(toggle(eventsInterested, v))} />
          <Divider>Your participation role</Divider>
          <PillRow options={ROLES} value={eventRole} onChange={setEventRole} />
        </Section>

        <Section title="Declaration & consent">
          <div className="rounded-xl border border-gold/40 bg-gold/10 p-5">
            <p className="mb-3 text-xs text-gold-foreground/80">By submitting this application you confirm the following — please tick each item:</p>
            {CONSENTS.map((c, i) => (
              <label key={i} className="flex cursor-pointer items-start gap-3 py-2 text-sm">
                <input type="checkbox" checked={consents[i]} onChange={() => {
                  const next = [...consents]; next[i] = !next[i]; setConsents(next);
                }} className="mt-0.5 h-4 w-4 rounded border-gold accent-gold" />
                <span>{c}</span>
              </label>
            ))}
          </div>
        </Section>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button onClick={submit} disabled={busy}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60">
            {busy ? "Submitting…" : "Submit application"} <ChevronRight className="h-4 w-4" />
          </button>
          <Link to="/login" className="text-sm text-muted-foreground hover:text-primary">Already a member? Sign in →</Link>
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Reviewed by IIF within 5 business days
          </span>
        </div>
      </main>

      <footer className="mt-10 border-t py-8 text-center text-xs text-muted-foreground">
        Nigeria Impact Economy Community · Impact Investors Foundation · <a href="mailto:info@impactinvestorsfoundation.org" className="text-primary hover:underline">info@impactinvestorsfoundation.org</a>
      </footer>
    </div>
  );
}

/* ─── building blocks ────────────────────────────────────────────────── */

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b-[3px] border-gold bg-primary text-white">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-3">
        <div className="grid h-9 w-9 place-items-center rounded-md border-2 border-gold">
          <span className="font-display text-base text-gold">N</span>
        </div>
        <div className="leading-tight">
          <div className="font-display text-sm">Impact Investors Foundation</div>
          <div className="text-[10px] uppercase tracking-widest text-white/55">Nigeria Impact Economy Community</div>
        </div>
        <span className="ml-auto rounded-full bg-gold px-3 py-1 text-[10px] font-medium text-[#3a2500]">NIEC 2026</span>
      </div>
    </header>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm md:p-8">
      <h2 className="font-display text-xl text-primary">{title}</h2>
      {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
function Input({ value, onChange, type = "text", placeholder }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} type={type} placeholder={placeholder}
      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary" />
  );
}
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { key: string; label: string }[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary">
      {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
    </select>
  );
}
function PillRow({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)}
          className={`rounded-full border px-3.5 py-1.5 text-xs transition ${value === o ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground hover:border-primary/40"}`}>
          {o}
        </button>
      ))}
    </div>
  );
}
function ChipGrid({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button key={o} type="button" onClick={() => onToggle(o)}
            className={`rounded-full border px-3.5 py-1.5 text-xs transition ${on ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground hover:border-primary/40"}`}>
            {o}
          </button>
        );
      })}
    </div>
  );
}
function CheckGrid({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button key={o} type="button" onClick={() => onToggle(o)}
            className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition ${on ? "border-primary bg-primary/5" : "border-input hover:border-primary/40"}`}>
            <span className={`mt-0.5 grid h-4 w-4 flex-shrink-0 place-items-center rounded border ${on ? "border-primary bg-primary text-white" : "border-input bg-white"}`}>
              {on && <Check className="h-3 w-3" />}
            </span>
            <span className="text-foreground">{o}</span>
          </button>
        );
      })}
    </div>
  );
}
function Divider({ children, noTop }: { children: React.ReactNode; noTop?: boolean }) {
  return <div className={`${noTop ? "" : "mt-2 pt-4"} text-xs font-semibold uppercase tracking-wider text-muted-foreground`}>{children}</div>;
}
