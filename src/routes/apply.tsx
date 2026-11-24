import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCountries, getCountryCallingCode, isValidPhoneNumber, type CountryCode } from "libphonenumber-js";
import { supabase } from "@/integrations/supabase/client";
import { linkGuestResourcePurchases } from "@/lib/payments.functions";
import { submitJoinApplication } from "@/lib/applications.functions";
import { useAuth } from "@/lib/auth";
import { NIGERIA_LOCATIONS, NIGERIAN_STATES, type NigerianState } from "@/lib/nigeriaLocations";
import {
  AUM_OPTIONS as AUM_OPTS,
  CAPITAL_PROVIDED_OPTIONS,
  COMMUNICATION_OPTIONS as COMMS,
  CONTRIBUTION_OPTIONS as CONTRIBUTIONS,
  EVENT_OPTIONS as EVENTS,
  EVENT_ROLE_OPTIONS as ROLES,
  GOAL_OPTIONS as GOALS,
  HEARD_OPTIONS as HEARD,
  INVESTMENT_STAGE_OPTIONS as STAGE_OPTS,
  JOB_TITLES,
  ORG_TYPES,
  ORG_TYPES_WITH_AUM,
  ORG_TYPES_WITH_CAPITAL_PROVIDED,
  ORG_TYPES_WITH_INVESTMENT_STAGE,
  SDG_OPTIONS as SDGS,
  SECTOR_OPTIONS as SECTORS,
} from "@/lib/onboarding-options";
import { toast } from "sonner";
import { ArrowRight, Check, ChevronDown, Eye, EyeOff, Search, Settings, ShieldCheck, X } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { TierComparisonTable } from "@/components/TierComparisonTable";
import { pathWithNext, safeReturnPath } from "@/lib/safe-navigation";
import type { Database, Json } from "@/integrations/supabase/types";
import { z } from "zod";

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
const COUNTRY_OPTIONS = getCountries()
  .map((code) => ({
    code,
    name: countryNames.of(code) ?? code,
    callingCode: `+${getCountryCallingCode(code)}`,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));
const COUNTRY_LOCATION_OPTIONS = COUNTRY_OPTIONS.map(({ name }) => ({ key: name, label: name }));
const PHONE_COUNTRY_OPTIONS = COUNTRY_OPTIONS.map(({ code, name, callingCode }) => ({
  key: code,
  label: `${name} (${callingCode})`,
}));


export const Route = createFileRoute("/apply")({
  head: () => ({
    meta: [
      { title: "Apply for NIEC membership — Impact Investors Foundation" },
      { name: "description", content: "Apply to join the Nigeria Impact Economy Community — a members' network for impact investors, social enterprises and ecosystem partners." },
    ],
  }),
  validateSearch: z.object({
    email: z.string().optional(),
    next: z.string().optional().transform(safeReturnPath),
  }),
  component: SignupPage,
});

function SignupPage() {
  const { email, next } = Route.useSearch();
  return <ApplyPage mode="signup" initialEmail={email ?? ""} nextPath={next} />;
}

export function ApplyOnboardingPage({ nextPath }: { nextPath?: string }) {
  return <ApplyPage mode="onboarding" nextPath={nextPath} />;
}

// const [password, setPassword] = useState();

const TIERS = [
  {
    key: "observer",
    label: "Observer",
    displayLabel: "Observer",
    fee: "Free",
    description: "Govt, Regulators, Students, Researchers.",
  },
  {
    key: "contributor",
    label: "Enterprise",
    displayLabel: "Enterprise",
    fee: "₦100,000 / yr",
    description: "ESOs, Incubators, Advisors, and Emerging enterprises.",
  },
  {
    key: "growth_partner",
    label: "Growth Partner",
    displayLabel: "Growth Partner",
    fee: "₦500k / yr",
    description: "Large ESOs, NGOs, consulting firms and active practitioners in the ecosystem.",
  },
  {
    key: "anchor",
    label: "Anchor Partner",
    displayLabel: "Anchor",
    fee: "₦1.5M / yr",
    description: "Corporates, Banks, Investors, Family offices.",
  },
  {
    key: "strategic_partner",
    label: "Strategic Partner",
    displayLabel: "Strategic Partner",
    fee: "Negotiated",
    description: "DFIs, multilateral organisations and global networks.",
  },
] as const;

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
const JOB_TITLE_DROPDOWN_OPTIONS = JOB_TITLES.map((title) => ({ key: title, label: title }));

function parseResearchInterests(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((interest): interest is string => typeof interest === "string" && interest.trim() !== "");
  }
  if (typeof value !== "string" || !value.trim()) return [];
  return value.split(/\s*;\s*/).filter(Boolean);
}

function formatResearchInterests(interests: string[]): string {
  return interests.join("; ");
}

const CONSENTS = [
  "I confirm that the information provided is accurate.",
  "I consent to IIF / NIEC storing and using this data for membership processing, community matching, and event communications.",
  "I understand that my membership profile may be shared within the NIEC CRM for ecosystem matchmaking purposes.",
];
const INDIVIDUAL_CONSENTS = [
  "I confirm that the information provided is accurate.",
  "I consent to IIF / NIEC storing and using this data for membership processing, community matching, and event communications.",
  "I understand that my membership profile may be shared within the NIEC CRM for ecosystem matchmaking purposes.",
];

function toggle<T>(arr: T[], v: T) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function maskEmail(email: string) {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return email;
  return `${localPart.slice(0, 4)}***@${domain}`;
}

const APPLICATION_DRAFT_STORAGE_PREFIX = "niec:application-draft:v1:";

