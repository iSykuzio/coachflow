-- ============================================================================
-- CoachFlow — Stage C: workout MVP guards + shared exercise seed
-- Additive. Does not drop tables, disable RLS, or rewrite 0001–0004.
-- ============================================================================

-- Trainers may only assign their own workouts to their ACTIVE clients.
drop policy if exists "assigned_workouts_insert_trainer" on public.assigned_workouts;
create policy "assigned_workouts_insert_trainer" on public.assigned_workouts
  for insert with check (
    trainer_id = auth.uid()
    and exists (
      select 1 from public.trainer_clients tc
      where tc.trainer_id = auth.uid()
        and tc.client_id = client_id
        and tc.status = 'active'
    )
    and exists (
      select 1 from public.workouts w
      where w.id = workout_id
        and w.trainer_id = auth.uid()
    )
  );

-- Clients change assignment status through RPCs, not direct updates.
drop policy if exists "assigned_workouts_update_client" on public.assigned_workouts;

-- Clients may only start a session for an assignment that belongs to them.
drop policy if exists "workout_sessions_insert_own" on public.workout_sessions;
create policy "workout_sessions_insert_own" on public.workout_sessions
  for insert with check (
    client_id = auth.uid()
    and exists (
      select 1 from public.assigned_workouts aw
      where aw.id = assigned_workout_id
        and aw.client_id = auth.uid()
    )
  );

-- Invitation RPCs are the only way to create trainer/client pairings.
drop policy if exists "trainer_clients_insert_by_trainer" on public.trainer_clients;
drop policy if exists "clients_insert_by_trainer" on public.clients;

create unique index if not exists workout_sessions_one_open_per_assignment_idx
  on public.workout_sessions (assigned_workout_id)
  where status = 'in_progress';

create unique index if not exists set_logs_session_exercise_set_idx
  on public.set_logs (workout_session_id, workout_exercise_id, set_number);

-- ----------------------------------------------------------------------------
-- Trainer assigns a workout to an active client.
-- ----------------------------------------------------------------------------
create or replace function public.assign_workout(
  p_workout_id uuid,
  p_client_id uuid,
  p_due_date date default null
)
returns public.assigned_workouts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainer_id uuid := auth.uid();
  v_row public.assigned_workouts%rowtype;
