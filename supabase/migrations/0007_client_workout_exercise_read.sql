-- ============================================================================
-- CoachFlow — clients can read exercises on workouts assigned to them.
-- Additive. Does not drop tables, disable RLS, or rewrite 0001–0006.
--
-- workout_exercises / workouts client reads previously depended on
-- public.workout_assigned_to_me(). That helper is SECURITY DEFINER with
-- search_path = public, and it was never granted to authenticated.
-- On current Supabase projects a policy call then fails, PostgREST returns
-- an error, and the client page treated that as an empty exercise list.
-- These policies use the same assigned_workouts visibility the client
-- already has. They do not expose another client's rows.
-- ============================================================================

grant execute on function public.is_trainer_of(uuid) to authenticated;
grant execute on function public.is_client_of(uuid) to authenticated;
grant execute on function public.owns_workout(uuid) to authenticated;
grant execute on function public.workout_assigned_to_me(uuid) to authenticated;

revoke execute on function public.is_trainer_of(uuid) from public, anon;
revoke execute on function public.is_client_of(uuid) from public, anon;
revoke execute on function public.owns_workout(uuid) from public, anon;
revoke execute on function public.workout_assigned_to_me(uuid) from public, anon;

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

-- Custom exercises are not in the shared library. A client may read an
-- exercise only when it is on a workout assigned to them.
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
