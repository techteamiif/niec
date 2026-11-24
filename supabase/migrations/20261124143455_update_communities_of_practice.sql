ALTER TYPE public.cop_type RENAME VALUE 'giis-inclusive-impact' TO 'icc';
ALTER TYPE public.cop_type RENAME VALUE 'niiric' TO 'niric';

UPDATE public.cop_memberships AS target
SET joined_at = LEAST(target.joined_at, source.joined_at)
FROM public.cop_memberships AS source
WHERE source.cop IN ('policy-acii', 'climate-green-finance')
  AND target.member_id = source.member_id
  AND target.cop = CASE source.cop
    WHEN 'policy-acii' THEN 'niric'::public.cop_type
    ELSE 'eso-collaborative'::public.cop_type
  END;

DELETE FROM public.cop_memberships AS source
USING public.cop_memberships AS target
WHERE source.cop IN ('policy-acii', 'climate-green-finance')
  AND target.member_id = source.member_id
  AND target.cop = CASE source.cop
    WHEN 'policy-acii' THEN 'niric'::public.cop_type
    ELSE 'eso-collaborative'::public.cop_type
  END;

UPDATE public.cop_memberships
SET cop = CASE cop
  WHEN 'policy-acii' THEN 'niric'::public.cop_type
  ELSE 'eso-collaborative'::public.cop_type
END
WHERE cop IN ('policy-acii', 'climate-green-finance');

UPDATE public.cop_roles AS target
SET
  assigned_at = LEAST(target.assigned_at, source.assigned_at),
  assigned_by = COALESCE(target.assigned_by, source.assigned_by)
FROM public.cop_roles AS source
WHERE source.cop IN ('policy-acii', 'climate-green-finance')
  AND target.user_id = source.user_id
  AND target.role = source.role
  AND target.cop = CASE source.cop
    WHEN 'policy-acii' THEN 'niric'::public.cop_type
    ELSE 'eso-collaborative'::public.cop_type
  END;

DELETE FROM public.cop_roles AS source
USING public.cop_roles AS target
WHERE source.cop IN ('policy-acii', 'climate-green-finance')
  AND target.user_id = source.user_id
  AND target.role = source.role
  AND target.cop = CASE source.cop
    WHEN 'policy-acii' THEN 'niric'::public.cop_type
    ELSE 'eso-collaborative'::public.cop_type
  END;

UPDATE public.cop_roles
SET cop = CASE cop
  WHEN 'policy-acii' THEN 'niric'::public.cop_type
  ELSE 'eso-collaborative'::public.cop_type
END
WHERE cop IN ('policy-acii', 'climate-green-finance');

UPDATE public.member_badges AS target
SET
  awarded_at = LEAST(target.awarded_at, source.awarded_at),
  awarded_by = COALESCE(target.awarded_by, source.awarded_by)
FROM public.member_badges AS source
WHERE source.cop IN ('policy-acii', 'climate-green-finance')
  AND target.user_id = source.user_id
  AND target.badge_key = source.badge_key
  AND target.cop = CASE source.cop
    WHEN 'policy-acii' THEN 'niric'::public.cop_type
    ELSE 'eso-collaborative'::public.cop_type
  END;

DELETE FROM public.member_badges AS source
USING public.member_badges AS target
WHERE source.cop IN ('policy-acii', 'climate-green-finance')
  AND target.user_id = source.user_id
  AND target.badge_key = source.badge_key
  AND target.cop = CASE source.cop
    WHEN 'policy-acii' THEN 'niric'::public.cop_type
    ELSE 'eso-collaborative'::public.cop_type
  END;

UPDATE public.member_badges
SET cop = CASE cop
  WHEN 'policy-acii' THEN 'niric'::public.cop_type
  ELSE 'eso-collaborative'::public.cop_type
END
WHERE cop IN ('policy-acii', 'climate-green-finance');

UPDATE public.community_posts
SET community_of_practice = CASE community_of_practice
  WHEN 'policy-acii' THEN 'niric'::public.cop_type
  ELSE 'eso-collaborative'::public.cop_type
END
WHERE community_of_practice IN ('policy-acii', 'climate-green-finance');

UPDATE public.events
SET community_of_practice = CASE community_of_practice
  WHEN 'policy-acii' THEN 'niric'::public.cop_type
  ELSE 'eso-collaborative'::public.cop_type
END
WHERE community_of_practice IN ('policy-acii', 'climate-green-finance');

UPDATE public.knowledge_resources
SET community_of_practice = CASE community_of_practice
  WHEN 'policy-acii' THEN 'niric'::public.cop_type
  ELSE 'eso-collaborative'::public.cop_type
END
WHERE community_of_practice IN ('policy-acii', 'climate-green-finance');

UPDATE public.working_groups
SET cop = CASE cop
  WHEN 'policy-acii' THEN 'niric'::public.cop_type
  ELSE 'eso-collaborative'::public.cop_type
END
WHERE cop IN ('policy-acii', 'climate-green-finance');

UPDATE public.polls
SET cop = CASE cop
  WHEN 'policy-acii' THEN 'niric'::public.cop_type
  ELSE 'eso-collaborative'::public.cop_type
END
WHERE cop IN ('policy-acii', 'climate-green-finance');

UPDATE public.mentorship_offers AS offer
SET cops = COALESCE(
  (
    SELECT array_agg(mapped.cop ORDER BY mapped.first_position)
    FROM (
      SELECT CASE choices.cop
        WHEN 'policy-acii' THEN 'niric'::public.cop_type
        WHEN 'climate-green-finance' THEN 'eso-collaborative'::public.cop_type
        ELSE choices.cop
      END AS cop,
      MIN(choices.ordinality) AS first_position
      FROM unnest(offer.cops) WITH ORDINALITY AS choices(cop, ordinality)
      GROUP BY 1
    ) AS mapped
  ),
  '{}'::public.cop_type[]
)
WHERE offer.cops && ARRAY[
  'policy-acii'::public.cop_type,
  'climate-green-finance'::public.cop_type
];