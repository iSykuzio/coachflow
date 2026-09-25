-- ============================================================================
-- CoachFlow — clients can read exercises on workouts assigned to them.
-- Additive. Does not drop tables, disable RLS, or rewrite 0001–0006.
--
-- Do not GRANT or REVOKE helper functions here. 0004 recreates
-- is_trainer_of / is_client_of. The live database reported that
-- public.owns_workout(uuid) does not exist, and a failing GRANT aborts the
-- whole script before these policies are created.
--
-- A client may read a workout, its lines, and an exercise on those lines
-- only when that workout is assigned to the authenticated client.
-- ============================================================================

drop policy if exists "workouts_select_if_assigned" on public.workouts;
create policy "workouts_select_if_assigned" on public.workouts
  for select to authenticated
  using (
    exists (
      select 1
      from public.assigned_workouts aw
      where aw.workout_id = workouts.id
        and aw.client_id = (select auth.uid())
    )
  );

drop policy if exists "workout_exercises_select_if_assigned" on public.workout_exercises;
create policy "workout_exercises_select_if_assigned" on public.workout_exercises
  for select to authenticated
  using (
    exists (
      select 1
      from public.assigned_workouts aw
      where aw.workout_id = workout_exercises.workout_id
        and aw.client_id = (select auth.uid())
    )
  );

drop policy if exists "exercises_select_if_on_assigned_workout" on public.exercises;
create policy "exercises_select_if_on_assigned_workout" on public.exercises
  for select to authenticated
  using (
    exists (
      select 1
      from public.workout_exercises we
      join public.assigned_workouts aw on aw.workout_id = we.workout_id
      where we.exercise_id = exercises.id
        and aw.client_id = (select auth.uid())
    )
  );
