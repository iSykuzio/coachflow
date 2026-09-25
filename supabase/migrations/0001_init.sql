-- ============================================================================
-- CoachFlow — Stage 1 schema
-- Core identity, trainer/client relationships, exercise library, workout
-- programming, assignment, execution/logging, and messaging.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- profiles: 1:1 with auth.users. Holds the role that drives all routing & RLS.
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('trainer', 'client')),
  full_name text not null,
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);

-- ----------------------------------------------------------------------------
-- trainers / clients: thin role-specific extension tables keyed on profiles.id
-- ----------------------------------------------------------------------------
create table public.trainers (
  id uuid primary key references public.profiles(id) on delete cascade,
  business_name text,
  bio text,
  created_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key references public.profiles(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- trainer_clients: which trainer coaches which client. Source of truth for
-- almost every RLS policy below.
-- ----------------------------------------------------------------------------
create table public.trainer_clients (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'invited', 'archived')),
  created_at timestamptz not null default now(),
  unique (trainer_id, client_id)
);

create index trainer_clients_trainer_idx on public.trainer_clients(trainer_id);
create index trainer_clients_client_idx on public.trainer_clients(client_id);

-- ----------------------------------------------------------------------------
-- exercises: a shared global library (trainer_id null) plus each trainer's
-- own custom exercises.
-- ----------------------------------------------------------------------------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references public.trainers(id) on delete cascade,
  name text not null,
  category text,
  muscle_group text,
  equipment text,
  instructions text,
  is_custom boolean not null default false,
  created_at timestamptz not null default now()
);

create index exercises_trainer_idx on public.exercises(trainer_id);
create index exercises_name_idx on public.exercises using gin (to_tsvector('english', name));

-- ----------------------------------------------------------------------------
-- workouts: reusable templates a trainer builds, then assigns to clients.
-- ----------------------------------------------------------------------------
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workouts_trainer_idx on public.workouts(trainer_id);

-- ----------------------------------------------------------------------------
-- workout_exercises: exercises within a workout template, with prescription.
-- ----------------------------------------------------------------------------
create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  order_index int not null default 0,
  sets int not null check (sets > 0),
  reps text not null,               -- e.g. "8-12" or "AMRAP" — kept as text for flexibility
  weight text,                      -- e.g. "60kg", "bodyweight" — prescribed target, not a log
  rest_seconds int,
  notes text
);

create index workout_exercises_workout_idx on public.workout_exercises(workout_id);
create index workout_exercises_exercise_idx on public.workout_exercises(exercise_id);

-- ----------------------------------------------------------------------------
-- assigned_workouts: a workout template assigned to a specific client.
-- ----------------------------------------------------------------------------
create table public.assigned_workouts (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  assigned_date date not null default current_date,
  due_date date,
  status text not null default 'assigned' check (status in ('assigned', 'in_progress', 'completed', 'skipped')),
  created_at timestamptz not null default now()
);

create index assigned_workouts_client_idx on public.assigned_workouts(client_id);
create index assigned_workouts_trainer_idx on public.assigned_workouts(trainer_id);
create index assigned_workouts_status_idx on public.assigned_workouts(status);

-- ----------------------------------------------------------------------------
-- workout_sessions: one client's live/completed run-through of an assignment.
-- ----------------------------------------------------------------------------
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  assigned_workout_id uuid not null references public.assigned_workouts(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index workout_sessions_client_idx on public.workout_sessions(client_id);
create index workout_sessions_assigned_workout_idx on public.workout_sessions(assigned_workout_id);

-- ----------------------------------------------------------------------------
-- set_logs: the actual reps/weight the client logged for each set.
-- ----------------------------------------------------------------------------
create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null references public.workout_sessions(id) on delete cascade,
  workout_exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  set_number int not null,
  reps int,
  weight numeric(6,2),
  notes text,
  completed_at timestamptz
);

create index set_logs_session_idx on public.set_logs(workout_session_id);
create index set_logs_exercise_idx on public.set_logs(workout_exercise_id);

-- ----------------------------------------------------------------------------
-- messages: simple trainer <-> client threads, one thread per pairing.
-- ----------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) > 0),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_thread_idx on public.messages(trainer_id, client_id, created_at);

-- ----------------------------------------------------------------------------
-- updated_at trigger helper
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger workouts_set_updated_at
  before update on public.workouts
  for each row execute function public.set_updated_at();
