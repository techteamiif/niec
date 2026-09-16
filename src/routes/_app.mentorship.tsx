import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { COPS, initials, tierMeets } from "@/lib/niec";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { GraduationCap, Search, Sparkles, CalendarCheck, X, Check } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/mentorship")({ component: MentorshipPage });

type Offer = {
  id: string;
  mentor_id: string;
  topics: string[];
  cops: string[];
  capacity_per_month: number;
  availability: string;
  bio: string;
  active: boolean;
  profiles?: { full_name: string; avatar_url: string | null; organisation_name: string | null; membership_tier: string };
};

type Booking = {
  id: string;
  mentor_id: string;
  requester_id: string;
  topic: string;
  message: string;
  proposed_time: string;
  status: "requested" | "confirmed" | "completed" | "declined" | "cancelled";
  created_at: string;
  mentor?: { full_name: string; avatar_url: string | null };
  requester?: { full_name: string; avatar_url: string | null };
};

function MentorshipPage() {
  const { user, profile } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [myOffer, setMyOffer] = useState<Offer | null>(null);
  const [bookingsIn, setBookingsIn] = useState<Booking[]>([]);
  const [bookingsOut, setBookingsOut] = useState<Booking[]>([]);
  const [search, setSearch] = useState("");
  const [filterCop, setFilterCop] = useState<string>("");

  const load = async () => {
    if (!user) return;
    const [o, mo, bi, bo] = await Promise.all([
      supabase.from("mentorship_offers").select("*, profiles:mentor_id(full_name, avatar_url, organisation_name, membership_tier)").eq("active", true),
      supabase.from("mentorship_offers").select("*").eq("mentor_id", user.id).maybeSingle(),
      supabase.from("mentorship_bookings").select("*, requester:requester_id(full_name, avatar_url)").eq("mentor_id", user.id).order("created_at", { ascending: false }),
      supabase.from("mentorship_bookings").select("*, mentor:mentor_id(full_name, avatar_url)").eq("requester_id", user.id).order("created_at", { ascending: false }),
    ]);
    setOffers((o.data as any) ?? []);
    setMyOffer((mo.data as any) ?? null);
    setBookingsIn((bi.data as any) ?? []);
    setBookingsOut((bo.data as any) ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const filtered = offers.filter((o) => {
    if (o.mentor_id === user?.id) return false;
    if (filterCop && !o.cops.includes(filterCop)) return false;
    if (search) {
      const t = search.toLowerCase();
      const hay = [o.topics.join(" "), o.bio, o.profiles?.full_name ?? "", o.profiles?.organisation_name ?? ""].join(" ").toLowerCase();
      if (!hay.includes(t)) return false;
    }
    return true;
  });

  const updateBookingStatus = async (id: string, status: Booking["status"]) => {
    const { error } = await supabase.from("mentorship_bookings").update({ status, decided_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    load();
  };

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl flex items-center gap-2"><GraduationCap className="h-7 w-7 text-primary" /> Mentorship</h1>
          <p className="text-sm text-muted-foreground">Get advice from senior NIEC members or share your expertise.</p>
        </div>
        <OfferDialog user={user?.id} myOffer={myOffer} onSaved={load} />
      </div>

      <Tabs defaultValue="find">
        <TabsList>
          <TabsTrigger value="find"><Search className="mr-1 h-4 w-4" /> Find a mentor</TabsTrigger>
          <TabsTrigger value="mine"><CalendarCheck className="mr-1 h-4 w-4" /> My mentorship {bookingsIn.length + bookingsOut.length > 0 && <Badge variant="secondary" className="ml-1">{bookingsIn.length + bookingsOut.length}</Badge>}</TabsTrigger>
        </TabsList>

        <TabsContent value="find" className="mt-6">
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search topics, name, organisation…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select value={filterCop} onChange={(e) => setFilterCop(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm">
              <option value="">All CoPs</option>
              {COPS.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((o) => <MentorCard key={o.id} offer={o} canBook={tierMeets(profile?.membership_tier, "contributor")} onBooked={load} />)}
            {filtered.length === 0 && <p className="text-sm text-muted-foreground">No mentors match. Try clearing filters.</p>}
          </div>
        </TabsContent>

        <TabsContent value="mine" className="mt-6 space-y-6">
          <section>
            <h2 className="mb-2 font-display text-lg">Requests to me {bookingsIn.length > 0 && <span className="text-sm text-muted-foreground">({bookingsIn.length})</span>}</h2>
            <div className="space-y-2">
              {bookingsIn.map((b) => (
                <div key={b.id} className="rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9"><AvatarImage src={b.requester?.avatar_url ?? undefined} /><AvatarFallback>{initials(b.requester?.full_name ?? "")}</AvatarFallback></Avatar>
                      <div>
                        <div className="text-sm font-medium">{b.requester?.full_name}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(b.created_at), "PP")} · Topic: {b.topic}</div>
                        {b.message && <p className="mt-1 text-sm">{b.message}</p>}
                        {b.proposed_time && <p className="mt-1 text-xs text-muted-foreground">Proposed: {b.proposed_time}</p>}
                      </div>
                    </div>
                    <StatusBadge s={b.status} />
                  </div>
                  {b.status === "requested" && (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => updateBookingStatus(b.id, "confirmed")}><Check className="mr-1 h-3 w-3" /> Confirm</Button>
                      <Button size="sm" variant="outline" onClick={() => updateBookingStatus(b.id, "declined")}><X className="mr-1 h-3 w-3" /> Decline</Button>
                    </div>
                  )}
                  {b.status === "confirmed" && (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => updateBookingStatus(b.id, "completed")}><Sparkles className="mr-1 h-3 w-3" /> Mark complete</Button>
                    </div>
                  )}
                </div>
              ))}
              {bookingsIn.length === 0 && <p className="text-sm text-muted-foreground">No incoming requests. {myOffer ? "" : "Publish your mentor offer to receive them."}</p>}
            </div>
          </section>

          <section>
            <h2 className="mb-2 font-display text-lg">My requests {bookingsOut.length > 0 && <span className="text-sm text-muted-foreground">({bookingsOut.length})</span>}</h2>
            <div className="space-y-2">
              {bookingsOut.map((b) => (
                <div key={b.id} className="rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9"><AvatarImage src={b.mentor?.avatar_url ?? undefined} /><AvatarFallback>{initials(b.mentor?.full_name ?? "")}</AvatarFallback></Avatar>
                      <div>
                        <div className="text-sm font-medium">{b.mentor?.full_name}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(b.created_at), "PP")} · Topic: {b.topic}</div>
                      </div>
                    </div>
                    <StatusBadge s={b.status} />
                  </div>
                  {(b.status === "requested" || b.status === "confirmed") && (
                    <div className="mt-3"><Button size="sm" variant="outline" onClick={() => updateBookingStatus(b.id, "cancelled")}>Cancel</Button></div>
                  )}
                </div>
              ))}
              {bookingsOut.length === 0 && <p className="text-sm text-muted-foreground">No outgoing requests yet.</p>}
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  const v: Record<string, string> = {
    requested: "bg-blue-100 text-blue-800",
    confirmed: "bg-success/20 text-primary",
    completed: "bg-gold/25 text-gold-foreground",
    declined: "bg-destructive/15 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
  };
  return <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${v[s] ?? ""}`}>{s}</span>;
}

function MentorCard({ offer, canBook, onBooked }: { offer: Offer; canBook: boolean; onBooked: () => void }) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [proposedTime, setProposedTime] = useState("");
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user || !topic.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("mentorship_bookings").insert({
      mentor_id: offer.mentor_id, requester_id: user.id, topic, message, proposed_time: proposedTime,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Request sent");
    setOpen(false); setTopic(""); setMessage(""); setProposedTime("");
    onBooked();
  };

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12"><AvatarImage src={offer.profiles?.avatar_url ?? undefined} /><AvatarFallback>{initials(offer.profiles?.full_name ?? "")}</AvatarFallback></Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-medium">{offer.profiles?.full_name}</div>
          <div className="text-xs text-muted-foreground">{offer.profiles?.organisation_name}</div>
        </div>
      </div>
      {offer.bio && <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{offer.bio}</p>}
      {offer.topics.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {offer.topics.slice(0, 6).map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
        </div>
      )}
      {offer.cops.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {offer.cops.map((c) => {
            const meta = COPS.find((x) => x.key === c);
            return <span key={c} className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: meta?.color ?? "#999" }}>{meta?.name ?? c}</span>;
          })}
        </div>
      )}
      {offer.availability && <p className="mt-2 text-xs text-muted-foreground"><strong>Availability:</strong> {offer.availability}</p>}
      <div className="mt-4">
        {canBook ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">Request mentorship</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Request mentorship from {offer.profiles?.full_name}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Topic</Label><Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Structuring our first impact fund" /></div>
                <div><Label>Message (optional)</Label><Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} /></div>
                <div><Label>Proposed time (optional)</Label><Input value={proposedTime} onChange={(e) => setProposedTime(e.target.value)} placeholder="e.g. Next Tuesday afternoon" /></div>
              </div>
              <DialogFooter><Button disabled={busy || !topic.trim()} onClick={submit}>Send request</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <div className="rounded-md border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
            Mentorship requests require the <strong>Contributor</strong> tier or above.{" "}
            <a href="/apply" className="text-primary hover:underline">Upgrade your membership →</a>
          </div>
        )}
      </div>
    </div>
  );
}

function OfferDialog({ user, myOffer, onSaved }: { user?: string; myOffer: Offer | null; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [topics, setTopics] = useState(myOffer?.topics.join(", ") ?? "");
  const [cops, setCops] = useState<string[]>(myOffer?.cops ?? []);
  const [capacity, setCapacity] = useState(myOffer?.capacity_per_month ?? 2);
  const [availability, setAvailability] = useState(myOffer?.availability ?? "");
  const [bio, setBio] = useState(myOffer?.bio ?? "");
  const [active, setActive] = useState(myOffer?.active ?? true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (myOffer) {
      setTopics(myOffer.topics.join(", "));
      setCops(myOffer.cops);
      setCapacity(myOffer.capacity_per_month);
      setAvailability(myOffer.availability);
      setBio(myOffer.bio);
      setActive(myOffer.active);
    }
  }, [myOffer]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const payload = {
      mentor_id: user,
      topics: topics.split(",").map((t) => t.trim()).filter(Boolean),
      cops: cops as any,
      capacity_per_month: capacity,
      availability, bio, active,
    };
    const { error } = await supabase.from("mentorship_offers").upsert(payload, { onConflict: "mentor_id" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(myOffer ? "Offer updated" : "Offer published");
    setOpen(false); onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={myOffer ? "outline" : "default"}>{myOffer ? "Edit my mentor offer" : "Become a mentor"}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{myOffer ? "Update your mentor offer" : "Publish a mentor offer"}</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div><Label>Topics (comma-separated)</Label><Input value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="Fundraising, impact measurement, board governance" /></div>
          <div>
            <Label>CoPs you cover</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              {COPS.map((c) => {
                const on = cops.includes(c.key);
                return (
                  <button key={c.key} type="button" onClick={() => setCops((cur) => on ? cur.filter((x) => x !== c.key) : [...cur, c.key])}
                    className={`rounded-full border px-2.5 py-0.5 text-xs ${on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Capacity / month</Label><Input type="number" min={0} max={20} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} /></div>
            <div className="flex items-end gap-2"><input type="checkbox" id="active" checked={active} onChange={(e) => setActive(e.target.checked)} /><Label htmlFor="active">Accepting requests</Label></div>
          </div>
          <div><Label>Availability</Label><Input value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="Fridays 4–6pm WAT" /></div>
          <div><Label>Short bio</Label><Textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What you bring and the kind of people you'd love to support." /></div>
        </div>
        <DialogFooter><Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
