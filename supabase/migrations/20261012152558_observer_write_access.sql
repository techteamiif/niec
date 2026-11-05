-- Keep Observer accounts read-only for member-generated content and social actions.
-- Profile edits and event RSVPs remain available; message read receipts remain available.

DROP POLICY IF EXISTS "profiles self read" ON public.profiles;
CREATE POLICY "profiles self read" ON public.profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR public.is_staff(auth.uid())
  OR (
    membership_status = 'active'
    AND membership_tier <> 'observer'
    AND public.is_active_member(auth.uid())
  )
);

DROP POLICY IF EXISTS "posts insert own" ON public.community_posts;
CREATE POLICY "posts insert own" ON public.community_posts
FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND public.is_active_member(auth.uid())
  AND public.tier_rank(public.current_tier(auth.uid()))
    >= public.tier_rank('contributor'::public.membership_tier)
);

DROP POLICY IF EXISTS "posts update own or staff" ON public.community_posts;
CREATE POLICY "posts update own or staff" ON public.community_posts
FOR UPDATE TO authenticated
USING (
  public.is_staff(auth.uid())
  OR (
    author_id = auth.uid()
    AND public.is_active_member(auth.uid())
    AND public.tier_rank(public.current_tier(auth.uid()))
      >= public.tier_rank('contributor'::public.membership_tier)
  )
)
WITH CHECK (
  public.is_staff(auth.uid())
  OR (
    author_id = auth.uid()
    AND public.is_active_member(auth.uid())
    AND public.tier_rank(public.current_tier(auth.uid()))
      >= public.tier_rank('contributor'::public.membership_tier)
  )
);

DROP POLICY IF EXISTS "posts delete own or staff" ON public.community_posts;
CREATE POLICY "posts delete own or staff" ON public.community_posts
FOR DELETE TO authenticated
USING (
  public.is_staff(auth.uid())
  OR (
    author_id = auth.uid()
    AND public.is_active_member(auth.uid())
    AND public.tier_rank(public.current_tier(auth.uid()))
      >= public.tier_rank('contributor'::public.membership_tier)
  )
);

-- Counter triggers update post rows even when an interaction belongs to another author.
CREATE OR REPLACE FUNCTION public.bump_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.bump_comment_count() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bump_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.bump_like_count() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "comments insert own" ON public.comments;
CREATE POLICY "comments insert own" ON public.comments
FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND public.is_active_member(auth.uid())
  AND public.tier_rank(public.current_tier(auth.uid()))
    >= public.tier_rank('contributor'::public.membership_tier)
);

DROP POLICY IF EXISTS "comments update own" ON public.comments;
CREATE POLICY "comments update own" ON public.comments
FOR UPDATE TO authenticated
USING (
  public.is_staff(auth.uid())
  OR (
    author_id = auth.uid()
    AND public.is_active_member(auth.uid())
    AND public.tier_rank(public.current_tier(auth.uid()))
      >= public.tier_rank('contributor'::public.membership_tier)
  )
)
WITH CHECK (
  public.is_staff(auth.uid())
  OR (
    author_id = auth.uid()
    AND public.is_active_member(auth.uid())
    AND public.tier_rank(public.current_tier(auth.uid()))
      >= public.tier_rank('contributor'::public.membership_tier)
  )
);

DROP POLICY IF EXISTS "comments delete own or staff" ON public.comments;
CREATE POLICY "comments delete own or staff" ON public.comments
FOR DELETE TO authenticated
USING (
  public.is_staff(auth.uid())
  OR (
    author_id = auth.uid()
    AND public.is_active_member(auth.uid())
    AND public.tier_rank(public.current_tier(auth.uid()))
      >= public.tier_rank('contributor'::public.membership_tier)
  )
);

DROP POLICY IF EXISTS "likes insert own" ON public.post_likes;
CREATE POLICY "likes insert own" ON public.post_likes
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.is_active_member(auth.uid())
  AND public.tier_rank(public.current_tier(auth.uid()))
    >= public.tier_rank('contributor'::public.membership_tier)
);

DROP POLICY IF EXISTS "likes delete own" ON public.post_likes;
CREATE POLICY "likes delete own" ON public.post_likes
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  AND public.is_active_member(auth.uid())
  AND public.tier_rank(public.current_tier(auth.uid()))
    >= public.tier_rank('contributor'::public.membership_tier)
);

