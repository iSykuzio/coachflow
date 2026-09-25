-- ============================================================================
-- CoachFlow — persist and reload client set logs.
-- Additive. Does not rewrite 0001–0008 or disable RLS.
--
-- save_workout_set from 0008 returns the set_logs row type. PostgREST treats
-- that as a composite and the workout page then reloads logs with a select
-- that ignores errors, so a failed read looks like Save did nothing.
-- This migration returns jsonb instead, and adds a read restricted to the
-- signed-in client's own assignment.
-- ============================================================================

drop function if exists public.save_workout_set(uuid, uuid, integer, integer, numeric, text);

create or replace function public.save_workout_set(
  p_assigned_workout_id uuid,
  p_workout_exercise_id uuid,
  p_set_number integer,
  p_reps integer,
  p_weight numeric,
  p_notes text
)
returns jsonb
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

  return jsonb_build_object(
    'id', v_row.id,
    'workout_session_id', v_row.workout_session_id,
    'workout_exercise_id', v_row.workout_exercise_id,
    'set_number', v_row.set_number,
    'reps', v_row.reps,
    'weight', v_row.weight,
    'notes', v_row.notes
  );
end;
$$;

create or replace function public.get_my_assignment_progress(p_assigned_workout_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_session_id uuid;
  v_status text;
  v_logs jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.assigned_workouts aw
    where aw.id = p_assigned_workout_id
      and aw.client_id = v_uid
  ) then
    raise exception 'Assignment not found';
  end if;

  select ws.id, ws.status
  into v_session_id, v_status
  from public.workout_sessions ws
  where ws.assigned_workout_id = p_assigned_workout_id
    and ws.client_id = v_uid
  order by case when ws.status = 'in_progress' then 0 else 1 end,
           ws.started_at desc
  limit 1;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'workout_exercise_id', sl.workout_exercise_id,
        'set_number', sl.set_number,
        'reps', sl.reps,
        'weight', sl.weight,
        'notes', sl.notes
      )
      order by sl.set_number
    ),
    '[]'::jsonb
  )
  into v_logs
  from public.set_logs sl
  where sl.workout_session_id = v_session_id;

  return jsonb_build_object(
    'session_id', v_session_id,
    'session_status', v_status,
    'logs', v_logs
  );
end;
$$;

create or replace function public.list_my_completed_sessions()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'session_id', ws.id,
        'assigned_workout_id', ws.assigned_workout_id,
        'completed_at', ws.completed_at,
        'workout_name', coalesce(w.name, 'Workout')
      )
      order by ws.completed_at desc nulls last
    ),
    '[]'::jsonb
  )
  from public.workout_sessions ws
  join public.assigned_workouts aw on aw.id = ws.assigned_workout_id
  left join public.workouts w on w.id = aw.workout_id
  where ws.client_id = auth.uid()
    and aw.client_id = auth.uid()
    and ws.status = 'completed';
$$;

revoke all on function public.save_workout_set(uuid, uuid, integer, integer, numeric, text) from public, anon;
grant execute on function public.save_workout_set(uuid, uuid, integer, integer, numeric, text) to authenticated;

revoke all on function public.get_my_assignment_progress(uuid) from public, anon;
grant execute on function public.get_my_assignment_progress(uuid) to authenticated;

revoke all on function public.list_my_completed_sessions() from public, anon;
grant execute on function public.list_my_completed_sessions() to authenticated;
