-- ============================================================================
-- CoachFlow — Row Level Security
-- A trainer may only touch their own clients' data. A client may only touch
-- their own data plus what their own trainer has shared with them.
-- All helper functions are SECURITY DEFINER + STABLE so they can be reused
-- inside policies without re-triggering RLS recursively.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------------------
create or replace function public.is_trainer_of(p_client_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.trainer_clients tc
    where tc.trainer_id = auth.uid() and tc.client_id = p_client_id
  );
$$;

create or replace function public.is_client_of(p_trainer_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.trainer_clients tc
    where tc.client_id = auth.uid() and tc.trainer_id = p_trainer_id
  );
$$;

create or replace function public.owns_workout(p_workout_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.workouts w
    where w.id = p_workout_id and w.trainer_id = auth.uid()
  );
$$;

create or replace function public.workout_assigned_to_me(p_workout_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.assigned_workouts aw
    where aw.workout_id = p_workout_id and aw.client_id = auth.uid()
  );
$$;

-- Enable RLS everywhere
alter table public.profiles enable row level security;
alter table public.trainers enable row level security;
alter table public.clients enable row level security;
alter table public.trainer_clients enable row level security;
alter table public.exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.assigned_workouts enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.set_logs enable row level security;
alter table public.messages enable row level security;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_select_related" on public.profiles
  for select using (
    public.is_trainer_of(id) or public.is_client_of(id)
  );

create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- ----------------------------------------------------------------------------
-- trainers
-- ----------------------------------------------------------------------------
create policy "trainers_select_own" on public.trainers
  for select using (id = auth.uid());

create policy "trainers_select_by_own_client" on public.trainers
  for select using (public.is_client_of(id));

create policy "trainers_insert_own" on public.trainers
  for insert with check (id = auth.uid());

create policy "trainers_update_own" on public.trainers
  for update using (id = auth.uid());

-- ----------------------------------------------------------------------------
-- clients
-- ----------------------------------------------------------------------------
create policy "clients_select_own" on public.clients
  for select using (id = auth.uid());

create policy "clients_select_by_own_trainer" on public.clients
  for select using (public.is_trainer_of(id));

create policy "clients_insert_own" on public.clients
  for insert with check (id = auth.uid());

create policy "clients_update_own" on public.clients
  for update using (id = auth.uid());

