import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { tierMeets, TIER_LABELS, EOI_URL } from "@/lib/niec";
import { toast } from "sonner";
import { ArrowRight, Briefcase, CreditCard, Lock } from "lucide-react";
import { initResourcePayment } from "@/lib/payments.functions";
import { TierAccessDialog } from "@/components/TierAccessDialog";

export const Route = createFileRoute("/_app/deal-room")({
  component: DealRoom,
});

const DEAL_CATEGORIES: Array<{ key: string; label: string }> = [
  { key: "all", label: "All deals" },
  { key: "wiif", label: "WIIF pipeline" },
  { key: "gender", label: "Gender-lens (GIIS)" },
  { key: "climate", label: "Climate & green" },
  { key: "eso", label: "ESO-referred" },
  { key: "general", label: "General" },
];

function DealRoom() {
  const { user, profile, isStaff } = useAuth();
  const [deals, setDeals] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [category, setCategory] = useState<string>("all");
  const [purchasingDealId, setPurchasingDealId] = useState<string | null>(null);
  const [gatedDeal, setGatedDeal] = useState<any | null>(null);
  const startPurchase = useServerFn(initResourcePayment);

  const fullAccess = isStaff || tierMeets(profile?.membership_tier, "growth_partner");

  const load = async () => {
    const { data, error } = await supabase.rpc("get_deal_room_items");
    if (error) toast.error(`Could not load deals: ${error.message}`);
    setDeals(data ?? []);
  };
  useEffect(() => { void load(); }, [user]);


  const express = async (id: string) => {
    if (!user) return;
    const note = prompt("Add a short note for the IIF team:") ?? "";
    const { error } = await supabase.from("deal_interests").insert({ deal_id: id, investor_id: user.id, interest_note: note });
    if (error) toast.error(error.message); else toast.success("Interest registered");
  };

  const buyDeal = async (id: string) => {
    if (purchasingDealId) return;
    setPurchasingDealId(id);
    try {
      const result = await startPurchase({ data: { resourceType: "deal", resourceId: id } });
      if (!result.ok) throw new Error(result.error);
      window.location.href = result.authorizationUrl;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start the purchase.");
      setPurchasingDealId(null);
    }
  };

  const filtered = category === "all" ? deals : deals.filter((d) => (d.category ?? "general") === category);

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl">Deal Room</h1>
          <p className="text-sm text-muted-foreground">Active investment opportunities curated by IIF.</p>
        </div>
        {isStaff && <button onClick={() => setShowCreate(true)} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">+ Add deal</button>}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {DEAL_CATEGORIES.map((c) => {
          const active = category === c.key;
          return (
            <button key={c.key} onClick={() => setCategory(c.key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted"}`}>
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((d: any) => (
          <div key={d.id} className="rounded-xl border bg-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-primary">{d.sector || "Multi-sector"}</div>
                <h3 className="mt-1 font-display text-xl">{d.enterprise_name}</h3>
                <div className="text-sm text-muted-foreground">{d.title}</div>
              </div>
              <StatusPill status={d.status} />
            </div>
            {d.can_access ? (
              <>
                <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{d.description}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3 text-xs">
                  <div>
                    <div className="text-muted-foreground">Ticket size</div>
                    <div className="font-medium">{d.currency} {Number(d.ticket_size_min).toLocaleString()} – {Number(d.ticket_size_max).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Instrument</div>
                    <div className="font-medium capitalize">{d.instrument_type?.replace(/_/g, " ")}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-3 rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
                <Lock className="mr-1 inline h-3 w-3" /> Ticket size, instrument and description are visible to Growth Partner and above.
              </div>
            )}
            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>Min tier: {TIER_LABELS[d.min_tier_required]}</span>
                {d.access_price_kobo != null && (
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-primary normal-case">
                    One-time access ₦{(d.access_price_kobo / 100).toLocaleString("en-NG")}
                  </span>
                )}
                {d.category && d.category !== "general" && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                    {DEAL_CATEGORIES.find((c) => c.key === d.category)?.label ?? d.category}
                  </span>
                )}
              </div>
              {d.can_access ? (
                <button onClick={() => express(d.id)} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                  <Briefcase className="mr-1 inline h-3 w-3" /> Express interest
                </button>
              ) : d.access_price_kobo != null ? (
                <button
                  onClick={() => setGatedDeal(d)}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  <CreditCard className="mr-1 inline h-3 w-3" />
                  View access options
                </button>
              ) : (
                <button onClick={() => setGatedDeal(d)} className="rounded-md border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted">
                  <Lock className="mr-1 inline h-3 w-3" /> Upgrade to engage
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">No deals match this filter.</div>
        )}
      </div>



      {showCreate && isStaff && user && <CreateDeal userId={user.id} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
      <TierAccessDialog
        open={!!gatedDeal}
        onOpenChange={(open) => { if (!open) setGatedDeal(null); }}
        itemType="resource"
        requiredTier={gatedDeal?.min_tier_required ?? "growth_partner"}
        currentTier={profile?.membership_tier}
        accessPriceKobo={gatedDeal?.access_price_kobo}
        onPayOnce={() => { if (gatedDeal) void buyDeal(gatedDeal.id); }}
        purchasing={purchasingDealId === gatedDeal?.id}
      />
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-success/20 text-primary",
    under_review: "bg-gold/25 text-gold-foreground",
    matched: "bg-blue-100 text-blue-800",
    closed: "bg-muted text-muted-foreground",
  };
  return <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${map[status] ?? "bg-muted"}`}>{status.replace(/_/g, " ")}</span>;
}

function CreateDeal({ onClose, onCreated, userId }: { onClose: () => void; onCreated: () => void; userId: string }) {
  const [f, setF] = useState({
    title: "", enterprise_name: "", description: "", sector: "",
    ticket_size_min: "0", ticket_size_max: "0", currency: "NGN",
    instrument_type: "equity", min_tier_required: "growth_partner",
    category: "general", access_price_naira: "",
  });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAccessPrice = f.access_price_naira.trim() ? Number(f.access_price_naira) : null;
    if (parsedAccessPrice !== null && (!Number.isSafeInteger(parsedAccessPrice) || parsedAccessPrice <= 0)) {
      toast.error("Enter a one-time access price as a positive whole number of naira.");
      return;
    }
    const { access_price_naira: _accessPrice, ...dealFields } = f;
    const { error } = await supabase.from("deal_opportunities").insert({
      ...dealFields,
      access_price_kobo: parsedAccessPrice === null ? null : parsedAccessPrice * 100,
      submitted_by: userId,
      ticket_size_min: Number(f.ticket_size_min), ticket_size_max: Number(f.ticket_size_max),
      instrument_type: f.instrument_type as any, min_tier_required: f.min_tier_required as any,
    });
    if (error) return toast.error(error.message);
    toast.success("Deal created");
    onCreated();
  };
  const s = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form onSubmit={submit} className="w-full max-w-xl space-y-3 rounded-2xl border bg-card p-6">
        <h2 className="font-display text-xl">New deal</h2>
        <input required placeholder="Enterprise name" value={f.enterprise_name} onChange={(e) => s("enterprise_name", e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm" />
        <input required placeholder="Deal title" value={f.title} onChange={(e) => s("title", e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm" />
        <input placeholder="Sector" value={f.sector} onChange={(e) => s("sector", e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm" />
        <textarea placeholder="Description" value={f.description} onChange={(e) => s("description", e.target.value)} rows={4} className="w-full rounded-md border bg-background p-3 text-sm" />
        <div className="grid grid-cols-3 gap-2">
          <input type="number" placeholder="Min" value={f.ticket_size_min} onChange={(e) => s("ticket_size_min", e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm" />
          <input type="number" placeholder="Max" value={f.ticket_size_max} onChange={(e) => s("ticket_size_max", e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm" />
          <input placeholder="Currency" value={f.currency} onChange={(e) => s("currency", e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <select value={f.instrument_type} onChange={(e) => s("instrument_type", e.target.value)} className="h-10 rounded-md border bg-background px-2 text-sm">
            {["equity","debt","grant","blended","convertible_note","revenue_share"].map((x) => <option key={x}>{x}</option>)}
          </select>
          <select value={f.min_tier_required} onChange={(e) => s("min_tier_required", e.target.value)} className="h-10 rounded-md border bg-background px-2 text-sm">
            {["growth_partner","anchor","strategic_partner"].map((x) => <option key={x}>{TIER_LABELS[x]}</option>)}
          </select>
          <select value={f.category} onChange={(e) => s("category", e.target.value)} className="h-10 rounded-md border bg-background px-2 text-sm" title="Programme category">
            {DEAL_CATEGORIES.filter((c) => c.key !== "all").map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="deal-access-price" className="block text-sm font-medium">
            One-time access price (NGN, optional)
          </label>
          <input
            id="deal-access-price"
            type="number"
            min="1"
            step="1"
            placeholder="Leave blank for tier-only access"
            value={f.access_price_naira}
            onChange={(e) => s("access_price_naira", e.target.value)}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm">Cancel</button>
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Create</button>
        </div>
      </form>
    </div>
  );
}
