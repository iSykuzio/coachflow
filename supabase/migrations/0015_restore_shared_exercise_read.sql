-- ============================================================================
-- CoachFlow — restore read access to the shared exercise library.
-- Additive. Does not edit 0001–0014, reseed exercises, or change write policies.
-- Production is missing exercises_select_global from 0002. Shared rows use
-- trainer_id null. This policy only allows SELECT of those rows.
-- ============================================================================

drop policy if exists "exercises_select_global" on public.exercises;

create policy "exercises_select_global" on public.exercises
  for select using (trainer_id is null);