DROP POLICY IF EXISTS "dm insert as sender" ON public.direct_messages;
CREATE POLICY "dm insert as sender" ON public.direct_messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_active_member(auth.uid())
  AND public.tier_rank(public.current_tier(auth.uid()))
    >= public.tier_rank('contributor'::public.membership_tier)
);

REVOKE UPDATE ON public.direct_messages FROM PUBLIC, anon, authenticated;
GRANT UPDATE (read_at) ON public.direct_messages TO authenticated;

DROP POLICY IF EXISTS "cop insert own" ON public.cop_memberships;
CREATE POLICY "cop insert own" ON public.cop_memberships
FOR INSERT TO authenticated
WITH CHECK (
  member_id = auth.uid()
  AND public.is_active_member(auth.uid())
  AND public.tier_rank(public.current_tier(auth.uid()))
    >= public.tier_rank('contributor'::public.membership_tier)
);

DROP POLICY IF EXISTS "cop delete own" ON public.cop_memberships;
CREATE POLICY "cop delete own" ON public.cop_memberships
FOR DELETE TO authenticated
USING (
  public.is_staff(auth.uid())
  OR (
    member_id = auth.uid()
    AND public.is_active_member(auth.uid())
    AND public.tier_rank(public.current_tier(auth.uid()))
      >= public.tier_rank('contributor'::public.membership_tier)
  )
);

DROP POLICY IF EXISTS "wgm join self" ON public.working_group_members;
CREATE POLICY "wgm join self" ON public.working_group_members
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.is_active_member(auth.uid())
  AND public.tier_rank(public.current_tier(auth.uid()))
    >= public.tier_rank('contributor'::public.membership_tier)
);

DROP POLICY IF EXISTS "wgm leave self or staff" ON public.working_group_members;
CREATE POLICY "wgm leave self or staff" ON public.working_group_members
FOR DELETE TO authenticated
USING (
  public.is_staff(auth.uid())
  OR (
    user_id = auth.uid()
    AND public.is_active_member(auth.uid())
    AND public.tier_rank(public.current_tier(auth.uid()))
      >= public.tier_rank('contributor'::public.membership_tier)
  )
);

DROP POLICY IF EXISTS "votes insert self" ON public.poll_votes;
CREATE POLICY "votes insert self" ON public.poll_votes
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.is_active_member(auth.uid())
  AND public.tier_rank(public.current_tier(auth.uid()))
    >= public.tier_rank('contributor'::public.membership_tier)
);

DROP POLICY IF EXISTS "votes delete self" ON public.poll_votes;
CREATE POLICY "votes delete self" ON public.poll_votes
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  AND public.is_active_member(auth.uid())
  AND public.tier_rank(public.current_tier(auth.uid()))
    >= public.tier_rank('contributor'::public.membership_tier)
);

DROP POLICY IF EXISTS "wg insert chair/staff" ON public.working_groups;
CREATE POLICY "wg insert chair/staff" ON public.working_groups
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    public.is_staff(auth.uid())
    OR (
      public.is_active_member(auth.uid())
      AND public.tier_rank(public.current_tier(auth.uid()))
        >= public.tier_rank('contributor'::public.membership_tier)
      AND public.is_cop_chair(auth.uid(), cop)
    )
  )
);

