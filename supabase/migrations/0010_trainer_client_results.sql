-- ============================================================================
-- CoachFlow — trainer reads one active client's logged sets.
-- Additive. Does not change 0001–0009 or disable RLS.
-- A trainer can already select set_logs through RLS, but nested policies made
-- that read unreliable. This function checks an active relationship first.
-- ============================================================================

create or replace function public.list_client_workout_results(p_client_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.trainer_clients tc
    where tc.trainer_id = v_uid
      and tc.client_id = p_client_id
      and tc.status = 'active'
  ) then
    raise exception 'Client not found';
  end if;

  return coalesce((
    select jsonb_agg(rows.item order by rows.assigned_date desc)
    from (
      select
        aw.assigned_date,
        jsonb_build_object(
          'assignment_id', aw.id,
          'workout_name', coalesce(w.name, 'Workout'),
          'assignment_status', aw.status,
          'due_date', aw.due_date,
          'assigned_date', aw.assigned_date,
          'sessions', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'session_id', ws.id,
                'status', ws.status,
                'completed_at', ws.completed_at,
                'started_at', ws.started_at,
                'sets', coalesce((
                  select jsonb_agg(
                    jsonb_build_object(
                      'exercise_name', coalesce(e.name, 'Exercise'),
                      'set_number', sl.set_number,
                      'reps', sl.reps,
                      'weight', sl.weight,
                      'notes', sl.notes
                    )
                    order by we.order_index, sl.set_number
                  )
                  from public.set_logs sl
                  join public.workout_exercises we on we.id = sl.workout_exercise_id
                  left join public.exercises e on e.id = we.exercise_id
                  where sl.workout_session_id = ws.id
                ), '[]'::jsonb)
              )
              order by ws.started_at desc
            )
            from public.workout_sessions ws
            where ws.assigned_workout_id = aw.id
              and ws.client_id = p_client_id
          ), '[]'::jsonb)
        ) as item
      from public.assigned_workouts aw
      left join public.workouts w on w.id = aw.workout_id
      where aw.trainer_id = v_uid
        and aw.client_id = p_client_id
    ) rows
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.list_client_workout_results(uuid) from public, anon;
grant execute on function public.list_client_workout_results(uuid) to authenticated;
