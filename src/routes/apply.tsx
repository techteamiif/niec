import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { initMembershipPayment } from "@/lib/payments.functions";
import { submitJoinApplication } from "@/lib/applications.functions";
import { useAuth } from "@/lib/auth";
import { NIGERIA_LOCATIONS, NIGERIAN_STATES, type NigerianState } from "@/lib/nigeriaLocations";
import {
  AUM_OPTIONS as AUM_OPTS,
  COMMUNICATION_OPTIONS as COMMS,
  CONTRIBUTION_OPTIONS as CONTRIBUTIONS,
  EVENT_OPTIONS as EVENTS,
  EVENT_ROLE_OPTIONS as ROLES,
  GOAL_OPTIONS as GOALS,
  HEARD_OPTIONS as HEARD,
  INVESTMENT_STAGE_OPTIONS as STAGE_OPTS,
  JOB_TITLES,
  ORG_TYPES,
  SDG_OPTIONS as SDGS,
  SECTOR_OPTIONS as SECTORS,
} from "@/lib/onboarding-options";
import { toast } from "sonner";
import { Check, ChevronRight, ChevronDown, ShieldCheck, Eye, EyeOff, Search, X, UserRound } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import type { Database, Json } from "@/integrations/supabase/types";



export const Route = createFileRoute("/apply")({
  head: () => ({
    meta: [
      { title: "Apply for NIEC membership — Impact Investors Foundation" },
      { name: "description", content: "Apply to join the Nigeria Impact Economy Community — a members' network for impact investors, social enterprises and ecosystem partners." },
    ],
  }),
  component: () => <ApplyPage mode="signup" />,
});

export function ApplyOnboardingPage() {
  return <ApplyPage mode="onboarding" />;
}

// const [password, setPassword] = useState();

const TIERS = [
  { key: "observer", label: "Observer", fee: "Free" },
  { key: "contributor", label: "Enterprise", fee: "₦100k – ₦250k / yr" },
  { key: "growth_partner", label: "Growth Partner", fee: "₦500k / yr" },
  { key: "anchor", label: "Anchor Partner", fee: "₦1.5M / yr" },
  { key: "strategic_partner", label: "Strategic Partner", fee: "Negotiated" },
] as const;

const PAYABLE: Record<string, number> = {
  contributor: 100_000,
  growth_partner: 500_000,
  anchor: 1_500_000,
};

const PERSONAL_TITLES = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Prof", "Engr", "Rev", "Other"];
const QUALIFICATION_DEPARTMENTS = [
  "Agriculture & Food Systems",
  "Business & Management",
  "Economics & Finance",
  "Education",
  "Engineering & Technology",
  "Environmental & Climate Studies",
  "Health Sciences",
  "Law",
  "Public Policy & Administration",
  "Social Sciences",
  "Other",
];
const QUALIFICATION_POSITIONS = [
  "Undergraduate Student",
  "Graduate Student",
  "Researcher",
  "Postdoctoral Researcher",
  "Lecturer",
  "Senior Lecturer",
  "Professor",
  "Professional",
  "Other",
];
const RESEARCH_INTEREST_OPTIONS = [
  "Climate Change",
  "Renewable Energy",
  "Sustainable Development",
  "Environmental Science",
  "Clean Technology",
  "Green Technology",
  "Carbon Reduction",
  "Energy Efficiency",
  "Agriculture & Food Systems",
  "Impact Investing",
  "Social Entrepreneurship",
  "Financial Inclusion",
  "Gender Equality",
  "Public Health",
  "Education",
  "Economic Development",
  "Public Policy",
  "Sustainable Finance",
  "Circular Economy",
  "Biodiversity Conservation",
];

const CONSENTS = [
  "I confirm that the information provided is accurate and I am authorised to represent my organisation.",
  "I consent to IIF / NIEC storing and using this data for membership processing, community matching, and event communications.",
  "I understand that my membership profile may be shared within the NIEC CRM for ecosystem matchmaking purposes.",
];
const INDIVIDUAL_CONSENTS = [
  "I confirm that the information provided is accurate and belongs to me.",
  "I consent to IIF / NIEC storing and using this data for membership processing, community matching, and event communications.",
  "I understand that my membership profile may be shared within the NIEC CRM for ecosystem matchmaking purposes.",
];