-- Trainers create the client's row too, as part of the "add client" flow
-- (invited clients are provisioned server-side before the person signs in).
create policy "clients_insert_by_trainer" on public.clients
  for insert with check (
    exists (select 1 from public.trainers t where t.id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- trainer_clients
-- ----------------------------------------------------------------------------
create policy "trainer_clients_select_own" on public.trainer_clients
  for select using (trainer_id = auth.uid() or client_id = auth.uid());

create policy "trainer_clients_insert_by_trainer" on public.trainer_clients
  for insert with check (trainer_id = auth.uid());

create policy "trainer_clients_update_by_trainer" on public.trainer_clients
  for update using (trainer_id = auth.uid());

create policy "trainer_clients_delete_by_trainer" on public.trainer_clients
  for delete using (trainer_id = auth.uid());

-- ----------------------------------------------------------------------------
-- exercises: global library (trainer_id is null) is readable by everyone
-- signed in; trainers manage their own custom exercises; clients can see
-- their own trainer's custom exercises (needed to render assigned workouts).
-- ----------------------------------------------------------------------------
create policy "exercises_select_global" on public.exercises
  for select using (trainer_id is null);

create policy "exercises_select_own" on public.exercises
  for select using (trainer_id = auth.uid());

create policy "exercises_select_by_client" on public.exercises
  for select using (trainer_id is not null and public.is_client_of(trainer_id));

create policy "exercises_insert_own" on public.exercises
  for insert with check (trainer_id = auth.uid());

create policy "exercises_update_own" on public.exercises
  for update using (trainer_id = auth.uid());

create policy "exercises_delete_own" on public.exercises
  for delete using (trainer_id = auth.uid());

-- ----------------------------------------------------------------------------
-- workouts
-- ----------------------------------------------------------------------------
create policy "workouts_select_own" on public.workouts
  for select using (trainer_id = auth.uid());

create policy "workouts_select_if_assigned" on public.workouts
  for select using (public.workout_assigned_to_me(id));

create policy "workouts_insert_own" on public.workouts
  for insert with check (trainer_id = auth.uid());

create policy "workouts_update_own" on public.workouts
  for update using (trainer_id = auth.uid());

create policy "workouts_delete_own" on public.workouts
  for delete using (trainer_id = auth.uid());

-- ----------------------------------------------------------------------------
-- workout_exercises
-- ----------------------------------------------------------------------------
create policy "workout_exercises_select_own" on public.workout_exercises
  for select using (public.owns_workout(workout_id));

create policy "workout_exercises_select_if_assigned" on public.workout_exercises
  for select using (public.workout_assigned_to_me(workout_id));

create policy "workout_exercises_insert_own" on public.workout_exercises
  for insert with check (public.owns_workout(workout_id));

create policy "workout_exercises_update_own" on public.workout_exercises
  for update using (public.owns_workout(workout_id));

create policy "workout_exercises_delete_own" on public.workout_exercises
  for delete using (public.owns_workout(workout_id));

-- ----------------------------------------------------------------------------
-- assigned_workouts
-- ----------------------------------------------------------------------------
create policy "assigned_workouts_select_trainer" on public.assigned_workouts
  for select using (trainer_id = auth.uid());

create policy "assigned_workouts_select_client" on public.assigned_workouts
  for select using (client_id = auth.uid());

create policy "assigned_workouts_insert_trainer" on public.assigned_workouts
  for insert with check (trainer_id = auth.uid());

create policy "assigned_workouts_update_trainer" on public.assigned_workouts
  for update using (trainer_id = auth.uid());

-- Clients may update their own assignment (e.g. status as they progress).
create policy "assigned_workouts_update_client" on public.assigned_workouts
  for update using (client_id = auth.uid());

create policy "assigned_workouts_delete_trainer" on public.assigned_workouts
  for delete using (trainer_id = auth.uid());

-- ----------------------------------------------------------------------------
-- workout_sessions
-- ----------------------------------------------------------------------------
create policy "workout_sessions_select_own" on public.workout_sessions
  for select using (client_id = auth.uid());

create policy "workout_sessions_select_by_trainer" on public.workout_sessions
  for select using (
    exists (
      select 1 from public.assigned_workouts aw
      where aw.id = assigned_workout_id and aw.trainer_id = auth.uid()
    )
  );

create policy "workout_sessions_insert_own" on public.workout_sessions
  for insert with check (client_id = auth.uid());

create policy "workout_sessions_update_own" on public.workout_sessions
  for update using (client_id = auth.uid());

-- ----------------------------------------------------------------------------
-- set_logs
-- ----------------------------------------------------------------------------
create policy "set_logs_select_own" on public.set_logs
  for select using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = workout_session_id and ws.client_id = auth.uid()
    )
  );

create policy "set_logs_select_by_trainer" on public.set_logs
  for select using (
    exists (
      select 1 from public.workout_sessions ws
      join public.assigned_workouts aw on aw.id = ws.assigned_workout_id
      where ws.id = workout_session_id and aw.trainer_id = auth.uid()
    )
  );

create policy "set_logs_insert_own" on public.set_logs
  for insert with check (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = workout_session_id and ws.client_id = auth.uid()
    )
  );

create policy "set_logs_update_own" on public.set_logs
  for update using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = workout_session_id and ws.client_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- messages
-- ----------------------------------------------------------------------------
create policy "messages_select_participant" on public.messages
  for select using (trainer_id = auth.uid() or client_id = auth.uid());

create policy "messages_insert_participant" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and (trainer_id = auth.uid() or client_id = auth.uid())
  );

create policy "messages_update_participant" on public.messages
  for update using (trainer_id = auth.uid() or client_id = auth.uid());
