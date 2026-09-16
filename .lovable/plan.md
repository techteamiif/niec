# Tier-Based Access Design + Full-App Audit

## Part 1 — Tier Entitlement Matrix

Five tiers already exist: **Observer → Contributor → Growth Partner → Anchor → Strategic Partner**. Today gating is inconsistent (only Events, Deal Room, Knowledge, CoPs, Mentorship do partial checks; there is no single source of truth and no visible upgrade path).

Introduce one canonical map in `src/lib/niec.ts`:

```
FEATURE                          | Observer | Contributor | Growth | Anchor | Strategic
Browse public landing            |   ✓      |   ✓         |   ✓    |   ✓    |   ✓
View member directory            |   ✓ (limited: name+org only) | full | full | full | full
Community feed — read            |   ✓      |   ✓         |   ✓    |   ✓    |   ✓
Community feed — post/comment    |   —      |   ✓         |   ✓    |   ✓    |   ✓
Direct messages                  |   —      |   ✓         |   ✓    |   ✓    |   ✓
Join a CoP                       |   —      |   ✓ (1 max) |   ✓ (3)|   ✓ ∞  |   ✓ ∞
Events — view                    |   ✓      |   ✓         |   ✓    |   ✓    |   ✓
Events — register (per tier gate)|   observer-tagged only | up to contributor | growth | anchor | all
Knowledge Hub — download         |   observer-tier docs | contributor | growth | anchor | all
Mentorship — book                |   —      |   ✓ (1/mo)  |  ✓ (3/mo)| ✓ ∞  |   ✓ ∞
Mentorship — offer as mentor     |   —      |   —         |   ✓    |   ✓    |   ✓
Deal Room — browse teaser        |   ✓ (name+sector only) | teaser | full deals | full + priority | full + priority + co-invite
Deal Room — submit deal          |   —      |   —         |   ✓    |   ✓    |   ✓
Deal Room — express interest     |   —      |   —         |   ✓    |   ✓    |   ✓
Working groups — join            |   —      |   ✓         |   ✓    |   ✓    |   ✓
Working groups — create          |   —      |   —         |   —    |   ✓    |   ✓
RFCs — comment/vote              |   —      |   ✓         |   ✓    |   ✓    |   ✓
RFCs — propose                   |   —      |   —         |   ✓    |   ✓    |   ✓
Event virtual link visibility    |   own tier | own tier | own tier | own tier | own tier (already enforced in DB)
Analytics / member insights      |   —      |   —         |   —    |   ✓    |   ✓
Priority support / staff intros  |   —      |   —         |   —    |   —    |   ✓
```

Numeric caps (CoP joins, monthly mentorship bookings) enforce degrees of access without hard walls.

## Part 2 — Implementation Approach

**Central module** — `src/lib/entitlements.ts`
- `FEATURES` const listing every gated capability with `minTier` and optional `monthlyLimit` / `count`.
- `can(profile, feature)` → boolean.
- `remaining(profile, feature, usedCount)` → number.
- `requiredTierFor(feature)` → tier key + label.

**UI primitive** — `<TierGate feature="..." fallback={<UpgradeCTA/>}>` wraps buttons/panels, hiding or dimming with a lock icon + "Upgrade to X" tooltip.

**Upgrade page** — new route `/upgrade` showing the matrix, the user's current tier highlighted, and an "Express interest to upgrade" button that posts a notification to admins (reuses `notifications` + `admin_action`).

**Server enforcement** — three migrations:
1. RLS policies re-checked so writes require the caller's tier ≥ required (community_posts insert, deal_opportunities insert, deal_interests insert, mentorship_bookings insert, working_groups insert, rfcs insert). Uses a new SECURITY DEFINER `tier_meets(_uid, _tier)`.
2. Monthly-cap trigger on `mentorship_bookings` (contributor=1/mo, growth=3/mo).
3. `cop_memberships` insert trigger enforcing CoP-count cap per tier.