function toggle<T>(arr: T[], v: T) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function ApplyPage({ mode }: { mode: "signup" | "onboarding" }) {
  const navigate = useNavigate();
  const { user, profile, loading, refresh, signOut } = useAuth();
  const [tier, setTier] = useState<typeof TIERS[number]["key"] | "">("");
  const [accountType, setAccountType] = useState<"organisation" | "individual">("organisation");
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("");
  const [orgTypeOpen, setOrgTypeOpen] = useState(false);
  const [state, setState] = useState<NigerianState | "">("");
  const [lga, setLga] = useState("");
  const [website, setWebsite] = useState("");
  const [aum, setAum] = useState("");
  const [stage, setStage] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [personalTitle, setPersonalTitle] = useState("");
  const [individualRole, setIndividualRole] = useState("");
  const [qualificationDepartment, setQualificationDepartment] = useState("");
  const [qualificationPosition, setQualificationPosition] = useState("");
  const [qualificationInstitution, setQualificationInstitution] = useState("");
  const [researchInterests, setResearchInterests] = useState("");
  const [researchInterestOpen, setResearchInterestOpen] = useState(false);
  const [researchArea, setResearchArea] = useState("");
  const [individualBio, setIndividualBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
  const [resendingEmail, setResendingEmail] = useState(false);
  const [done, setDone] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [step, setStep] = useState(mode === "onboarding" ? 2 : 1);
  const isIndividual = mode === "onboarding" && accountType === "individual";

  useEffect(() => {
    if (!user) return;
    setAccountType(user.user_metadata.account_type === "individual" ? "individual" : "organisation");
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const metadata = user.user_metadata;
    const fullName = typeof metadata.full_name === "string" ? metadata.full_name : profile?.full_name ?? "";
    const [metadataFirstName = "", ...lastNameParts] = fullName.split(" ");
    setFirstName(typeof metadata.first_name === "string" ? metadata.first_name : metadataFirstName);
    setLastName(typeof metadata.last_name === "string" ? metadata.last_name : lastNameParts.join(" "));
    const savedJobTitle = typeof metadata.role_title === "string" ? metadata.role_title : profile?.role_title ?? "";
    setJobTitle(JOB_TITLES.includes(savedJobTitle) ? savedJobTitle : "");
    setPersonalTitle(typeof metadata.personal_title === "string" ? metadata.personal_title : "");
    setIndividualRole(typeof metadata.professional_role === "string" ? metadata.professional_role : savedJobTitle);
    setQualificationDepartment(typeof metadata.qualification_department === "string" ? metadata.qualification_department : "");
    setQualificationPosition(typeof metadata.qualification_position === "string" ? metadata.qualification_position : "");
    setQualificationInstitution(typeof metadata.qualification_institution === "string" ? metadata.qualification_institution : "");
    setResearchInterests(typeof metadata.research_interests === "string" ? metadata.research_interests : "");
    setResearchArea(typeof metadata.research_area === "string" ? metadata.research_area : "");
    setIndividualBio(typeof metadata.bio === "string" ? metadata.bio : "");
    setEmail(user.email ?? profile?.email ?? "");
    setPhone(typeof metadata.phone === "string" ? metadata.phone : "");
    setLinkedin(typeof metadata.linkedin_url === "string" ? metadata.linkedin_url : "");
    setAvatarUrl(profile?.avatar_url ?? "");
    const savedLocation = profile?.location?.split(",").map((part) => part.trim()) ?? [];
    const metadataState = typeof metadata.state === "string" ? metadata.state : "";
    const savedState = savedLocation.length > 1
      ? savedLocation[savedLocation.length - 1]
      : savedLocation[0] || metadataState;
    if (savedState && NIGERIAN_STATES.includes(savedState as NigerianState)) {
      setState(savedState as NigerianState);
      const savedLga = savedLocation.length > 1 ? savedLocation.slice(0, -1).join(", ") : "";
      const matchingLgas = NIGERIA_LOCATIONS[savedState as NigerianState] as readonly string[];
      setLga(matchingLgas.includes(savedLga) ? savedLga : "");
    }
  }, [user, profile]);

  useEffect(() => {
    if (loading) return;
    if (mode === "onboarding" && !user) {
      navigate({ to: "/login", search: { next: "/onboarding" }, replace: true });
    } else if (mode === "signup" && user && profile) {
      navigate({ href: profile.crm_stage === "applicant" ? "/dashboard" : "/onboarding", replace: true });
    }
  }, [loading, mode, user, profile, navigate]);

  const handlePhoneChange = (value: string) => {
    const trimmedValue = value.trim();
    const nationalNumber = trimmedValue.startsWith("+234")
      ? trimmedValue.slice(4)
      : trimmedValue;
    let digits = nationalNumber.replace(/\D/g, "");
    if (digits.startsWith("0")) digits = digits.slice(1);

    if (digits.length > 10) {
      toast.error("Phone number cannot exceed 11 digits.");
      return;
    }
    setPhone(digits);
  };

  const validatePhone = () => {
    if (!phone.trim()) return true;

    if (phone.length !== 10) {
      toast.error("Phone number must be 11 digits.");
      return false;
    }
    return true;
  };

  const createAccount = async () => {
    if (!firstName || !lastName || !jobTitle || !email || !password || !confirmPassword) {
      toast.error("Please complete all required fields.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Password does not match.");
      return;
    }
    if (!validatePhone()) return;

    setBusy(true);
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login?next=${encodeURIComponent("/onboarding")}`,
          data: {
            full_name: fullName,
            first_name: firstName,
            last_name: lastName,
            role_title: jobTitle,
            phone,
            linkedin_url: linkedin,
          },
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error("The account could not be created.");

      if (data.session) {
        toast.success("Account created. Continue with your onboarding.");
        navigate({ to: "/onboarding", replace: true });
      } else {
        setAccountCreated(true);
        toast.success("Account created. Verify your email to continue.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create account.");
    } finally {
      setBusy(false);
    }
  };

  const resendConfirmationEmail = async () => {
    setResendingEmail(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/login?next=${encodeURIComponent("/onboarding")}`,
        },
      });
      if (error) throw error;
      toast.success("Confirmation email sent", { description: "Check your inbox." });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resend confirmation email.");
    } finally {
      setResendingEmail(false);
    }
  };

  const nextStep = () => {
    if (step === 2) {
      const missingDetails = isIndividual
        ? [
            !personalTitle && "title",
            !qualificationDepartment && "qualification department",
            !qualificationPosition && "qualification position",
            !qualificationInstitution && "institution or organisation",
            !researchInterests && "research interests",
            !state && "state",
          ].filter(Boolean)
        : [
            !orgName && "organisation name",
            !orgType && "organisation type",
            !state && "state",
            !lga && "local government area",
          ].filter(Boolean);
      if (missingDetails.length > 0) {
        toast.error(`Please provide your ${missingDetails.join(", ")}.`);
        return;
      }
      if (!tier) {
        toast.error("Please select a membership tier first.");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, 3));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, mode === "onboarding" ? 2 : 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const progress = useMemo(() => {
    const required = [orgName, orgType, state, lga, firstName, lastName, jobTitle, email, password, confirmPassword, tier];
    const filled = required.filter(Boolean).length;
    return Math.round((filled / required.length) * 100);
  }, [orgName, orgType, state, lga, firstName, lastName, jobTitle, email, password, confirmPassword, tier]);

  const allConsented = consents.every(Boolean);
  const phoneNumber = phone ? `+234${phone}` : "";
  const location = `${lga}, ${state}`;

  const submit = async () => {
    if (!user) {
      toast.error("Please sign in to continue with onboarding.");
      navigate({ to: "/login", search: { next: "/onboarding" } });
      return;
    }
    if (!tier || (!isIndividual && (!orgName || !orgType || !lga)) || !state || (isIndividual && !lga) || !firstName || !lastName ||
      (!isIndividual && !jobTitle) || (isIndividual && (!personalTitle || !qualificationDepartment || !qualificationPosition || !qualificationInstitution || !researchInterests)) || !email) {
      toast.error("Please complete all required fields and pick a tier.");
      return;
    }
    if (!validatePhone()) return;
    if (!allConsented) { toast.error("Please tick all three consent boxes."); return; }

    setBusy(true);
    try {
      const full_name = `${firstName} ${lastName}`.trim();
      const userId = user.id;
      const applicationOrganisation = isIndividual ? "Individual member" : orgName;
      const applicationOrgType: Database["public"]["Enums"]["org_type"] = isIndividual
        ? "other"
        : orgType as Database["public"]["Enums"]["org_type"];
      const applicationLocation = location;
      const qualificationSummary = [qualificationPosition, qualificationDepartment, qualificationInstitution].filter(Boolean).join(" — ");
      const application_data = {
        account_type: isIndividual ? "individual" : "organisation",
        personal_title: isIndividual ? personalTitle : "",
        qualification: isIndividual ? qualificationSummary : "",
        qualification_department: isIndividual ? qualificationDepartment : "",
        qualification_position: isIndividual ? qualificationPosition : "",
        qualification_institution: isIndividual ? qualificationInstitution : "",
        research_interests: isIndividual ? researchInterests : "",
        research_area: isIndividual ? researchArea : "",
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
        _organisation_name: applicationOrganisation,
        _organisation_type: applicationOrgType,
        _role_title: isIndividual ? (individualRole || personalTitle) : jobTitle,
        _location: applicationLocation,
        _website_url: website || "",
        _linkedin_url: linkedin || "",
        _phone: phoneNumber,
        _sdg_focus: sdgs,
        _sectors: sectors,
        _bio: isIndividual ? individualBio : statement || "",
        _application_data: application_data as Json,
      });
      if (rpcErr) throw rpcErr;
      await refresh();

      // Record the application for the NIEC team (CRM + email notification)
      try {
        const res = await submitJoinApplication({
          data: {
            userId,
            fullName: full_name,
            email,
            phone: phoneNumber,
            memberType: isIndividual ? "individual" : "organisation",
            organisationName: applicationOrganisation,
            organisationType: isIndividual ? "Individual" : ORG_TYPES.find((o) => o.key === orgType)?.label ?? orgType,
            roleTitle: isIndividual ? (individualRole || personalTitle) : jobTitle,
            location: applicationLocation,
            website,
            linkedin,
            personalTitle: isIndividual ? personalTitle : "",
            qualification: isIndividual ? qualificationSummary : "",
            qualificationDepartment: isIndividual ? qualificationDepartment : "",
            qualificationPosition: isIndividual ? qualificationPosition : "",
            qualificationInstitution: isIndividual ? qualificationInstitution : "",
            researchInterests: isIndividual ? researchInterests : "",
            researchArea: isIndividual ? researchArea : "",
            bio: isIndividual ? individualBio : "",
            avatarUrl,
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
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

  if (mode === "onboarding" && (loading || !user)) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (done || (mode === "signup" && accountCreated)) {
    const awaitingVerification = mode === "signup" && accountCreated;
    return (
      <div className="min-h-screen bg-[#F7FBFA]">
        <PublicHeader />
        <div className="mx-auto max-w-xl px-6 py-20 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary/10">
            <Check className="h-10 w-10 text-primary" />
          </div>
          <h1 className="mt-6 font-display text-3xl text-primary">
            {awaitingVerification ? "Verify your email address" : "Application submitted"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {awaitingVerification ? (
              <>Please check your inbox and click the confirmation link to complete your account setup.</>
            ) : (
              <>Thank you, {firstName}. Your {isIndividual ? "individual membership application" : <>application for <strong>{orgName}</strong></>} has been received. Your account is ready to use — continue to your dashboard to get started.</>
            )}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {awaitingVerification ? (
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={resendConfirmationEmail}
                  disabled={resendingEmail}
                  className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resendingEmail ? "Sending…" : "Resend Email"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccountCreated(false);
                    setStep(1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  Change Email Address
                </button>
              </div>
            ) : (
              <>
                <Link to="/" className="rounded-md border px-5 py-2.5 text-sm hover:bg-muted">Go home</Link>
                <Link to="/dashboard" className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  Continue to dashboard
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7FBFA]">
      <PublicHeader />

      {/* Hero */}
      <section className="px-6 pt-8 text-start text-black">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-3xl md:text-5xl">
            {mode === "onboarding" ? `Hi, ${firstName || "there"}` : <>Join the <span className="text-gold">NIEC</span> Community</>}
          </h1>
          <p className="mt-4 text-black/75">
            {mode === "onboarding"
              ? "Kindly complete your onboarding"
              : "Apply for membership in Nigeria's premier impact economy network — connecting capital and community for Africa's new economy."}
          </p>
          {/* <div className="mt-5 flex flex-wrap justify-center gap-2">
            {["Deal Flow","Policy Influence","GIIS · Summit · ACII","SDG Reporting","Market Intelligence"].map(p => (
              <span key={p} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs">{p}</span>
            ))}
          </div> */}
        </div>
      </section>

      {/* Progress */}
      {/* <div className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-3">
          <span className="text-xs uppercase tracking-wider text-muted-foreground whitespace-nowrap">Step {step} of 3</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="w-10 text-right text-xs font-medium text-primary">{progress}%</span>
        </div>
      </div> */}

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">

        {step === 2 && (
          <>
        {mode === "onboarding" && (
          <Section title="Choose your account type" desc="Select whether you're applying as an organisation or as an individual.">
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                { key: "organisation", label: "Organisation", description: "Apply on behalf of an organisation." },
                { key: "individual", label: "Individual", description: "Apply as an individual member." },
              ] as const).map((type) => (
                <button
                  key={type.key}
                  type="button"
                  aria-pressed={accountType === type.key}
                  onClick={() => setAccountType(type.key)}
                  className={`rounded-xl border p-4 text-left transition ${accountType === type.key ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "hover:border-primary/40"}`}
                >
                  <span className="block font-medium">{type.label}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{type.description}</span>
                </button>
              ))}
            </div>
          </Section>
        )}
        {isIndividual ? (
          <>
            <Section title="Individual profile" desc="Complete your personal and professional profile.">
              <Field label="Select title *">
                <Select
                  value={personalTitle}
                  onChange={setPersonalTitle}
                  options={[{ key: "", label: "Select title" }, ...PERSONAL_TITLES.map((title) => ({ key: title, label: title }))]}
                />
              </Field>
              <Row>
                <Field label="Select state *">
                  <LocationDropdown
                    value={state}
                    options={NIGERIAN_STATES}
                    placeholder="Select state"
                    onChange={(value) => {
                      setState(value as NigerianState);
                      setLga("");
                    }}
                  />
                </Field>
                <Field label="Local Government Area *">
                  <LocationDropdown
                    value={lga}
                    options={state ? NIGERIA_LOCATIONS[state] : []}
                    placeholder={state ? "Select LGA" : "Select a state first"}
                    disabled={!state}
                    onChange={setLga}
                  />
                </Field>
              </Row>
              <Field label="Bio / description">
                <textarea value={individualBio} onChange={(event) => setIndividualBio(event.target.value)} rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </Field>
              <Row>
                <Field label="Department *">
                  <Select
                    value={qualificationDepartment}
                    onChange={setQualificationDepartment}
                    options={[{ key: "", label: "Select department" }, ...QUALIFICATION_DEPARTMENTS.map((department) => ({ key: department, label: department }))]}
                  />
                </Field>
                <Field label="Position *">
                  <Select
                    value={qualificationPosition}
                    onChange={setQualificationPosition}
                    options={[{ key: "", label: "Select position" }, ...QUALIFICATION_POSITIONS.map((position) => ({ key: position, label: position }))]}
                  />
                </Field>
              </Row>
              <Field label="Institution or organisation *">
                <Input value={qualificationInstitution} onChange={setQualificationInstitution} placeholder="Enter name" />
              </Field>
              <Field label="Current research area (optional)">
                <textarea
                  value={researchArea}
                  onChange={(event) => setResearchArea(event.target.value)}
                  rows={3}
                  placeholder="Description of research area"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </Field>
              <Row>
                <Field label="Research interests *">
                  <SearchableOptionsField
                    value={researchInterests}
                    onChange={setResearchInterests}
                    options={RESEARCH_INTEREST_OPTIONS}
                    placeholder="Search for research interests"
                    label="research interest"
                  />
                </Field>
                <Field label="Professional role">
                  <SearchableOptionsField
                    value={individualRole}
                    onChange={setIndividualRole}
                    options={JOB_TITLES}
                    placeholder="Search for professional roles"
                    label="professional role"
                    icon="user"
                  />
                </Field>
              </Row>
            </Section>
            <Section title="Membership tier" desc="Select the tier that best reflects your capacity and engagement level.">
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
          </>
        ) : (
          <>
        <Section title="Organisation details">
          <Row>
            <Field label="Organisation name *"><Input value={orgName} onChange={setOrgName} placeholder="Full registered name" /></Field>
            <Field label="Organisation type *">
              <div className="relative">
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={orgTypeOpen}
                  onClick={() => setOrgTypeOpen((open) => !open)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-left text-sm outline-none focus:border-primary"
                >
                  <span className={orgType ? "text-foreground" : "text-muted-foreground"}>
                    {ORG_TYPES.find((type) => type.key === orgType)?.label ?? "Select type"}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
                {orgTypeOpen && (
                  <div
                    role="listbox"
                    className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-input bg-white shadow-lg [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
                  >
                    {ORG_TYPES.map((type) => (
                      <button
                        key={type.key}
                        type="button"
                        role="option"
                        aria-selected={orgType === type.key}
                        onClick={() => {
                          setOrgType(type.key);
                          setOrgTypeOpen(false);
                        }}
                        className="block w-full bg-white px-3 py-2 text-left text-sm text-foreground transition hover:bg-muted"
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Field>
          </Row>
          <Row>
            <Field label="State *">
              <LocationDropdown
                value={state}
                options={NIGERIAN_STATES}
                placeholder="Select state"
                onChange={(value) => {
                  setState(value as NigerianState);
                  setLga("");
                }}
              />
            </Field>
            <Field label="Local Government Area *">
              <LocationDropdown
                value={lga}
                options={state ? NIGERIA_LOCATIONS[state] : []}
                placeholder={state ? "Select LGA" : "Select a state first"}
                disabled={!state}
                onChange={setLga}
              />
            </Field>
          </Row>
          <Row>
            <Field label="Investment stage focus">
              <Select value={stage} onChange={setStage} options={[{ key: "", label: "Select stage" }, ...STAGE_OPTS.map(o => ({ key: o, label: o }))]} />
            </Field>
            <Field label="AUM / Annual budget">
              <Select value={aum} onChange={setAum} options={[{ key: "", label: "Select range" }, ...AUM_OPTS.map(o => ({ key: o, label: o }))]} />
            </Field>
          </Row>
          <Row>
            <div className="md:col-span-2">
              <Field label="Website"><Input value={website} onChange={setWebsite} placeholder="https://" /></Field>
            </div>
            {/* <Field label="Preferred communication channel">
              <LocationDropdown
                value={commPref}
                options={COMMS}
                placeholder="Select communication channel"
                onChange={setCommPref}
              />
            </Field> */}
          </Row>
        </Section>
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
          </>
        )}
        </>
        )}

        {step === 1 && (
          <>
        <Section title="Create an account" desc="Provide your personal and professional details to create a secure account.">
          <Row>
            <Field label="First name *"><Input value={firstName} placeholder="John" onChange={setFirstName} /></Field>
            <Field label="Last name *"><Input value={lastName} placeholder="Doe" onChange={setLastName} /></Field>
          </Row>
          {isIndividual ? (
            <>
              <Row>
                <Field label="Email address *"><Input value={email} onChange={setEmail} type="email" placeholder="name@example.com" /></Field>
                <Field label="Select title *">
                  <Select
                    value={personalTitle}
                    onChange={setPersonalTitle}
                    options={[{ key: "", label: "Select title" }, ...PERSONAL_TITLES.map((title) => ({ key: title, label: title }))]}
                  />
                </Field>
              </Row>
              <Field label="Bio / description">
                <textarea value={individualBio} onChange={(event) => setIndividualBio(event.target.value)} rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </Field>
              <Row>
                <Field label="Department *">
                  <Select
                    value={qualificationDepartment}
                    onChange={setQualificationDepartment}
                    options={[{ key: "", label: "Select department" }, ...QUALIFICATION_DEPARTMENTS.map((department) => ({ key: department, label: department }))]}
                  />
                </Field>
                <Field label="Position *">
                  <Select
                    value={qualificationPosition}
                    onChange={setQualificationPosition}
                    options={[{ key: "", label: "Select position" }, ...QUALIFICATION_POSITIONS.map((position) => ({ key: position, label: position }))]}
                  />
                </Field>
              </Row>
              <Field label="Institution or organisation *">
                <Input value={qualificationInstitution} onChange={setQualificationInstitution} placeholder="Enter name" />
              </Field>
              <Field label="Current research area (optional)">
                <textarea
                  value={researchArea}
                  onChange={(event) => setResearchArea(event.target.value)}
                  rows={3}
                  placeholder="Description of research area"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </Field>
              <Field label="Research interests *">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={researchInterestOpen}
                    aria-controls="research-interest-options"
                    value={researchInterests}
                    onFocus={() => setResearchInterestOpen(true)}
                    onBlur={() => setResearchInterestOpen(false)}
                    onChange={(event) => {
                      setResearchInterests(event.target.value);
                      setResearchInterestOpen(true);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setResearchInterestOpen(false);
                      if (event.key === "Enter" && researchInterestOpen) {
                        const firstMatch = RESEARCH_INTEREST_OPTIONS.find((interest) =>
                          interest.toLowerCase().includes(researchInterests.trim().toLowerCase()),
                        );
                        if (firstMatch) {
                          event.preventDefault();
                          setResearchInterests(firstMatch);
                          setResearchInterestOpen(false);
                        }
                      }
                    }}
                    placeholder="Search for research interests"
                    className="h-10 w-full rounded-md border border-input bg-background py-2 pl-9 pr-10 text-sm outline-none focus:border-primary"
                  />
                  {researchInterests && (
                    <button
                      type="button"
                      aria-label="Clear research interest"
                      onClick={() => {
                        setResearchInterests("");
                        setResearchInterestOpen(true);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {researchInterestOpen && (
                    <div
                      id="research-interest-options"
                      role="listbox"
                      className="absolute z-20 mt-2 max-h-60 w-full overflow-y-auto rounded-md border border-input bg-white p-1 shadow-lg"
                    >
                      {RESEARCH_INTEREST_OPTIONS
                        .filter((interest) => interest.toLowerCase().includes(researchInterests.trim().toLowerCase()))
                        .map((interest) => (
                          <button
                            key={interest}
                            type="button"
                            role="option"
                            aria-selected={researchInterests === interest}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setResearchInterests(interest);
                              setResearchInterestOpen(false);
                            }}
                            className="block w-full rounded px-3 py-2.5 text-left text-sm text-foreground hover:bg-muted"
                          >
                            {interest}
                          </button>
                        ))}
                      {RESEARCH_INTEREST_OPTIONS.every(
                        (interest) => !interest.toLowerCase().includes(researchInterests.trim().toLowerCase()),
                      ) && (
                        <p className="px-3 py-2.5 text-sm text-muted-foreground">No matching interests. You can enter a custom interest.</p>
                      )}
                    </div>
                  )}
                </div>
              </Field>
              <Field label="State *">
                <LocationDropdown
                  value={state}
                  options={NIGERIAN_STATES}
                  placeholder="Select state"
                  onChange={(value) => setState(value as NigerianState)}
                />
              </Field>
              <Row>
                <Field label="Phone">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">+234</span>
                    <Input value={phone} onChange={handlePhoneChange} type="tel" placeholder="800 000 0000" className="pl-14" />
                  </div>
                </Field>
                <Field label="LinkedIn"><Input value={linkedin} onChange={setLinkedin} placeholder="https://linkedin.com/in/..." /></Field>
              </Row>
            </>
          ) : (
          <>
          <Row>
            <Field label="Professional role *">
              <LocationDropdown
                value={jobTitle}
                options={JOB_TITLES}
                placeholder="Select professional role"
                onChange={setJobTitle}
              />
            </Field>
            <Field label="Email address *"><Input value={email} onChange={setEmail} type="email" placeholder="name@example.com" /></Field>
          </Row>
          <Row>
            <Field label="Phone">
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">+234</span>
                <Input value={phone} onChange={handlePhoneChange} type="tel" placeholder="800 000 0000" className="pl-14" />
              </div>
            </Field>
            <Field label="LinkedIn"><Input value={linkedin} onChange={setLinkedin} placeholder="https://linkedin.com/in/..." /></Field>
          </Row>
          </>
          )}
          <Field label="Set a password * (min 8 characters)">
            <div className="relative">
              <Input
                value={password}
                onChange={setPassword}
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                className="pr-10" // Extra right padding so text doesn't overlap the button
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </Field>
          <Field label="Confirm password">
            <div className="relative">
              <Input
                value={confirmPassword}
                onChange={setConfirmPassword}
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                className="pr-10" // Extra right padding so text doesn't overlap the button
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </Field>
        </Section>
        </>
        )}

        {step === 3 && (
          <>
        <Section title="SDG focus areas" desc={`Select all Sustainable Development Goals ${isIndividual ? "you" : "your organisation"} actively work on.`}>
          <CheckGrid options={SDGS} selected={sdgs} onToggle={(v) => setSdgs(toggle(sdgs, v))} />
          <Divider>Investment sectors</Divider>
          <CheckGrid options={SECTORS} selected={sectors} onToggle={(v) => setSectors(toggle(sectors, v))} />
        </Section>

        <Section title="Ecosystem engagement">
          <Divider noTop>What do you hope to gain from NIEC?</Divider>
          <CheckGrid options={GOALS} selected={goals} onToggle={(v) => setGoals(toggle(goals, v))} />
          <Divider>What can {isIndividual ? "you" : "your organisation"} contribute?</Divider>
          <CheckGrid options={CONTRIBUTIONS} selected={contributions} onToggle={(v) => setContributions(toggle(contributions, v))} />
          <Divider>How did you hear about NIEC?</Divider>
          <PillRow options={HEARD} value={heard} onChange={setHeard} />
          <Field label="Statement of intent">
            <p className="mb-2 text-xs text-muted-foreground">
              In 2–3 sentences, describe why {isIndividual ? "you" : "your organisation"} want{isIndividual ? "" : "s"} to join NIEC and what impact you aim to make.
            </p>
            <textarea value={statement} onChange={(e) => setStatement(e.target.value)} rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          </Field>
        </Section>
          <Section title="Declaration & consent">
            <div className="rounded-xl border border-gold/40 bg-gold/10 p-5">
              <p className="mb-3 text-xs text-gold-foreground/80">By submitting this application you confirm the following — please tick each item:</p>
              {(isIndividual ? INDIVIDUAL_CONSENTS : CONSENTS).map((c, i) => (
                <label key={i} className="flex cursor-pointer items-start gap-3 py-2 text-sm">
                  <input type="checkbox" checked={consents[i]} onChange={() => {
                    const next = [...consents]; next[i] = !next[i]; setConsents(next);
                  }} className="mt-0.5 h-4 w-4 rounded border-gold accent-gold" />
                  <span>{c}</span>
                </label>
              ))}
            </div>
          </Section>
        </>
        )}

      
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {step > (mode === "onboarding" ? 2 : 1) && (
            <button onClick={prevStep} type="button"
              className="inline-flex items-center gap-2 rounded-md border bg-white px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-muted">
              Previous
            </button>
          )}
          
          {step === 1 && mode === "signup" ? (
            <button onClick={createAccount} disabled={busy} type="button"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60">
              {busy ? "Creating account…" : "Create account"} <ChevronRight className="h-4 w-4" />
            </button>
          ) : step < 3 ? (
            <button onClick={nextStep} type="button"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={submit} disabled={busy} type="button"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60">
              {busy ? "Submitting…" : "Submit application"} <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {user ? (
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground transition hover:text-primary"
            >
              Sign out
            </button>
          ) : (
            <Link to="/login" className="text-sm text-muted-foreground hover:text-primary ml-3">Already a member? Sign in</Link>
          )}
        </div>
        {/* <div className="flex justify-center pt-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Reviewed by IIF within 5 business days
          </span>
        </div> */}
      </main>

      <footer className="mt-10 border-t py-8 text-center text-xs text-muted-foreground">
        Nigeria Impact Economy Community · Impact Investors Foundation · <a href="mailto:info@impactinvestorsfoundation.org" className="text-primary hover:underline">info@impactinvestorsfoundation.org</a>
      </footer>
    </div>
  );
}

/* ─── building blocks ────────────────────────────────────────────────── */

function SearchableOptionsField({
  value,
  onChange,
  options,
  placeholder,
  label,
  icon = "search",
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder: string;
  label: string;
  icon?: "search" | "user";
}) {
  const [open, setOpen] = useState(false);
  const listId = `searchable-${label.replace(/\s+/g, "-")}-options`;
  const matchingOptions = options.filter((option) =>
    option.toLowerCase().includes(value.trim().toLowerCase()),
  );

  return (
    <div className="relative">
      {icon === "user" ? (
        <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      ) : (
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      )}
      <input
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        value={value}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "Enter" && open && matchingOptions[0]) {
            event.preventDefault();
            onChange(matchingOptions[0]);
            setOpen(false);
          }
        }}
        placeholder="Search for research interests"
        className="h-10 w-full rounded-md border border-input bg-background py-2 pl-9 pr-10 text-sm outline-none focus:border-primary"
      />
      {value && (
        <button
          type="button"
          aria-label={`Clear ${label}`}
          onClick={() => {
            onChange("");
            setOpen(true);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {open && (
        <div
          id={listId}
          role="listbox"
          className="absolute z-20 mt-2 max-h-60 w-full overflow-y-auto rounded-md border border-input bg-white p-1 shadow-lg"
        >
          {matchingOptions.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={value === option}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className="block w-full rounded px-3 py-2.5 text-left text-sm text-foreground hover:bg-muted"
            >
              {option}
            </button>
          ))}
          {matchingOptions.length === 0 && (
            <p className="px-3 py-2.5 text-sm text-muted-foreground">No matching {label}s. You can enter a custom value.</p>
          )}
        </div>
      )}
    </div>
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
  const requiredMarkerIndex = label.indexOf("*");

  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {requiredMarkerIndex === -1 ? label : (
          <>
            {label.slice(0, requiredMarkerIndex)}
            <span className="text-red-600">*</span>
            {label.slice(requiredMarkerIndex + 1)}
          </>
        )}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
function Input({ value, onChange, type = "text", placeholder, className = "", list, onFocus, onBlur }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string; className?: string; list?: string; onFocus?: () => void; onBlur?: () => void; }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      type={type}
      placeholder={placeholder}
      list={list}
      className={`h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary ${className}`}
    />
  );
}
function LocationDropdown({
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
}: {
  value: string;
  options: readonly string[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-left text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && !disabled && (
        <div
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-input bg-white shadow-lg [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
        >
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={value === option}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className="block w-full bg-white px-3 py-2 text-left text-sm text-foreground transition hover:bg-muted"
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { key: string; label: string }[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className={`h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary`} >
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