DROP POLICY IF EXISTS "wg update chair/staff/lead" ON public.working_groups;
CREATE POLICY "wg update chair/staff/lead" ON public.working_groups
FOR UPDATE TO authenticated
USING (
  public.is_staff(auth.uid())
  OR (
    public.is_active_member(auth.uid())
    AND public.tier_rank(public.current_tier(auth.uid()))
      >= public.tier_rank('contributor'::public.membership_tier)
    AND (
      public.is_cop_chair(auth.uid(), cop)
      OR lead_id = auth.uid()
    )
  )
)
WITH CHECK (
  public.is_staff(auth.uid())
  OR (
    public.is_active_member(auth.uid())
    AND public.tier_rank(public.current_tier(auth.uid()))
      >= public.tier_rank('contributor'::public.membership_tier)
    AND (
      public.is_cop_chair(auth.uid(), cop)
      OR lead_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "wg delete chair/staff" ON public.working_groups;
CREATE POLICY "wg delete chair/staff" ON public.working_groups
FOR DELETE TO authenticated
USING (
  public.is_staff(auth.uid())
  OR (
    public.is_active_member(auth.uid())
    AND public.tier_rank(public.current_tier(auth.uid()))
      >= public.tier_rank('contributor'::public.membership_tier)
    AND public.is_cop_chair(auth.uid(), cop)
  )
);

DROP POLICY IF EXISTS "polls insert chair/staff" ON public.polls;
CREATE POLICY "polls insert chair/staff" ON public.polls
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    public.is_staff(auth.uid())
    OR (
      public.is_active_member(auth.uid())
      AND public.tier_rank(public.current_tier(auth.uid()))
        >= public.tier_rank('contributor'::public.membership_tier)
      AND public.is_cop_chair(auth.uid(), cop)
    )
  )
);

DROP POLICY IF EXISTS "polls update chair/staff" ON public.polls;
CREATE POLICY "polls update chair/staff" ON public.polls
FOR UPDATE TO authenticated
USING (
  public.is_staff(auth.uid())
  OR (
    public.is_active_member(auth.uid())
    AND public.tier_rank(public.current_tier(auth.uid()))
      >= public.tier_rank('contributor'::public.membership_tier)
    AND public.is_cop_chair(auth.uid(), cop)
  )
)
WITH CHECK (
  public.is_staff(auth.uid())
  OR (
    public.is_active_member(auth.uid())
    AND public.tier_rank(public.current_tier(auth.uid()))
      >= public.tier_rank('contributor'::public.membership_tier)
    AND public.is_cop_chair(auth.uid(), cop)
  )
);

DROP POLICY IF EXISTS "polls delete chair/staff" ON public.polls;
CREATE POLICY "polls delete chair/staff" ON public.polls
FOR DELETE TO authenticated
USING (
  public.is_staff(auth.uid())
  OR (
    public.is_active_member(auth.uid())
    AND public.tier_rank(public.current_tier(auth.uid()))
      >= public.tier_rank('contributor'::public.membership_tier)
    AND public.is_cop_chair(auth.uid(), cop)
  )
);

DROP POLICY IF EXISTS "rfcs insert active" ON public.rfcs;
CREATE POLICY "rfcs insert active" ON public.rfcs
FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND public.is_active_member(auth.uid())
  AND public.tier_rank(public.current_tier(auth.uid()))
    >= public.tier_rank('contributor'::public.membership_tier)
);

DROP POLICY IF EXISTS "rfcs update author/chair/staff" ON public.rfcs;
CREATE POLICY "rfcs update author/chair/staff" ON public.rfcs
FOR UPDATE TO authenticated
USING (
  public.is_staff(auth.uid())
  OR (
    public.is_active_member(auth.uid())
    AND public.tier_rank(public.current_tier(auth.uid()))
      >= public.tier_rank('contributor'::public.membership_tier)
    AND (
      author_id = auth.uid()
      OR public.is_cop_chair(auth.uid(), cop)
    )
  )
)
WITH CHECK (
  public.is_staff(auth.uid())
  OR (
    public.is_active_member(auth.uid())
    AND public.tier_rank(public.current_tier(auth.uid()))
      >= public.tier_rank('contributor'::public.membership_tier)
    AND (
      author_id = auth.uid()
      OR public.is_cop_chair(auth.uid(), cop)
    )
  )
);

DROP POLICY IF EXISTS "rfcs delete author/staff" ON public.rfcs;
CREATE POLICY "rfcs delete author/staff" ON public.rfcs
FOR DELETE TO authenticated
USING (
  public.is_staff(auth.uid())
  OR (
    author_id = auth.uid()
    AND public.is_active_member(auth.uid())
    AND public.tier_rank(public.current_tier(auth.uid()))
      >= public.tier_rank('contributor'::public.membership_tier)
  )
);

DROP POLICY IF EXISTS "rfcr insert self" ON public.rfc_reactions;
CREATE POLICY "rfcr insert self" ON public.rfc_reactions
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.is_active_member(auth.uid())
  AND public.tier_rank(public.current_tier(auth.uid()))
    >= public.tier_rank('contributor'::public.membership_tier)
);

DROP POLICY IF EXISTS "rfcr update self" ON public.rfc_reactions;
CREATE POLICY "rfcr update self" ON public.rfc_reactions
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND public.is_active_member(auth.uid())
  AND public.tier_rank(public.current_tier(auth.uid()))
    >= public.tier_rank('contributor'::public.membership_tier)
)
WITH CHECK (
  user_id = auth.uid()
  AND public.is_active_member(auth.uid())
  AND public.tier_rank(public.current_tier(auth.uid()))
    >= public.tier_rank('contributor'::public.membership_tier)
);

