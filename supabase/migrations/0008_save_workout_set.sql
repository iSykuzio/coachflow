-- ============================================================================
-- CoachFlow — client set logging.
-- Additive. Does not rewrite 0001–0007 or disable RLS.
--
-- The logger upserts directly into set_logs. That is
-- INSERT ... ON CONFLICT DO UPDATE, so Postgres applies set_logs INSERT and
-- UPDATE policies. 0002's UPDATE policy is USING-only, and the INSERT check
-- can see workout_sessions only through the caller's RLS. The session row is
-- created by start_or_get_workout_session (security definer), then the upsert
-- runs as the client and is rejected. The page hid the database error.
--
-- save_workout_set writes one set only after proving the assignment, the
-- exercise, and the session belong to auth.uid().
-- ============================================================================

create unique index if not exists set_logs_session_exercise_set_idx
  on public.set_logs (workout_session_id, workout_exercise_id, set_number);

create or replace function public.save_workout_set(
  p_assigned_workout_id uuid,
  p_workout_exercise_id uuid,
  p_set_number integer,
  p_reps integer,
  p_weight numeric,
  p_notes text
)
returns public.set_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_workout_id uuid;
  v_session_id uuid;
  v_row public.set_logs%rowtype;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_set_number is null or p_set_number < 1 or p_set_number > 20 then
    raise exception 'Invalid set number';
  end if;

  select aw.workout_id into v_workout_id
  from public.assigned_workouts aw
  where aw.id = p_assigned_workout_id
    and aw.client_id = v_uid;

  if v_workout_id is null then
    raise exception 'Assignment not found';
  end if;

  if not exists (
    select 1
    from public.workout_exercises we
    where we.id = p_workout_exercise_id
      and we.workout_id = v_workout_id
  ) then
    raise exception 'Exercise is not on this workout';
  end if;

  select ws.id into v_session_id
  from public.workout_sessions ws
  where ws.assigned_workout_id = p_assigned_workout_id
    and ws.client_id = v_uid
    and ws.status = 'in_progress'
  order by ws.started_at desc
  limit 1;

  if v_session_id is null then
    begin
      insert into public.workout_sessions (assigned_workout_id, client_id, status)
      values (p_assigned_workout_id, v_uid, 'in_progress')
      returning id into v_session_id;
    exception
      when unique_violation then
        select ws.id into v_session_id
        from public.workout_sessions ws
        where ws.assigned_workout_id = p_assigned_workout_id
          and ws.client_id = v_uid
          and ws.status = 'in_progress'
        order by ws.started_at desc
        limit 1;
        if v_session_id is null then
          raise;
        end if;
    end;

    update public.assigned_workouts
    set status = 'in_progress'
    where id = p_assigned_workout_id
      and client_id = v_uid
      and status = 'assigned';
  end if;

  insert into public.set_logs (
    workout_session_id,
    workout_exercise_id,
    set_number,
    reps,
    weight,
    notes,
    completed_at
  )
  values (
    v_session_id,
    p_workout_exercise_id,
    p_set_number,
    p_reps,
    p_weight,
    nullif(btrim(coalesce(p_notes, '')), ''),
    now()
  )
  on conflict (workout_session_id, workout_exercise_id, set_number)
  do update set
    reps = excluded.reps,
    weight = excluded.weight,
    notes = excluded.notes,
    completed_at = excluded.completed_at
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.save_workout_set(uuid, uuid, integer, integer, numeric, text) from public, anon;
grant execute on function public.save_workout_set(uuid, uuid, integer, integer, numeric, text) to authenticated;
