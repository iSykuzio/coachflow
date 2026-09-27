-- ============================================================================
-- CoachFlow — stop workout_exercises RLS from recursing.
-- Additive. Does not drop tables, disable RLS, or edit 0001–0012.
--
-- 0007 let ordinary policies read workout_exercises and assigned_workouts.
-- Those reads are themselves subject to RLS, so a policy check re-enters
-- workout_exercises and Postgres raises infinite recursion.
-- The checks below run as the function owner and do not re-apply RLS.
-- ============================================================================

create or replace function public.owns_workout(p_workout_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.workouts w
    where w.id = p_workout_id
      and w.trainer_id = auth.uid()
  );
end;
$$;

create or replace function public.workout_assigned_to_me(p_workout_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.assigned_workouts aw
    where aw.workout_id = p_workout_id
      and aw.client_id = auth.uid()
  );
end;
$$;

create or replace function public.exercise_assigned_to_me(p_exercise_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.workout_exercises we
    join public.assigned_workouts aw on aw.workout_id = we.workout_id
    where we.exercise_id = p_exercise_id
      and aw.client_id = auth.uid()
  );
end;
$$;

revoke all on function public.owns_workout(uuid) from public, anon;
revoke all on function public.workout_assigned_to_me(uuid) from public, anon;
revoke all on function public.exercise_assigned_to_me(uuid) from public, anon;
grant execute on function public.owns_workout(uuid) to authenticated;
grant execute on function public.workout_assigned_to_me(uuid) to authenticated;
grant execute on function public.exercise_assigned_to_me(uuid) to authenticated;

drop policy if exists "workout_exercises_select_own" on public.workout_exercises;
create policy "workout_exercises_select_own" on public.workout_exercises
  for select to authenticated
  using (public.owns_workout(workout_id));

drop policy if exists "workout_exercises_select_if_assigned" on public.workout_exercises;
create policy "workout_exercises_select_if_assigned" on public.workout_exercises
  for select to authenticated
  using (public.workout_assigned_to_me(workout_id));

drop policy if exists "workout_exercises_insert_own" on public.workout_exercises;
create policy "workout_exercises_insert_own" on public.workout_exercises
  for insert to authenticated
  with check (public.owns_workout(workout_id));

drop policy if exists "workout_exercises_update_own" on public.workout_exercises;
create policy "workout_exercises_update_own" on public.workout_exercises
  for update to authenticated
  using (public.owns_workout(workout_id))
  with check (public.owns_workout(workout_id));

drop policy if exists "workout_exercises_delete_own" on public.workout_exercises;
create policy "workout_exercises_delete_own" on public.workout_exercises
  for delete to authenticated
  using (public.owns_workout(workout_id));

drop policy if exists "workouts_select_if_assigned" on public.workouts;
create policy "workouts_select_if_assigned" on public.workouts
  for select to authenticated
  using (public.workout_assigned_to_me(id));

drop policy if exists "exercises_select_if_on_assigned_workout" on public.exercises;
create policy "exercises_select_if_on_assigned_workout" on public.exercises
  for select to authenticated
  using (public.exercise_assigned_to_me(id));