function applicationDraftKey(userId?: string) {
  return `${APPLICATION_DRAFT_STORAGE_PREFIX}${userId ?? "guest"}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ApplyPage({
  mode,
  initialEmail = "",
  nextPath,
}: {
  mode: "signup" | "onboarding";
  initialEmail?: string;
  nextPath?: string;
}) {
  const navigate = useNavigate();
  const linkGuestPurchases = useServerFn(linkGuestResourcePurchases);
  const { user, profile, loading, refresh, signOut } = useAuth();
  const draftKey = applicationDraftKey(user?.id);
  const [hydratedDraftKey, setHydratedDraftKey] = useState<string | null>(null);
  const [tier, setTier] = useState<typeof TIERS[number]["key"] | "">("");
  const [accountType, setAccountType] = useState<"organisation" | "individual" | "">("");
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("");
  const [orgTypeOpen, setOrgTypeOpen] = useState(false);
  const orgTypeDropdownRef = useDismissableDropdown<HTMLDivElement>(orgTypeOpen, setOrgTypeOpen);
  const [isInNigeria, setIsInNigeria] = useState(true);
  const [state, setState] = useState<NigerianState | "">("");
  const [lga, setLga] = useState("");
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");
  const [aum, setAum] = useState("");
  const [stage, setStage] = useState("");
  const [capitalProvided, setCapitalProvided] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [personalTitle, setPersonalTitle] = useState("");
  const [individualRole, setIndividualRole] = useState("");
  const [contactPersonFirstName, setContactPersonFirstName] = useState("");
  const [contactPersonLastName, setContactPersonLastName] = useState("");
  const [contactPersonRole, setContactPersonRole] = useState("");
  const [contactPersonEmail, setContactPersonEmail] = useState("");
  const [contactPersonPhone, setContactPersonPhone] = useState("");
  const [qualificationDepartment, setQualificationDepartment] = useState("");
  const [qualificationPosition, setQualificationPosition] = useState("");
  const [qualificationInstitution, setQualificationInstitution] = useState("");
  const [researchInterests, setResearchInterests] = useState<string[]>([]);
  const [researchArea, setResearchArea] = useState("");
  const [individualBio, setIndividualBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState("");
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>("NG");
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
  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);
  const isIndividual = mode === "onboarding" && accountType === "individual";
  const screenTitle = step === 1
    ? "Create your account"
    : step === 2
      ? accountType === "organisation"
        ? "Complete your organisation profile"
        : "Complete your profile"
      : step === 3
        ? "Choose your membership tier"
        : isIndividual
          ? "Complete your application"
          : "Complete your organisation's application";
  const screenDescription = step === 1
    ? "Create a secure account to continue with your application."
    : step === 2
      ? accountType === "organisation"
        ? "Provide your organisation and contact person details."
        : accountType === "individual"
          ? "Provide your personal and professional details."
          : "Choose an account type and provide your profile details."
      : step === 3
        ? `Select the tier that best reflects your ${isIndividual ? "capacity and engagement level" : "organisation's capacity and engagement level"}.`
        : isIndividual
          ? "Share your focus areas, engagement goals, and declaration to complete your application."
          : "Share your organisation's focus areas, engagement goals, and declaration to complete the application.";

  useEffect(() => {
    if (!user) return;
    const savedAccountType = user.user_metadata.account_type;
    setAccountType(savedAccountType === "individual" || savedAccountType === "organisation" ? savedAccountType : "");
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
    setContactPersonFirstName(typeof metadata.contact_person_first_name === "string" ? metadata.contact_person_first_name : (typeof metadata.first_name === "string" ? metadata.first_name : metadataFirstName));
    setContactPersonLastName(typeof metadata.contact_person_last_name === "string" ? metadata.contact_person_last_name : (typeof metadata.last_name === "string" ? metadata.last_name : lastNameParts.join(" ")));
    setContactPersonRole(typeof metadata.contact_person_role === "string" ? metadata.contact_person_role : "");
    setContactPersonEmail(typeof metadata.contact_person_email === "string" ? metadata.contact_person_email : user.email ?? "");
    setContactPersonPhone(typeof metadata.contact_person_phone === "string" ? metadata.contact_person_phone : "");
    setQualificationDepartment(typeof metadata.qualification_department === "string" ? metadata.qualification_department : "");
    setQualificationPosition(typeof metadata.qualification_position === "string" ? metadata.qualification_position : "");
    setQualificationInstitution(typeof metadata.qualification_institution === "string" ? metadata.qualification_institution : "");
    setResearchInterests(parseResearchInterests(metadata.research_interests));
    setResearchArea(typeof metadata.research_area === "string" ? metadata.research_area : "");
    setIndividualBio(typeof metadata.bio === "string" ? metadata.bio : "");
    setEmail(user.email ?? profile?.email ?? "");
    setPhone(typeof metadata.phone === "string" ? metadata.phone : "");
    setAvatarUrl(profile?.avatar_url ?? "");
    const savedLocation = profile?.location?.split(",").map((part) => part.trim()) ?? [];
    const metadataState = typeof metadata.state === "string" ? metadata.state : "";
    const savedState = savedLocation.length > 1
      ? savedLocation[savedLocation.length - 1]
      : savedLocation[0] || metadataState;
    if (savedState && NIGERIAN_STATES.includes(savedState as NigerianState)) {
      setIsInNigeria(true);
      setState(savedState as NigerianState);
      const savedLga = savedLocation.length > 1 ? savedLocation.slice(0, -1).join(", ") : "";
      const matchingLgas = NIGERIA_LOCATIONS[savedState as NigerianState] as readonly string[];
      setLga(matchingLgas.includes(savedLga) ? savedLga : "");
    } else if (profile?.location) {
      setIsInNigeria(false);
      setCountry(savedLocation[savedLocation.length - 1] || profile.location);
    }
  }, [user, profile]);

  useEffect(() => {
    if (loading || (mode === "onboarding" && !user)) return;

    let draft: Record<string, unknown> | null = null;
    try {
      const serializedDraft = localStorage.getItem(draftKey);
      if (serializedDraft) {
        const parsedDraft: unknown = JSON.parse(serializedDraft);
        if (!isRecord(parsedDraft)) throw new Error("The saved application draft has an invalid format.");
        draft = parsedDraft;
      }
    } catch (error) {
      console.error("[apply:draft:restore]", error);
      toast.error("Could not restore the saved application draft.");
      try {
        localStorage.removeItem(draftKey);
      } catch (removeError) {
        console.error("[apply:draft:remove-invalid]", removeError);
      }
    }

    if (draft) {
      const readString = (key: string) => {
        const value = draft?.[key];
        return typeof value === "string" ? value : undefined;
      };
      const readStringArray = (key: string) => {
        const value = draft?.[key];
        return Array.isArray(value)
          ? value.filter((entry): entry is string => typeof entry === "string")
          : undefined;
      };
      const savedTier = TIERS.find((option) => option.key === readString("tier"));
      if (savedTier) setTier(savedTier.key);
      const savedAccountType = readString("accountType");
      if (savedAccountType === "individual" || savedAccountType === "organisation") {
        setAccountType(savedAccountType);
      }
      const savedOrgType = readString("orgType");
      const validOrgType = ORG_TYPES.find((option) => option.key === savedOrgType);
      if (validOrgType) setOrgType(validOrgType.key);
      const savedIsInNigeria = draft.isInNigeria;
      if (typeof savedIsInNigeria === "boolean") setIsInNigeria(savedIsInNigeria);
      const savedState = readString("state");
      if (savedState !== undefined) {
        setState(NIGERIAN_STATES.includes(savedState as NigerianState) ? savedState as NigerianState : "");
      }
      const savedPhoneCountry = readString("phoneCountry");
      if (savedPhoneCountry && getCountries().includes(savedPhoneCountry as CountryCode)) {
        setPhoneCountry(savedPhoneCountry as CountryCode);
      }
      if (draft.researchInterests !== undefined) {
        setResearchInterests(parseResearchInterests(draft.researchInterests));
      }
      const stringSetters: [string, (value: string) => void][] = [
        ["orgName", setOrgName],
        ["lga", setLga],
        ["country", setCountry],
        ["website", setWebsite],
        ["aum", setAum],
        ["stage", setStage],
        ["capitalProvided", setCapitalProvided],
        ["firstName", setFirstName],
        ["lastName", setLastName],
        ["jobTitle", setJobTitle],
        ["personalTitle", setPersonalTitle],
        ["individualRole", setIndividualRole],
        ["contactPersonFirstName", setContactPersonFirstName],
        ["contactPersonLastName", setContactPersonLastName],
        ["contactPersonRole", setContactPersonRole],
        ["contactPersonEmail", setContactPersonEmail],
        ["contactPersonPhone", setContactPersonPhone],
        ["qualificationDepartment", setQualificationDepartment],
        ["qualificationPosition", setQualificationPosition],
        ["qualificationInstitution", setQualificationInstitution],
        ["researchArea", setResearchArea],
        ["individualBio", setIndividualBio],
        ["avatarUrl", setAvatarUrl],
        ["email", setEmail],
        ["phone", setPhone],
        ["commPref", setCommPref],
        ["eventRole", setEventRole],
        ["heard", setHeard],
        ["statement", setStatement],
      ];
      for (const [key, setter] of stringSetters) {
        const value = readString(key);
        if (value !== undefined) setter(value);
      }
      const arraySetters: [string, (value: string[]) => void][] = [
        ["sdgs", setSdgs],
        ["sectors", setSectors],
        ["goals", setGoals],
        ["contributions", setContributions],
        ["eventsInterested", setEventsInterested],
      ];
      for (const [key, setter] of arraySetters) {
        const value = readStringArray(key);
        if (value) setter(value);
      }
      if (typeof draft.step === "number" && Number.isInteger(draft.step)) {
        const minStep = mode === "onboarding" ? 2 : 1;
        setStep(Math.min(4, Math.max(minStep, draft.step)));
      }
    }
    setHydratedDraftKey(draftKey);
  }, [draftKey, loading, mode, user, profile]);

  useEffect(() => {
    if (hydratedDraftKey !== draftKey) return;
    try {
      if (done) {
        localStorage.removeItem(draftKey);
        return;
      }
      localStorage.setItem(draftKey, JSON.stringify({
        tier,
        accountType,
        orgName,
        orgType,
        isInNigeria,
        state,
        lga,
        country,
        website,
        aum,
        stage,
        capitalProvided,
        firstName,
        lastName,
        jobTitle,
        personalTitle,
        individualRole,
        contactPersonFirstName,
        contactPersonLastName,
        contactPersonRole,
        contactPersonEmail,
        contactPersonPhone,
        qualificationDepartment,
        qualificationPosition,
        qualificationInstitution,
        researchInterests,
        researchArea,
        individualBio,
        avatarUrl,
        email,
        phone,
        phoneCountry,
        commPref,
        sdgs,
        sectors,
        goals,
        contributions,
        eventsInterested,
        eventRole,
        heard,
        statement,
        step,
        savedAt: Date.now(),
      }));
    } catch (error) {
      console.error("[apply:draft:save]", error);
      toast.error("Could not save your application draft on this device.");
    }
  }, [
    draftKey,
    hydratedDraftKey,
    done,
    tier,
    accountType,
    orgName,
    orgType,
    isInNigeria,
    state,
    lga,
    country,
    website,
    aum,
    stage,
    capitalProvided,
    firstName,
    lastName,
    jobTitle,
    personalTitle,
    individualRole,
    contactPersonFirstName,
    contactPersonLastName,
    contactPersonRole,
    contactPersonEmail,
    contactPersonPhone,
    qualificationDepartment,
    qualificationPosition,
    qualificationInstitution,
    researchInterests,
    researchArea,
    individualBio,
    avatarUrl,
    email,
    phone,
    phoneCountry,
    commPref,
    sdgs,
    sectors,
    goals,
    contributions,
    eventsInterested,
    eventRole,
    heard,
    statement,
    step,
  ]);

  useEffect(() => {
    if (loading) return;
    if (mode === "onboarding" && !user) {
      navigate({
        to: "/login",
        search: { next: nextPath ?? "/onboarding" },
        replace: true,
      });
    } else if (mode === "signup" && user && profile) {
      const destination =
        profile.crm_stage === "applicant"
          ? nextPath ?? "/dashboard"
          : pathWithNext("/onboarding", nextPath);
      navigate({ href: destination, replace: true });
    }
  }, [loading, mode, user, profile, navigate, nextPath]);

  const handlePhoneChange = (value: string) => {
    let digits = value.replace(/\D/g, "");
    if (digits.startsWith("0")) digits = digits.slice(1);

    if (digits.length > 15) {
      toast.error("Phone number cannot exceed 15 digits.");
      return;
    }
    setPhone(digits);
  };

  const validatePhone = (value: string) => {
    if (!value.trim()) return true;

    if (!isValidPhoneNumber(value, phoneCountry)) {
      toast.error("Enter a valid phone number for the selected country.");
      return false;
    }
    return true;
  };

  const createAccount = async () => {
    if (!email || !password || !confirmPassword) {
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
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: new URL(
            pathWithNext("/email-verified", nextPath),
            window.location.origin,
          ).toString(),
          data: {
            account_type: "",
          },
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error("The account could not be created.");

      try {
        const guestDraftKey = applicationDraftKey();
        const guestDraft = localStorage.getItem(guestDraftKey);
        if (guestDraft) {
          const userDraftKey = applicationDraftKey(data.user.id);
          if (!localStorage.getItem(userDraftKey)) {
            localStorage.setItem(userDraftKey, guestDraft);
          }
          localStorage.removeItem(guestDraftKey);
        }
      } catch (draftError) {
        console.error("[apply:draft:migrate]", draftError);
        toast.error("Your account was created, but the application draft could not be linked to it. Keep this page open while continuing.");
      }

      if (data.session) {
        try {
          await linkGuestPurchases({ data: {} });
        } catch (linkError) {
          console.error(
            "[apply:link-guest-resource-purchases]",
            linkError instanceof Error ? linkError.message : "Unknown linking error",
          );
          toast.error(
            "Your account was created, but resource purchases could not be linked yet. Check your purchase email for the secure resource link.",
          );
        }
        toast.success("Account created. Continue with your onboarding.");
        navigate({ href: pathWithNext("/onboarding", nextPath), replace: true });
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
          emailRedirectTo: new URL(
            pathWithNext("/email-verified", nextPath),
            window.location.origin,
          ).toString(),
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
      if (!accountType) {
        toast.error("Please choose whether you are applying as an organisation or an individual.");
        return;
      }
      const missingDetails = isIndividual
        ? [
            !firstName && "first name",
            !lastName && "last name",
            !personalTitle && "title",
            ...(isInNigeria
              ? [!state && "state", !lga && "local government area"]
              : [!country.trim() && "country"]),
          ].filter(Boolean)
        : [
            !orgName && "organisation name",
            !orgType && "organisation type",
            ...(isInNigeria
              ? [!state && "state", !lga && "local government area"]
              : [!country.trim() && "country"]),
            !contactPersonFirstName && "contact person's first name",
            !contactPersonLastName && "contact person's last name",
            !contactPersonRole && "contact person's role",
            !contactPersonEmail && "contact person's email",
          ].filter(Boolean);
      if (missingDetails.length > 0) {
        toast.error(`Please provide your ${missingDetails.join(", ")}.`);
        return;
      }
    }
    if (step === 3) {
      if (!tier) {
        toast.error("Please select a membership tier first.");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, 4));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, mode === "onboarding" ? 2 : 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const allConsented = consents.every(Boolean);
  const callingCode = `+${getCountryCallingCode(phoneCountry)}`;
  const phoneCountryName = COUNTRY_OPTIONS.find(({ code }) => code === phoneCountry)?.name ?? phoneCountry;
  const phoneCountryLabel = `${phoneCountryName} (${callingCode})`;
  const phoneNumber = phone ? `${callingCode}${phone}` : "";
  const location = isInNigeria ? `${lga}, ${state}` : country.trim();

  const submit = async () => {
    if (!user) {
      toast.error("Please sign in to continue with onboarding.");
      navigate({ to: "/login", search: { next: "/onboarding" } });
      return;
    }
    const locationMissing = isInNigeria
      ? !state || !lga
      : !country.trim();
    if (!accountType || !tier || locationMissing || (!isIndividual && (!orgName || !orgType || !contactPersonFirstName || !contactPersonLastName || !contactPersonRole || !contactPersonEmail)) || (isIndividual && (!firstName || !lastName)) ||
      (isIndividual && !personalTitle) || !email) {
      toast.error("Please complete all required fields and pick a tier.");
      return;
    }
    if (!validatePhone(phone) || !validatePhone(contactPersonPhone)) return;
    if (!allConsented) { toast.error("Please tick all three consent boxes."); return; }

    setBusy(true);
    try {
      const full_name = isIndividual
        ? `${firstName} ${lastName}`.trim()
        : `${contactPersonFirstName} ${contactPersonLastName}`.trim();
      const userId = user.id;
      const applicationOrganisation = isIndividual ? "Individual member" : orgName;
      const applicationOrgType: Database["public"]["Enums"]["org_type"] = isIndividual
        ? "other"
        : orgType as Database["public"]["Enums"]["org_type"];
      const applicationLocation = location;
      const applicationEmail = isIndividual ? email : contactPersonEmail;
      const applicationPhone = isIndividual ? phoneNumber : contactPersonPhone ? `${callingCode}${contactPersonPhone.replace(/\D/g, "").replace(/^0/, "")}` : "";
      const applicationRole = isIndividual ? (individualRole || personalTitle) : contactPersonRole;
      const qualificationSummary = [qualificationPosition, qualificationDepartment, qualificationInstitution].filter(Boolean).join(" — ");
      const applicationStage = isIndividual
        ? ""
        : ORG_TYPES_WITH_INVESTMENT_STAGE.includes(orgType) ? stage : "Not applicable";
      const applicationAum = isIndividual
        ? ""
        : ORG_TYPES_WITH_AUM.includes(orgType) ? aum : "Not applicable";
      const applicationCapitalProvided = isIndividual
        ? ""
        : ORG_TYPES_WITH_CAPITAL_PROVIDED.includes(orgType) ? capitalProvided : "Not applicable";
      const application_data = {
        account_type: isIndividual ? "individual" : "organisation",
        personal_title: isIndividual ? personalTitle : "",
        qualification: isIndividual ? qualificationSummary : "",
        qualification_department: isIndividual ? qualificationDepartment : "",
        qualification_position: isIndividual ? qualificationPosition : "",
        qualification_institution: isIndividual ? qualificationInstitution : "",
        research_interests: isIndividual ? formatResearchInterests(researchInterests) : "",
        research_area: isIndividual ? researchArea : "",
        contact_person_first_name: isIndividual ? "" : contactPersonFirstName,
        contact_person_last_name: isIndividual ? "" : contactPersonLastName,
        contact_person_role: isIndividual ? "" : contactPersonRole,
        contact_person_email: isIndividual ? "" : contactPersonEmail,
        contact_person_phone: isIndividual ? "" : applicationPhone,
        requested_tier: tier,
        aum_range: applicationAum,
        investment_stage: applicationStage,
        capital_provided: applicationCapitalProvided,
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
        _role_title: applicationRole,
        _location: applicationLocation,
        _website_url: website || "",
        _linkedin_url: "",
        _phone: applicationPhone,
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
            email: applicationEmail,
            phone: applicationPhone,
            memberType: isIndividual ? "individual" : "organisation",
            organisationName: applicationOrganisation,
            organisationType: isIndividual ? "Individual" : ORG_TYPES.find((o) => o.key === orgType)?.label ?? orgType,
            roleTitle: applicationRole,
            location: applicationLocation,
            website,
            linkedin: "",
            personalTitle: isIndividual ? personalTitle : "",
            qualification: isIndividual ? qualificationSummary : "",
            qualificationDepartment: isIndividual ? qualificationDepartment : "",
            qualificationPosition: isIndividual ? qualificationPosition : "",
            qualificationInstitution: isIndividual ? qualificationInstitution : "",
            researchInterests: isIndividual ? formatResearchInterests(researchInterests) : "",
            researchArea: isIndividual ? researchArea : "",
            contactPersonFirstName: isIndividual ? "" : contactPersonFirstName,
            contactPersonLastName: isIndividual ? "" : contactPersonLastName,
            contactPersonRole: isIndividual ? "" : contactPersonRole,
            contactPersonEmail: isIndividual ? "" : contactPersonEmail,
            contactPersonPhone: isIndividual ? "" : applicationPhone,
            bio: isIndividual ? individualBio : "",
            avatarUrl,
            tier,
            tierLabel: TIERS.find((t) => t.key === tier)?.label ?? tier,
            amountNaira: 0,
            sdgFocus: sdgs,
            sectors,
            goals,
            contributions,
            eventsInterested,
            eventRole,
            heardFrom: heard,
            commPreference: commPref,
            aumRange: applicationAum,
            investmentStage: applicationStage,
            capitalProvided: applicationCapitalProvided,
            statement,
          },
        });
        if (!res.ok) {
          console.error("[apply:record] CRM record failed after application submission", res.error);
        }
      } catch (e) {
        console.error("[apply:record]", e);
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
            {awaitingVerification ? "Confirm your email" : "Application submitted"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {awaitingVerification ? (
              <>
                Your verification link has been sent to {maskEmail(email)}. Click the link to
                complete your setup.
              </>
            ) : isIndividual && tier === "contributor" ? (
              <>
                Thank you, {firstName}. Your individual membership application has been received.
                Your account is ready to use. Your Enterprise membership is free for 3 months,
                starting now.
              </>
            ) : (
              <>
                Thank you, {firstName}. Your{" "}
                {isIndividual ? "individual membership application" : <>application for <strong>{orgName}</strong></>}{" "}
                has been received. Your account is ready to use.
                {tier && tier !== "observer" ? (
                  <>
                    {" "}
                    Your {TIERS.find((item) => item.key === tier)?.displayLabel} membership is free
                    for 3 months, starting now. No payment or card details are required during the
                    free period; any later upgrade is paid manually through Paystack.
                  </>
                ) : (
                  " Your Observer membership is free."
                )}{" "}
                {nextPath
                  ? "Continue back to the resource you wanted to download."
                  : "Continue to your dashboard to get started."}
              </>
            )}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {awaitingVerification ? (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  Can't find it? Check your spam folder,
                </p>
                <button
                  type="button"
                  onClick={resendConfirmationEmail}
                  disabled={resendingEmail}
                  className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resendingEmail ? "Sending…" : "Resend the email"}
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
                  Change your email address
                </button>
              </div>
            ) : (
              <>
                <Link to="/" className="rounded-md border px-5 py-2.5 text-sm hover:bg-muted">Go home</Link>
                <button
                  type="button"
                  onClick={() => navigate({ href: nextPath ?? "/dashboard" })}
                  className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Continue
                </button>
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

      {/*
      {mode === "onboarding" && (
        <div className="py-6">
          <div
            aria-label="Application progress"
            className={`relative mx-auto flex items-start justify-between px-6 ${
              step === 3 ? "max-w-6xl" : "max-w-3xl"
            }`}
          >
            <div className="absolute left-[16.6667%] right-[16.6667%] top-5 h-1.5 rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-primary/70 transition-all duration-300"
                style={{ width: `${wizardProgress}%` }}
              />
            </div>
            {wizardSteps.map(({ label, Icon }, index) => {
              const stepNumber = index + 2;
              const isReached = stepNumber <= step;
              const isCurrent = stepNumber === step;
              return (
                <div
                  key={label}
                  aria-current={isCurrent ? "step" : undefined}
                  className="relative z-10 flex w-1/3 flex-col items-center gap-2 text-center"
                >
                  <div
                    className={`grid h-10 w-10 place-items-center rounded-full transition-all ${
                      isCurrent
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-md"
                        : stepNumber < step
                          ? "bg-primary text-primary-foreground"
                          : "border border-slate-200 bg-white text-slate-400"
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className={`text-xs sm:text-sm ${isCurrent ? "font-semibold text-primary" : isReached ? "text-foreground" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      */}

      <main className={`mx-auto ${step === 3 ? "max-w-6xl" : step === 1 ? "max-w-lg" : "max-w-3xl"} space-y-6 px-6 py-10`}>
        {step !== 1 && (
          <section aria-labelledby="application-step-title" className="space-y-1">
            <div
              className={
                step === 3
                  ? "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
                  : ""
              }
            >
              <div className="space-y-1">
                <h1 id="application-step-title" className="font-display text-xl text-primary">
                  {screenTitle}
                </h1>
                <p className="text-sm text-muted-foreground">{screenDescription}</p>
              </div>
              {step === 3 && (
                <div className="flex shrink-0 justify-end gap-3">
                  <button
                    onClick={prevStep}
                    type="button"
                    className="inline-flex items-center gap-2 rounded-md border bg-white px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
                  >
                    Previous
                  </button>
                  <button
                    onClick={nextStep}
                    type="button"
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    Next <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

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
        {accountType && (isIndividual ? (
          <>
            <Section title="Individual profile" desc="Complete your personal and professional profile.">
              <Row>
                <Field label="First Name *"><Input value={firstName} placeholder="John" onChange={setFirstName} /></Field>
                <Field label="Last Name *"><Input value={lastName} placeholder="Doe" onChange={setLastName} /></Field>
              </Row>
              <Row>
                <Field label="Select Title *">
                  <Select
                    value={personalTitle}
                    onChange={setPersonalTitle}
                    options={[{ key: "", label: "Select title" }, ...PERSONAL_TITLES.map((title) => ({ key: title, label: title }))]}
                  />
                </Field>
                <Field label="Professional Role (Optional)">
                  <SearchableOptionDropdown
                    selectedKey={individualRole}
                    onChange={setIndividualRole}
                    onClear={() => setIndividualRole("")}
                    options={JOB_TITLE_DROPDOWN_OPTIONS}
                    placeholder="Select or add a professional role"
                    searchPlaceholder="Search or add a professional role"
                    ariaLabel="Professional role"
                    allowCustom
                    onCustomValue={setIndividualRole}
                    clearable
                  />
                </Field>
              </Row>
              <ProfileLocationFields
                title="Location"
                isInNigeria={isInNigeria}
                setIsInNigeria={setIsInNigeria}
                state={state}
                setState={setState}
                lga={lga}
                setLga={setLga}
                country={country}
                setCountry={setCountry}
              />
              <Field label="Bio / Description">
                <textarea value={individualBio} onChange={(event) => setIndividualBio(event.target.value)} rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </Field>
              <Row>
                <Field label="Department (Optional)">
                  <Select
                    value={qualificationDepartment}
                    onChange={setQualificationDepartment}
                    options={[{ key: "", label: "Select department" }, ...QUALIFICATION_DEPARTMENTS.map((department) => ({ key: department, label: department }))]}
                  />
                </Field>
                <Field label="Department Role (Optional)">
                  <Select
                    value={qualificationPosition}
                    onChange={setQualificationPosition}
                    options={[{ key: "", label: "Select department role" }, ...QUALIFICATION_POSITIONS.map((position) => ({ key: position, label: position }))]}
                  />
                </Field>
              </Row>
              <Field label="Institution or Organisation (Optional)">
                <Input value={qualificationInstitution} onChange={setQualificationInstitution} placeholder="Enter name" />
              </Field>
              <Field label="Current Research Area (Optional)">
                <textarea
                  value={researchArea}
                  onChange={(event) => setResearchArea(event.target.value)}
                  rows={3}
                  placeholder="Description of research area"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </Field>
              <Field label="Research Interests (Optional)">
                <SearchableMultiSelectField
                  values={researchInterests}
                  onChange={setResearchInterests}
                  options={RESEARCH_INTEREST_OPTIONS}
                  placeholder="Search research interests"
                  ariaLabel="Research interests"
                  allowCustom
                />
              </Field>
            </Section>
          </>
        ) : (
          <>
        <Section title="Organisation details">
          <Row>
            <Field label="Organisation Name *"><Input value={orgName} onChange={setOrgName} placeholder="Enter name of organisation" /></Field>
            <Field label="Organisation Type *">
              <div ref={orgTypeDropdownRef} className="relative">
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={orgTypeOpen}
                  onClick={() => setOrgTypeOpen((open) => !open)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-left text-sm outline-none focus:border-primary"
                >
                  <span className={orgType ? "text-foreground" : "text-muted-foreground"}>
                    {ORG_TYPES.find((type) => type.key === orgType)?.label ?? "Select organisation type"}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
                {orgTypeOpen && (
                  <div
                    role="listbox"
                    className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-input bg-white shadow-lg [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
                  >
                      <button
                        type="button"
                        role="option"
                        aria-selected={!orgType}
                        onClick={() => {
                          setOrgType("");
                          setStage("");
                          setCapitalProvided("");
                          setAum("");
                          setOrgTypeOpen(false);
                        }}
                        className="block w-full bg-white px-3 py-2 text-left text-sm text-muted-foreground transition hover:bg-muted"
                      >
                        Select organisation type
                      </button>
                    {ORG_TYPES.map((type) => (
                      <button
                        key={type.key}
                        type="button"
                        role="option"
                        aria-selected={orgType === type.key}
                        onClick={() => {
                          setOrgType(type.key);
                          if (!ORG_TYPES_WITH_INVESTMENT_STAGE.includes(type.key)) setStage("");
                          if (!ORG_TYPES_WITH_CAPITAL_PROVIDED.includes(type.key)) setCapitalProvided("");
                          if (!ORG_TYPES_WITH_AUM.includes(type.key)) setAum("");
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
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Investment Stage Focus">
              <Select
                value={stage}
                onChange={setStage}
                disabled={!orgType || !ORG_TYPES_WITH_INVESTMENT_STAGE.includes(orgType)}
                options={
                  !orgType
                    ? [{ key: "", label: "Select organisation type first" }]
                    : ORG_TYPES_WITH_INVESTMENT_STAGE.includes(orgType)
                      ? [{ key: "", label: "Select stage" }, ...STAGE_OPTS.map((option) => ({ key: option, label: option }))]
                      : [{ key: "", label: "Not applicable" }]
                }
              />
            </Field>
            <Field label="AUM / Annual Budget">
              <Select
                value={aum}
                onChange={setAum}
                disabled={!orgType || !ORG_TYPES_WITH_AUM.includes(orgType)}
                options={
                  !orgType
                    ? [{ key: "", label: "Select organisation type first" }]
                    : ORG_TYPES_WITH_AUM.includes(orgType)
                      ? [{ key: "", label: "Select range" }, ...AUM_OPTS.map((option) => ({ key: option, label: option }))]
                      : [{ key: "", label: "Not applicable" }]
                }
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Capital Provided">
                <Select
                  value={capitalProvided}
                  onChange={setCapitalProvided}
                  disabled={!orgType || !ORG_TYPES_WITH_CAPITAL_PROVIDED.includes(orgType)}
                  options={
                    !orgType
                      ? [{ key: "", label: "Select organisation type first" }]
                      : ORG_TYPES_WITH_CAPITAL_PROVIDED.includes(orgType)
                        ? [{ key: "", label: "Select capital provided" }, ...CAPITAL_PROVIDED_OPTIONS.map((option) => ({ key: option, label: option }))]
                        : [{ key: "", label: "Not applicable" }]
                  }
                />
              </Field>
            </div>
          </div>
          <ProfileLocationFields
            title="Organisation location"
            isInNigeria={isInNigeria}
            setIsInNigeria={setIsInNigeria}
            state={state}
            setState={setState}
            lga={lga}
            setLga={setLga}
            country={country}
            setCountry={setCountry}
          />
          <h3 className="mt-2 font-display text-xl text-primary">Contact person</h3>
          <Row>
            <Field label="First Name *"><Input value={contactPersonFirstName} placeholder="John" onChange={setContactPersonFirstName} /></Field>
            <Field label="Last Name *"><Input value={contactPersonLastName} placeholder="Doe" onChange={setContactPersonLastName} /></Field>
          </Row>
          <Row>
            <Field label="Role / Position *"><Input value={contactPersonRole} placeholder="Contact person's role" onChange={setContactPersonRole} /></Field>
            <Field label="Email Address *"><Input value={contactPersonEmail} type="email" placeholder="name@organisation.org" onChange={setContactPersonEmail} /></Field>
          </Row>
          <Field label="Phone">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="w-full sm:w-72 sm:shrink-0">
                <SearchableOptionDropdown
                  selectedKey={phoneCountry}
                  options={PHONE_COUNTRY_OPTIONS}
                  placeholder={phoneCountryLabel}
                  buttonLabel={phoneCountryLabel}
                  ariaLabel="Phone country calling code"
                  searchPlaceholder="Search country or calling code"
                  onChange={setPhoneCountry}
                />
              </div>
              <Input
                value={contactPersonPhone}
                onChange={(value) => {
                  const digits = value.replace(/\D/g, "").replace(/^0/, "").slice(0, 15);
                  setContactPersonPhone(digits);
                }}
                type="tel"
                placeholder="Phone number"
                className="min-w-0 flex-1"
              />
            </div>
          </Field>
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
          </>
        ))}
        </>
        )}

        {step === 3 && (
          <section className="space-y-5">
            <div
              role="radiogroup"
              aria-label="Membership tier"
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
            >
              {TIERS.map((t) => {
                const selected = tier === t.key;
                return (
                  <label key={t.key} className="block cursor-pointer">
                    <input
                      type="radio"
                      className="peer sr-only"
                      name="membership-tier"
                      value={t.key}
                      checked={selected}
                      onChange={() => setTier(t.key)}
                    />
                    <div
                      className={`flex min-h-[220px] flex-col rounded-2xl border bg-white p-4 text-left shadow-sm transition peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 ${
                        selected
                          ? "border-2 border-primary ring-1 ring-primary/20"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="flex flex-1 items-start justify-between gap-3">
                        <h3 className="font-display text-lg leading-tight text-foreground">
                          {t.displayLabel}
                        </h3>
                        <span
                          aria-hidden="true"
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            selected ? "border-primary" : "border-muted-foreground"
                          }`}
                        >
                          {selected && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                        </span>
                      </div>
                      <p className="mt-2 font-display text-xl font-semibold text-primary">
                        {t.key === "observer" ? (
                          t.fee
                        ) : (
                          <del className="text-muted-foreground">{t.fee}</del>
                        )}
                      </p>
                      {t.key !== "observer" && (
                        <p className="mt-1 text-sm font-semibold text-primary">Free for 3 months</p>
                      )}
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {t.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
            <TierComparisonTable />
          </section>
        )}

        {step === 1 && (
          <>
        <Section title="Create your account" desc="Create a secure account to continue with your application.">
          {isIndividual ? (
            <>
              <Field label="Email Address *"><Input value={email} onChange={setEmail} type="email" placeholder="name@example.com" /></Field>
              <Row>
                <Field label="Select Title *">
                  <Select
                    value={personalTitle}
                    onChange={setPersonalTitle}
                    options={[{ key: "", label: "Select title" }, ...PERSONAL_TITLES.map((title) => ({ key: title, label: title }))]}
                  />
                </Field>
                <Field label="Professional Role (Optional)">
                  <SearchableOptionDropdown
                    selectedKey={individualRole}
                    onChange={setIndividualRole}
                    onClear={() => setIndividualRole("")}
                    options={JOB_TITLE_DROPDOWN_OPTIONS}
                    placeholder="Select or add a professional role"
                    searchPlaceholder="Search or add a professional role"
                    ariaLabel="Professional role"
                    allowCustom
                    onCustomValue={setIndividualRole}
                    clearable
                  />
                </Field>
              </Row>
              <Field label="Bio / Description">
                <textarea value={individualBio} onChange={(event) => setIndividualBio(event.target.value)} rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </Field>
              <Row>
                <Field label="Department (Optional)">
                  <Select
                    value={qualificationDepartment}
                    onChange={setQualificationDepartment}
                    options={[{ key: "", label: "Select department" }, ...QUALIFICATION_DEPARTMENTS.map((department) => ({ key: department, label: department }))]}
                  />
                </Field>
                <Field label="Department Role (Optional)">
                  <Select
                    value={qualificationPosition}
                    onChange={setQualificationPosition}
                    options={[{ key: "", label: "Select department role" }, ...QUALIFICATION_POSITIONS.map((position) => ({ key: position, label: position }))]}
                  />
                </Field>
              </Row>
              <Field label="Institution or Organisation (Optional)">
                <Input value={qualificationInstitution} onChange={setQualificationInstitution} placeholder="Enter name" />
              </Field>
              <Field label="Current Research Area (Optional)">
                <textarea
                  value={researchArea}
                  onChange={(event) => setResearchArea(event.target.value)}
                  rows={3}
                  placeholder="Description of research area"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </Field>
              <Field label="Research Interests (Optional)">
                <SearchableMultiSelectField
                  values={researchInterests}
                  onChange={setResearchInterests}
                  options={RESEARCH_INTEREST_OPTIONS}
                  placeholder="Search research interests"
                  ariaLabel="Research interests"
                  allowCustom
                />
              </Field>
              <ProfileLocationFields
                title="Location"
                isInNigeria={isInNigeria}
                setIsInNigeria={setIsInNigeria}
                state={state}
                setState={setState}
                lga={lga}
                setLga={setLga}
                country={country}
                setCountry={setCountry}
              />
              <Field label="Phone">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="w-full sm:w-72 sm:shrink-0">
                    <SearchableOptionDropdown
                      selectedKey={phoneCountry}
                      options={PHONE_COUNTRY_OPTIONS}
                      placeholder={phoneCountryLabel}
                      buttonLabel={phoneCountryLabel}
                      ariaLabel="Phone country calling code"
                      searchPlaceholder="Search country or calling code"
                      onChange={setPhoneCountry}
                    />
                  </div>
                  <Input value={phone} onChange={handlePhoneChange} type="tel" placeholder="Phone number" className="min-w-0 flex-1" />
                </div>
              </Field>
            </>
          ) : (
          <>
          <Field label="Email Address *"><Input value={email} onChange={setEmail} type="email" placeholder="name@example.com" /></Field>
          </>
          )}
          <Field label="Create Password *">
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
            <p className="mt-1 text-xs text-muted-foreground">
              Password must be at least 8 characters.
            </p>
          </Field>
          <Field label="Confirm Password">
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

        {step === 4 && (
          <>
        <Section
          title="SDG focus areas"
          desc={`Select all Sustainable Development Goals ${isIndividual ? "you actively work on" : "your organisation actively works on"}.`}
        >
          <CheckGrid options={SDGS} selected={sdgs} onToggle={(v) => setSdgs(toggle(sdgs, v))} />
          <Divider>Investment sectors (if applicable)</Divider>
          <CheckGrid options={SECTORS} selected={sectors} onToggle={(v) => setSectors(toggle(sectors, v))} />
        </Section>

        <Section title="Ecosystem engagement">
          <Divider noTop>
            {isIndividual
              ? "What do you hope to gain from NIEC?"
              : "What does your organisation hope to gain from NIEC?"}
          </Divider>
          <CheckGrid options={GOALS} selected={goals} onToggle={(v) => setGoals(toggle(goals, v))} />
          <Divider>What can {isIndividual ? "you" : "your organisation"} contribute?</Divider>
          <CheckGrid options={CONTRIBUTIONS} selected={contributions} onToggle={(v) => setContributions(toggle(contributions, v))} />
          {/*
          <Divider>How did you hear about NIEC?</Divider>
          <PillRow options={HEARD} value={heard} onChange={setHeard} />
          <Field label="Statement of Intent">
            <p className="mb-2 text-xs text-muted-foreground">
              In 2–3 sentences, describe why {isIndividual ? "you" : "your organisation"} want{isIndividual ? "" : "s"} to join NIEC and what impact you aim to make.
            </p>
            <textarea value={statement} onChange={(e) => setStatement(e.target.value)} rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          </Field>
          */}
        </Section>
          <Section title="Declaration & consent">
            <div className="rounded-xl border border-gold/40 bg-gold/10 p-5">
              <p className="mb-3 text-xs text-gold-foreground/80">
                {isIndividual
                  ? "By submitting this application you confirm the following — please tick each item:"
                  : "By submitting on behalf of your organisation, you confirm the following — please tick each item:"}
              </p>
              {(isIndividual ? INDIVIDUAL_CONSENTS : CONSENTS).map((c, i) => (
                <label key={i} className="flex cursor-pointer items-start gap-3 py-2 text-sm">
                  <input type="checkbox" checked={consents[i]} onChange={() => {
                    const next = [...consents]; next[i] = !next[i]; setConsents(next);
                  }} className="mt-0.5 h-4 w-4 shrink-0 rounded border-gold accent-gold" />
                  <span>{c}</span>
                </label>
              ))}
            </div>
          </Section>
        </>
        )}

      
        {(step !== 3 || mode === "signup") && (
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {step !== 3 && (
              <>
                {step > (mode === "onboarding" ? 2 : 1) && (
                  <button onClick={prevStep} type="button"
                    className="inline-flex items-center gap-2 rounded-md border bg-white px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-muted">
                    Previous
                  </button>
                )}

                {step === 1 && mode === "signup" ? (
                  <button onClick={createAccount} disabled={busy} type="button"
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60">
                    {busy ? "Creating account…" : "Create account"} <ArrowRight className="h-4 w-4" />
                  </button>
                ) : step < 4 ? (
                  mode === "onboarding" && step === 2 && !accountType ? null : (
                    <button onClick={nextStep} type="button"
                      className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
                      Next <ArrowRight className="h-4 w-4" />
                    </button>
                  )
                ) : (
                  <button onClick={submit} disabled={busy} type="button"
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60">
                    {busy ? "Submitting…" : "Submit application"} <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </>
            )}

            {mode === "signup" && (
              user ? (
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground transition hover:text-primary"
                >
                  Sign out
                </button>
              ) : (
                <Link
                  to="/login"
                  search={nextPath ? { next: nextPath } : {}}
                  className="text-sm text-muted-foreground hover:text-primary ml-3"
                >
                  Already a member? Sign in
                </Link>
              )
            )}
          </div>
        )}
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
      <label className="text-xs font-medium tracking-wider text-muted-foreground">
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
function useDismissableDropdown<T extends HTMLElement>(
  open: boolean,
  setOpen: React.Dispatch<React.SetStateAction<boolean>>,
) {
  const dropdownRef = useRef<T>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !dropdownRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, setOpen]);

  return dropdownRef;
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
  const dropdownRef = useDismissableDropdown<HTMLDivElement>(open, setOpen);

  return (
    <div ref={dropdownRef} className="relative">
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

function ProfileLocationFields({
  title,
  isInNigeria,
  setIsInNigeria,
  state,
  setState,
  lga,
  setLga,
  country,
  setCountry,
}: {
  title: string;
  isInNigeria: boolean;
  setIsInNigeria: React.Dispatch<React.SetStateAction<boolean>>;
  state: NigerianState | "";
  setState: React.Dispatch<React.SetStateAction<NigerianState | "">>;
  lga: string;
  setLga: React.Dispatch<React.SetStateAction<string>>;
  country: string;
  setCountry: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <>
      <fieldset className="space-y-2">
        <legend className="text-xs font-medium tracking-wider text-muted-foreground">
          {title} <span className="text-red-600">*</span>
        </legend>
        <div className="flex flex-wrap gap-5">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="profile-location"
              value="nigeria"
              checked={isInNigeria}
              onChange={() => {
                setIsInNigeria(true);
                setCountry("");
                setState("");
                setLga("");
              }}
              className="accent-primary"
            />
            In Nigeria
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="profile-location"
              value="outside-nigeria"
              checked={!isInNigeria}
              onChange={() => {
                setIsInNigeria(false);
                setState("");
                setLga("");
                setCountry("");
              }}
              className="accent-primary"
            />
            Outside Nigeria
          </label>
        </div>
      </fieldset>
      {isInNigeria ? (
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
      ) : (
        <Field label="Country *">
          <SearchableOptionDropdown
            selectedKey={country}
            options={COUNTRY_LOCATION_OPTIONS}
            placeholder="Select country"
            onChange={(value) => {
              if (value === "Nigeria") {
                setIsInNigeria(true);
                setCountry("");
                return;
              }
              setCountry(value);
            }}
          />
        </Field>
      )}
    </>
  );
}

function SearchableOptionDropdown<T extends string>({
  selectedKey,
  options,
  placeholder,
  onChange,
  onClear,
  onCustomValue,
  buttonLabel,
  ariaLabel,
  allowCustom = false,
  clearable = false,
  searchPlaceholder = "Search countries",
}: {
  selectedKey: T;
  options: readonly { key: T; label: string }[];
  placeholder: string;
  onChange: (key: T) => void;
  onClear?: () => void;
  onCustomValue?: (value: string) => void;
  buttonLabel?: string;
  ariaLabel?: string;
  allowCustom?: boolean;
  clearable?: boolean;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropdownRef = useDismissableDropdown<HTMLDivElement>(open, setOpen);
  const selectedOption = options.find((option) => option.key === selectedKey);
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className="flex h-auto min-h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 pr-12 text-left text-sm outline-none focus:border-primary"
      >
        <span className={`min-w-0 whitespace-normal break-words ${selectedOption ? "text-foreground" : "text-muted-foreground"}`}>
          {buttonLabel ?? selectedOption?.label ?? (allowCustom && selectedKey ? selectedKey : placeholder)}
        </span>
        <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </button>
      {clearable && selectedKey && onClear && (
        <button
          type="button"
          aria-label={`Clear ${ariaLabel ?? "selection"}`}
          onClick={() => {
            onClear();
            setQuery("");
            setOpen(false);
          }}
          className="absolute right-8 top-1/2 -translate-y-1/2 rounded-full bg-muted p-0.5 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      )}
      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-input bg-white shadow-lg">
          <div className="relative border-b border-input p-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div
            role="listbox"
            className="max-h-52 overflow-y-auto p-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
          >
            {filteredOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                role="option"
                aria-selected={selectedKey === option.key}
                onClick={() => {
                  onChange(option.key);
                  setOpen(false);
                  setQuery("");
                }}
                className="block w-full rounded bg-white px-3 py-2 text-left text-sm text-foreground transition hover:bg-muted"
              >
                {option.label}
              </button>
            ))}
            {filteredOptions.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                {allowCustom && query.trim()
                  ? "No matching options. Add your custom value below."
                  : "No matching options."}
              </p>
            )}
            {allowCustom && onCustomValue && query.trim() && !options.some(
              (option) => option.label.toLowerCase() === query.trim().toLowerCase(),
            ) && (
              <button
                type="button"
                role="option"
                aria-selected={selectedKey === query.trim()}
                onClick={() => {
                  onCustomValue(query.trim());
                  setOpen(false);
                  setQuery("");
                }}
                className="block w-full rounded bg-white px-3 py-2 text-left text-sm text-primary transition hover:bg-muted"
              >
                Use “{query.trim()}”
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchableMultiSelectField({
  values,
  onChange,
  options,
  placeholder,
  ariaLabel,
  allowCustom = false,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  options: readonly string[];
  placeholder: string;
  ariaLabel: string;
  allowCustom?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useDismissableDropdown<HTMLDivElement>(open, setOpen);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = options.filter((option) =>
    !values.some((value) => value.toLowerCase() === option.toLowerCase())
      && option.toLowerCase().includes(normalizedQuery),
  );
  const canAddCustomValue = allowCustom
    && query.trim().length > 0
    && !values.some((value) => value.toLowerCase() === query.trim().toLowerCase())
    && !options.some((option) => option.toLowerCase() === query.trim().toLowerCase());

  const addValue = (value: string) => {
    const trimmedValue = value.trim();
    if (!trimmedValue || values.some((existing) => existing.toLowerCase() === trimmedValue.toLowerCase())) return;
    onChange([...values, trimmedValue]);
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  };

  return (
    <div ref={dropdownRef} className="relative">
      <div className="flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 focus-within:border-primary">
        {values.map((value, index) => (
          <span
            key={`${value}-${index}`}
            className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary/10 py-1 pl-2.5 pr-1.5 text-xs font-medium text-primary"
          >
            <span className="max-w-[16rem] truncate">{value}</span>
            <button
              type="button"
              aria-label={`Remove ${value}`}
              onClick={() => {
                onChange(values.filter((_, valueIndex) => valueIndex !== index));
                inputRef.current?.focus();
              }}
              className="rounded-full p-0.5 hover:bg-primary/15"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="research-interest-options"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Enter" && open) {
              event.preventDefault();
              if (filteredOptions[0]) addValue(filteredOptions[0]);
              else if (canAddCustomValue) addValue(query);
            }
            if (event.key === "Backspace" && !query && values.length > 0) {
              onChange(values.slice(0, -1));
            }
          }}
          placeholder={values.length > 0 ? "Search to add another" : placeholder}
          className="min-w-[10rem] flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {open && (
        <div
          id="research-interest-options"
          role="listbox"
          aria-label={ariaLabel}
          aria-multiselectable="true"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-input bg-white p-1 shadow-lg [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
        >
          {filteredOptions.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected="false"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => addValue(option)}
              className="block w-full rounded px-3 py-2 text-left text-sm text-foreground transition hover:bg-muted"
            >
              {option}
            </button>
          ))}
          {canAddCustomValue && (
            <button
              type="button"
              role="option"
              aria-selected="false"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => addValue(query)}
              className="block w-full rounded px-3 py-2 text-left text-sm text-primary transition hover:bg-muted"
            >
              Add “{query.trim()}”
            </button>
          )}
          {filteredOptions.length === 0 && !canAddCustomValue && (
            <p className="px-3 py-2 text-sm text-muted-foreground">No matching research interests.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { key: string; label: string }[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useDismissableDropdown<HTMLDivElement>(open, setOpen);
  const selectedOption = options.find((option) => option.key === value);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-left text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {selectedOption?.label ?? ""}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-input bg-white shadow-lg [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
        >
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              role="option"
              aria-selected={value === option.key}
              onClick={() => {
                onChange(option.key);
                setOpen(false);
              }}
              className="block w-full bg-white px-3 py-2 text-left text-sm text-foreground transition hover:bg-muted"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
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
