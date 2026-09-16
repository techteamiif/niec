import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { COPS } from "@/lib/niec";
import { ArrowRight, Globe, TrendingUp, Users, Calendar, Sparkles, Menu, X } from "lucide-react";
import { NiecLogo } from "@/components/brand/NiecLogo";
import iifLogo from "@/assets/iif-logo.png.asset.json";
import gsgLogo from "@/assets/gsg-logo.png.asset.json";
import nabiiLogo from "@/assets/nabii-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NIEC — Nigeria Impact Economy Community" },
      { name: "description", content: "Nigeria's premier community for impact investors, social enterprises, DFIs and policymakers. Powered by the Impact Investors Foundation." },
    ],
  }),
  component: ImpactLanding,
});

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft transition hover:border-primary/40 hover:shadow-elegant">
      <div className="font-display text-5xl text-primary">
        {value}<span className="text-gold">{suffix}</span>
      </div>
      <div className="mt-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
    </div>
  );
}

function ImpactLanding() {
  const [mobileNav, setMobileNav] = useState(false);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/"><NiecLogo variant="horizontal" theme="light" size={38} withTagline /></Link>
          <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
            <a href="#about" className="transition hover:text-foreground">About</a>
            <a href="#cops" className="transition hover:text-foreground">Communities</a>
            <a href="#impact" className="transition hover:text-foreground">Impact</a>
            <Link to="/login" className="transition hover:text-foreground">Sign in</Link>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileNav(true)} className="md:hidden text-muted-foreground hover:text-foreground" aria-label="Open menu">
              <Menu className="h-6 w-6" />
            </button>
            <Link to="/apply"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:scale-[1.02]">
              Join NIEC
            </Link>
          </div>
        </div>
        {mobileNav && (
          <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-lg md:hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <span className="text-sm uppercase tracking-widest text-muted-foreground">Menu</span>
              <button onClick={() => setMobileNav(false)} aria-label="Close menu" className="text-muted-foreground"><X className="h-6 w-6" /></button>
            </div>
            <nav className="flex flex-col gap-1 p-6 text-lg">
              <a href="#about" onClick={() => setMobileNav(false)} className="rounded-md px-3 py-3 hover:bg-muted">About</a>
              <a href="#cops" onClick={() => setMobileNav(false)} className="rounded-md px-3 py-3 hover:bg-muted">Communities</a>
              <a href="#impact" onClick={() => setMobileNav(false)} className="rounded-md px-3 py-3 hover:bg-muted">Impact</a>
              <Link to="/login" onClick={() => setMobileNav(false)} className="rounded-md px-3 py-3 hover:bg-muted">Sign in</Link>
              <Link to="/apply" onClick={() => setMobileNav(false)} className="mt-2 rounded-full bg-primary px-5 py-3 text-center text-sm font-semibold text-primary-foreground">Join NIEC</Link>
            </nav>
          </div>
        )}
      </header>

      {/* Hero — the only deep-toned band, sets brand mood */}
      <section className="relative overflow-hidden text-white">
        <div className="absolute inset-0 bg-hero" />
        <div className="absolute inset-0 grain opacity-30" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="max-w-4xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.22em] text-white/90">
              <Sparkles className="h-3 w-3 text-gold" /> Powered by the Impact Investors Foundation
            </div>
            <h1 className="font-display text-6xl leading-[1.02] tracking-tight text-balance md:text-8xl">
              Nigeria's <span className="text-gold italic">impact economy</span>,<br className="hidden md:block" /> in one community.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-white/85">
              NIEC is the connective tissue for investors, enterprises, DFIs and policymakers
              catalysing measurable capital across all 17 SDGs.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/apply"
                className="group inline-flex items-center gap-2 rounded-full bg-gold-gradient px-7 py-3.5 text-sm font-semibold text-foreground shadow-gold-glow transition hover:scale-[1.02]">
                Apply for membership <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link to="/login" className="inline-flex items-center gap-2 rounded-full border border-white/35 px-7 py-3.5 text-sm font-semibold text-white transition hover:border-white/70 hover:bg-white/10">
                Member sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Impact stats */}
      <section id="impact" className="border-t border-border bg-cream/40">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <div className="text-[10px] uppercase tracking-[0.22em] text-primary">Aggregate impact</div>
            <h2 className="mt-3 font-display text-4xl text-foreground md:text-5xl">Measurable. Mobilised. Multiplied.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <Stat label="Members convened" value="280" suffix="+" />
            <Stat label="Capital mobilised (₦bn)" value="42" />
            <Stat label="Deals facilitated" value="67" />
            <Stat label="Convenings hosted" value="35" />
          </div>
        </div>
      </section>

      {/* CoPs */}
      <section id="cops" className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <div className="text-[10px] uppercase tracking-[0.22em] text-primary">Six communities of practice</div>
              <h2 className="mt-3 font-display text-4xl text-foreground md:text-5xl">Where members do the work.</h2>
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">
              Thematic working groups that shape policy, standards and capital flows across the ecosystem.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {COPS.map((c) => (
              <div key={c.key} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-soft transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant">
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40" style={{ background: c.color }} />
                <div className="relative">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: c.color }} />
                  <h3 className="mt-4 font-display text-xl text-foreground">{c.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="border-t border-border bg-cream/40">
        <div className="mx-auto grid max-w-7xl gap-16 px-6 py-24 md:grid-cols-2">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-primary">About NIEC</div>
            <h2 className="mt-3 font-display text-4xl text-foreground md:text-5xl text-balance">A trusted, tiered community for serious capital.</h2>
            <p className="mt-6 leading-relaxed text-muted-foreground">
              Five membership tiers — Observer, Contributor, Growth Partner, Anchor, Strategic Partner — with a
              private deal room, six Communities of Practice, and flagship convenings including GIIS, AIS and ACII.
            </p>
            <Link to="/apply" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
              Explore membership tiers <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Users, label: "Member directory", sub: "280+ profiles" },
              { icon: Calendar, label: "Convenings & boot camps", sub: "GIIS · AIS · ACII" },
              { icon: TrendingUp, label: "Private deal room", sub: "Tier-gated access" },
              { icon: Globe, label: "SDG-aligned knowledge", sub: "Reports & playbooks" },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:border-primary/40">
                <Icon className="h-5 w-5 text-primary" />
                <div className="mt-4 text-sm font-medium text-foreground">{label}</div>
                <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Convened by / Partners */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-10 text-center">
            <div className="text-[10px] uppercase tracking-[0.22em] text-primary">Convened by · In partnership with</div>
            <h2 className="mt-3 font-display text-3xl text-foreground md:text-4xl">Owners, supporters &amp; leaders of NIEC</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground">
              NIEC is convened by the Impact Investors Foundation as Nigeria's GSG National Partner, anchoring the Nigerian NABII.
            </p>
          </div>
          <div className="grid items-center gap-6 sm:grid-cols-3">
            <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-8 shadow-soft transition hover:border-primary/40 hover:shadow-elegant">
              <img src={iifLogo.url} alt="Impact Investors Foundation" className="h-24 w-auto object-contain" />
              <div className="mt-5 text-[10px] uppercase tracking-[0.22em] text-primary">Convener</div>
              <div className="mt-1 text-sm font-semibold text-foreground">Impact Investors Foundation</div>
            </div>
            <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-8 shadow-soft transition hover:border-primary/40 hover:shadow-elegant">
              <img src={gsgLogo.url} alt="GSG National Partner" className="h-24 w-auto object-contain" />
              <div className="mt-5 text-[10px] uppercase tracking-[0.22em] text-primary">Global affiliation</div>
              <div className="mt-1 text-sm font-semibold text-foreground">GSG National Partner — Nigeria</div>
            </div>
            <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-8 shadow-soft transition hover:border-primary/40 hover:shadow-elegant">
              <img src={nabiiLogo.url} alt="Nigerian NABII" className="h-24 w-auto object-contain" />
              <div className="mt-5 text-[10px] uppercase tracking-[0.22em] text-primary">Anchoring body</div>
              <div className="mt-1 text-sm font-semibold text-foreground">Nigerian NABII</div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-10 text-xs text-muted-foreground md:flex-row">
          <NiecLogo variant="horizontal" theme="light" size={28} />
          <div>© {new Date().getFullYear()} Impact Investors Foundation · Convened in Lagos, Nigeria</div>
        </div>
      </footer>
    </div>
  );
}
