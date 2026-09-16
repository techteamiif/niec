
-- Rename CoP enum values in place to align with IIF programme architecture.
-- No table data changes; all foreign references, memberships, posts, polls, RFCs preserved.
ALTER TYPE public.cop_type RENAME VALUE 'gender_inclusive' TO 'giis-inclusive-impact';
ALTER TYPE public.cop_type RENAME VALUE 'data_measurement' TO 'niiric';
ALTER TYPE public.cop_type RENAME VALUE 'policy_advocacy'  TO 'policy-acii';
ALTER TYPE public.cop_type RENAME VALUE 'digital_fintech'  TO 'capital-deals';
ALTER TYPE public.cop_type RENAME VALUE 'creative_economy' TO 'eso-collaborative';
ALTER TYPE public.cop_type RENAME VALUE 'climate_green'    TO 'climate-green-finance';

-- Additive: tag events to a CoP so /events and CoP workspaces can filter.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS community_of_practice public.cop_type;

-- Additive: category tag on deal opportunities for Deal Room filtering.
ALTER TABLE public.deal_opportunities
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general';