DROP POLICY IF EXISTS "rfcr delete self" ON public.rfc_reactions;
CREATE POLICY "rfcr delete self" ON public.rfc_reactions
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  AND public.is_active_member(auth.uid())
  AND public.tier_rank(public.current_tier(auth.uid()))
    >= public.tier_rank('contributor'::public.membership_tier)
);

DROP POLICY IF EXISTS "rfcc insert self" ON public.rfc_comments;
CREATE POLICY "rfcc insert self" ON public.rfc_comments
FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND public.is_active_member(auth.uid())
  AND public.tier_rank(public.current_tier(auth.uid()))
    >= public.tier_rank('contributor'::public.membership_tier)
);

DROP POLICY IF EXISTS "rfcc delete own/staff" ON public.rfc_comments;
CREATE POLICY "rfcc delete own/staff" ON public.rfc_comments
FOR DELETE TO authenticated
USING (
  public.is_staff(auth.uid())
  OR (
    author_id = auth.uid()
    AND public.is_active_member(auth.uid())
    AND public.tier_rank(public.current_tier(auth.uid()))
      >= public.tier_rank('contributor'::public.membership_tier)
  )
);

DROP POLICY IF EXISTS "offers manage self" ON public.mentorship_offers;
CREATE POLICY "offers manage self" ON public.mentorship_offers
FOR ALL TO authenticated
USING (
  public.is_staff(auth.uid())
  OR (
    mentor_id = auth.uid()
    AND public.is_active_member(auth.uid())
    AND public.tier_rank(public.current_tier(auth.uid()))
      >= public.tier_rank('growth_partner'::public.membership_tier)
  )
)
WITH CHECK (
  public.is_staff(auth.uid())
  OR (
    mentor_id = auth.uid()
    AND public.is_active_member(auth.uid())
    AND public.tier_rank(public.current_tier(auth.uid()))
      >= public.tier_rank('growth_partner'::public.membership_tier)
  )
);

DROP POLICY IF EXISTS "bookings insert requester" ON public.mentorship_bookings;
CREATE POLICY "bookings insert requester" ON public.mentorship_bookings
FOR INSERT TO authenticated
WITH CHECK (
  requester_id = auth.uid()
  AND public.is_active_member(auth.uid())
  AND public.tier_rank(public.current_tier(auth.uid()))
    >= public.tier_rank('contributor'::public.membership_tier)
);

DROP POLICY IF EXISTS "bookings update parties" ON public.mentorship_bookings;
CREATE POLICY "bookings update parties" ON public.mentorship_bookings
FOR UPDATE TO authenticated
USING (
  public.is_staff(auth.uid())
  OR (
    public.is_active_member(auth.uid())
    AND public.tier_rank(public.current_tier(auth.uid()))
      >= public.tier_rank('contributor'::public.membership_tier)
    AND (mentor_id = auth.uid() OR requester_id = auth.uid())
  )
)
WITH CHECK (
  public.is_staff(auth.uid())
  OR (
    public.is_active_member(auth.uid())
    AND public.tier_rank(public.current_tier(auth.uid()))
      >= public.tier_rank('contributor'::public.membership_tier)
    AND (mentor_id = auth.uid() OR requester_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "bookings delete parties" ON public.mentorship_bookings;
CREATE POLICY "bookings delete parties" ON public.mentorship_bookings
FOR DELETE TO authenticated
USING (
  public.is_staff(auth.uid())
  OR (
    public.is_active_member(auth.uid())
    AND public.tier_rank(public.current_tier(auth.uid()))
      >= public.tier_rank('contributor'::public.membership_tier)
    AND (mentor_id = auth.uid() OR requester_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "community post images upload own" ON storage.objects;
CREATE POLICY "community post images upload own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'community-post-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND public.is_active_member(auth.uid())
  AND public.tier_rank(public.current_tier(auth.uid()))
    >= public.tier_rank('contributor'::public.membership_tier)
);

DROP POLICY IF EXISTS "community post images delete own" ON storage.objects;
CREATE POLICY "community post images delete own" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'community-post-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND public.is_active_member(auth.uid())
  AND public.tier_rank(public.current_tier(auth.uid()))
    >= public.tier_rank('contributor'::public.membership_tier)
);