begin
  if v_trainer_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (select 1 from public.trainers t where t.id = v_trainer_id) then
    raise exception 'Only trainers can assign workouts';
  end if;

  if not exists (
    select 1 from public.workouts w
    where w.id = p_workout_id and w.trainer_id = v_trainer_id
  ) then
    raise exception 'Workout not found';
  end if;

  if not exists (
    select 1 from public.workout_exercises we
    where we.workout_id = p_workout_id
  ) then
    raise exception 'Add at least one exercise before assigning this workout';
  end if;

  if not exists (
    select 1 from public.trainer_clients tc
    where tc.trainer_id = v_trainer_id
      and tc.client_id = p_client_id
      and tc.status = 'active'
  ) then
    raise exception 'You can only assign workouts to your active clients';
  end if;

  insert into public.assigned_workouts (
    workout_id, client_id, trainer_id, assigned_date, due_date, status
  )
  values (
    p_workout_id, p_client_id, v_trainer_id, current_date, p_due_date, 'assigned'
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.assign_workout(uuid, uuid, date) from public;
revoke all on function public.assign_workout(uuid, uuid, date) from anon;
grant execute on function public.assign_workout(uuid, uuid, date) to authenticated;

-- ----------------------------------------------------------------------------
-- Client starts (or resumes) a session for their assignment.
-- ----------------------------------------------------------------------------
create or replace function public.start_or_get_workout_session(p_assigned_workout_id uuid)
returns public.workout_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid := auth.uid();
  v_assignment public.assigned_workouts%rowtype;
  v_session public.workout_sessions%rowtype;
begin
  if v_client_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_assignment
  from public.assigned_workouts
  where id = p_assigned_workout_id
  for update;

  if not found or v_assignment.client_id is distinct from v_client_id then
    raise exception 'Assignment not found';
  end if;

  select * into v_session
  from public.workout_sessions
  where assigned_workout_id = p_assigned_workout_id
    and client_id = v_client_id
    and status = 'in_progress'
  limit 1;

  if found then
    return v_session;
  end if;

  insert into public.workout_sessions (assigned_workout_id, client_id, status)
  values (p_assigned_workout_id, v_client_id, 'in_progress')
  returning * into v_session;

  if v_assignment.status = 'assigned' then
    update public.assigned_workouts
    set status = 'in_progress'
    where id = p_assigned_workout_id;
  end if;

  return v_session;
end;
$$;

revoke all on function public.start_or_get_workout_session(uuid) from public;
revoke all on function public.start_or_get_workout_session(uuid) from anon;
grant execute on function public.start_or_get_workout_session(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Client completes the current session.
-- ----------------------------------------------------------------------------
create or replace function public.complete_workout_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid := auth.uid();
  v_session public.workout_sessions%rowtype;
begin
  if v_client_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_session
  from public.workout_sessions
  where id = p_session_id
  for update;

  if not found or v_session.client_id is distinct from v_client_id then
    raise exception 'Session not found';
  end if;

  if v_session.status = 'completed' then
    return;
  end if;

  update public.workout_sessions
  set status = 'completed',
      completed_at = now()
  where id = p_session_id;

  update public.assigned_workouts
  set status = 'completed'
  where id = v_session.assigned_workout_id
    and client_id = v_client_id;
end;
$$;

revoke all on function public.complete_workout_session(uuid) from public;
revoke all on function public.complete_workout_session(uuid) from anon;
grant execute on function public.complete_workout_session(uuid) to authenticated;

-- Shared library (trainer_id is null). Idempotent by name.
insert into public.exercises (name, category, muscle_group, equipment, instructions, is_custom, trainer_id)
select seed.name, seed.category, seed.muscle_group, seed.equipment, seed.instructions, false, null
from (
  values
    ('Squat', 'Strength', 'Quads', 'Barbell', 'Bar on upper back. Sit down until thighs are at least parallel, then stand.'),
    ('Bench Press', 'Strength', 'Chest', 'Barbell', 'Lower the bar to mid-chest, then press to lockout.'),
    ('Deadlift', 'Strength', 'Posterior chain', 'Barbell', 'Hinge, keep a flat back, stand up with the bar close to the body.'),
    ('Overhead Press', 'Strength', 'Shoulders', 'Barbell', 'Press the bar from the shoulders to lockout overhead.'),
    ('Barbell Row', 'Strength', 'Back', 'Barbell', 'Hinge to ~45°, pull the bar to the lower ribs.'),
    ('Romanian Deadlift', 'Strength', 'Hamstrings', 'Barbell', 'Soft knees, push hips back, keep the bar close.'),
    ('Lat Pulldown', 'Strength', 'Back', 'Cable', 'Pull the bar to the upper chest without shrugging.'),
    ('Dumbbell Lunge', 'Strength', 'Quads', 'Dumbbell', 'Step forward and drop the back knee, then return.'),
    ('Hip Thrust', 'Strength', 'Glutes', 'Barbell', 'Upper back on a bench, drive through the heels to full hip extension.'),
    ('Push-up', 'Strength', 'Chest', 'Bodyweight', 'Body in a line, lower chest to the floor, then press up.'),
    ('Pull-up', 'Strength', 'Back', 'Bodyweight', 'Dead hang, pull the chest to the bar, lower with control.'),
    ('Plank', 'Core', 'Core', 'Bodyweight', 'Elbows under shoulders, body in a straight line. Breathe.')
) as seed(name, category, muscle_group, equipment, instructions)
where not exists (
  select 1 from public.exercises e
  where e.trainer_id is null
    and lower(e.name) = lower(seed.name)
);
