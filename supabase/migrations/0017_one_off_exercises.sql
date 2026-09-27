-- ============================================================================
-- CoachFlow — one-off exercise names typed into a workout.
-- Additive. Does not edit 0001–0016 or change RLS.
-- Existing exercises stay in the library. A typed one-off is the same table
-- with in_library false, so My Exercises does not list it.
-- ============================================================================

alter table public.exercises
  add column if not exists in_library boolean not null default true;