**Client caps** — surface remaining count on Dashboard ("2 of 3 mentorship bookings left this month") and inline on the action itself; block with a friendly modal instead of a toast when at limit.

## Part 3 — Full Application Audit (Gaps Found)

**Auth & onboarding**
- No email verification enforcement — pending applicants can sign in and see the "under review" wall, but Google OAuth users skip `apply.tsx`. Fix: redirect to `/apply` when `crm_stage IS NULL` after first login.
- Password reset route exists but not linked from `/login`.
- No "resend confirmation email" affordance.

**Profile & completeness**
- Onboarding checklist exists but never blocks anything and isn't shown after first-week. Show a slim completeness bar in header until ≥80%.
- Avatar upload path exists but no image size/type validation → fix client-side (≤2MB, image/*).

**Directory / Members**
- Search only supports `q` on name; sector/tier/CoP filter chips missing. Observers can see full profile fields (should be limited per matrix).

**Community**
- Post composer available to Observers — should be locked with `<TierGate>`.
- No report/flag action; admins have no moderation queue UI (data model supports it).
- Comments have no edit/delete UI for own author.

**CoPs**
- Join button doesn't enforce cap; leaving a pinned welcome post as anon user throws generic error.
- No "your CoPs" quick section on dashboard.

**Events**
- Registration doesn't check `max_attendees`; over-subscribes silently.
- No calendar (.ics) download; no cancel-registration button.
- Past events are mixed with upcoming — needs tab split.

**Deal Room**
- Tier lock is only on the "Create" button; browsing shows full teaser data to Observers.
- `deal_interests` has no admin view of who expressed interest per deal.
- No status lifecycle UI (open/closed/funded) visible to members.

**Knowledge Hub**
- Download counter only bumps if user is allowed; no preview for locked items. Add "Preview locked — upgrade to X" card.
- No search or CoP filter.

**Mentorship**
- No cap enforcement (matrix above adds it).
- Booking has no calendar integration or reminder notification.
- Mentor cannot mark a session complete from UI (only trigger fires on status change) — add "Mark complete" button in `/mentorship/bookings`.

**Messages**
- No unread indicator per thread in list; realtime works but no toast on new DM.
- No block/report user.

**Notifications**
- Mark-all-read exists; no per-notification navigation for some types (e.g., RFC accepted goes to `/cops/{cop}` but slug format is enum text, not URL slug — bug).

**Admin**
- Approving a pending member doesn't send an email, only a notification. Add transactional email via `email_domain--scaffold_transactional_email`.
- No bulk actions on members table.
- Audit log page not surfaced.

**Global**
- No global 404/500 branded pages (root has notFoundComponent but generic).
- SEO: leaf routes reuse root title; add per-route `head()`.
- No `og:image` on landing (matters for shareability).

## Part 4 — Scope & Sequencing

Ship in 3 build passes so each is reviewable:

1. **Tier engine + Upgrade page** — `entitlements.ts`, `<TierGate>`, `/upgrade` route, dashboard "your plan" card, matrix migration for `tier_meets()` RPC and RLS re-check on writes.
2. **Gap fixes — member-facing** — event capacity + past/upcoming tabs + .ics, deal-room teaser gating, community composer gate + own-comment edit/delete, knowledge search & preview, mentorship caps + complete action, member directory filters, DM unread badges.
3. **Gap fixes — admin & polish** — approval email, moderation queue, bulk member actions, audit log page, per-route SEO heads, notification link bug, avatar validation, Google OAuth → `/apply` redirect.

## Technical Notes

- All tier checks use `tierMeets()` and the new `entitlements.can()`; never hard-code tier strings in components.
- All caps enforced twice: DB trigger (source of truth) + client (fast UX). Client shows `remaining` from a single lightweight RPC `get_tier_usage()`.
- No changes to auth/roles/RLS *model* — only additional row-level checks and a new SECURITY DEFINER helper.
- Upgrade CTA writes a notification of type `admin_action` to all staff; no billing integration in this pass.

Confirm and I'll build pass 1 first, then check in before pass 2.
