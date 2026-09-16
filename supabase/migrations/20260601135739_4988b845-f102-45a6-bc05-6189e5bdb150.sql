
DROP VIEW IF EXISTS public.cop_leaderboard;
CREATE VIEW public.cop_leaderboard WITH (security_invoker=true) AS
SELECT
  cm.cop,
  cm.member_id AS user_id,
  p.full_name,
  p.avatar_url,
  p.engagement_score,
  COALESCE((SELECT COUNT(*) FROM public.community_posts cp WHERE cp.author_id = cm.member_id AND cp.community_of_practice = cm.cop AND cp.created_at > now() - interval '30 days'), 0) AS posts_30d
FROM public.cop_memberships cm
JOIN public.profiles p ON p.id = cm.member_id;

GRANT SELECT ON public.cop_leaderboard TO authenticated;
