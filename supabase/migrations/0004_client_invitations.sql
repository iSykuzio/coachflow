-- ============================================================================
-- CoachFlow — Stage B: client invitations
-- Additive. Does not drop tables, disable RLS, or rewrite 0001–0003.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Only ACTIVE pairings grant related-row access.
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
    where tc.trainer_id = auth.uid()
      and tc.client_id = p_client_id
      and tc.status = 'active'
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
    where tc.client_id = auth.uid()
      and tc.trainer_id = p_trainer_id
      and tc.status = 'active'
  );
$$;

-- ----------------------------------------------------------------------------
-- 2) Database invariant: a client has at most one active trainer.
-- ----------------------------------------------------------------------------
create unique index trainer_clients_one_active_per_client_idx
  on public.trainer_clients (client_id)
  where status = 'active';

-- ----------------------------------------------------------------------------
-- 3) Pending invitations. No client_id until an auth user exists.
-- ----------------------------------------------------------------------------
create table if not exists public.client_invitations (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  email text not null,
  full_name text not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'cancelled')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_client_id uuid references public.clients(id) on delete set null
);

create index if not exists client_invitations_trainer_idx
  on public.client_invitations (trainer_id);

create index if not exists client_invitations_pending_email_idx
  on public.client_invitations (lower(email))
  where status = 'pending';

create unique index if not exists client_invitations_pending_trainer_email_idx
  on public.client_invitations (trainer_id, lower(email))
  where status = 'pending';

alter table public.client_invitations enable row level security;
drop policy if exists "client_invitations_select_own_trainer"
on public.client_invitations;
create policy "client_invitations_select_own_trainer"
  on public.client_invitations
  for select
  using (trainer_id = auth.uid());
drop policy if exists "client_invitations_update_cancel_own_pending"
on public.client_invitations;
create policy "client_invitations_update_cancel_own_pending"
  on public.client_invitations
  for update
  using (trainer_id = auth.uid() and status = 'pending')
  with check (
    trainer_id = auth.uid()
    and status = 'cancelled'
    and accepted_client_id is null
  );

-- ----------------------------------------------------------------------------
-- 4) Shared activation. Not granted to authenticated or anon.
-- ----------------------------------------------------------------------------
create or replace function public.activate_client_invitation(
  p_invitation_id uuid,
  p_client_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.client_invitations%rowtype;
  v_email text;
  v_role text;
begin
  select email, role into v_email, v_role
  from public.profiles
  where id = p_client_id;

  if v_role is distinct from 'client' then
    raise exception 'Only client accounts can accept invitations';
  end if;

  if v_email is null then
    raise exception 'Client email not found';
  end if;

  if not exists (select 1 from public.clients c where c.id = p_client_id) then
    raise exception 'Client record not found';
  end if;

  perform pg_advisory_xact_lock(88114004, hashtext(lower(v_email)));

  select * into r
  from public.client_invitations
  where id = p_invitation_id
  for update;

  if not found then
    raise exception 'Invitation not found';
  end if;

  if r.status = 'accepted' and r.accepted_client_id = p_client_id then
    return;
  end if;

  if r.status is distinct from 'pending' then
    raise exception 'This invitation is no longer pending';
  end if;

  if lower(r.email) is distinct from lower(v_email) then
    raise exception 'This invitation does not match your account email';
  end if;

  if exists (
    select 1 from public.trainer_clients tc
    where tc.client_id = p_client_id
      and tc.status = 'active'
      and tc.trainer_id <> r.trainer_id
  ) then
    raise exception 'You are already connected to a trainer';
  end if;

  begin
    insert into public.trainer_clients (trainer_id, client_id, status)
    values (r.trainer_id, p_client_id, 'active')
    on conflict (trainer_id, client_id)
    do update set status = 'active';
  exception
    when unique_violation then
      raise exception 'You are already connected to a trainer';
  end;

  update public.client_invitations
  set status = 'accepted',
      accepted_at = now(),
      accepted_client_id = p_client_id
  where id = r.id;

  update public.client_invitations
  set status = 'cancelled'
  where status = 'pending'
    and lower(email) = lower(r.email)
    and id <> r.id;
end;
$$;

revoke all on function public.activate_client_invitation(uuid, uuid) from public;

-- ----------------------------------------------------------------------------
-- 5) Trainer creates a pending invite. Never auto-connects.
-- ----------------------------------------------------------------------------
create or replace function public.invite_client(p_full_name text, p_email text)
returns public.client_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainer_id uuid := auth.uid();
  v_email text;
  v_name text;
  v_profile public.profiles%rowtype;
  v_invite public.client_invitations%rowtype;
begin
  if v_trainer_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (select 1 from public.trainers t where t.id = v_trainer_id) then
    raise exception 'Only trainers can invite clients';
  end if;

  v_name := trim(p_full_name);
  v_email := lower(trim(p_email));

  if v_name is null or char_length(v_name) < 2 then
    raise exception 'Enter the client''s full name';
  end if;

  if v_email is null or v_email !~ '^[^@]+@[^@]+\.[^@]+$' then
    raise exception 'Enter a valid email address';
  end if;

  perform pg_advisory_xact_lock(88114004, hashtext(v_email));

  select * into v_profile
  from public.profiles p
  where lower(p.email) = v_email
  limit 1;

  if found then
    if v_profile.role = 'trainer' then
      raise exception 'That email belongs to a trainer account';
    end if;

    if exists (
      select 1 from public.trainer_clients tc
      where tc.trainer_id = v_trainer_id
        and tc.client_id = v_profile.id
        and tc.status = 'active'
    ) then
      raise exception 'This person is already on your roster';
    end if;

    if exists (
      select 1 from public.trainer_clients tc
      where tc.client_id = v_profile.id
        and tc.status = 'active'
        and tc.trainer_id <> v_trainer_id
    ) then
      raise exception 'This client is already connected to another trainer';
    end if;
  end if;

  if exists (
    select 1 from public.client_invitations i
    where i.trainer_id = v_trainer_id
      and lower(i.email) = v_email
      and i.status = 'pending'
  ) then
    raise exception 'You already have a pending invitation for this email';
  end if;

  insert into public.client_invitations (trainer_id, email, full_name, status)
  values (v_trainer_id, v_email, v_name, 'pending')
  returning * into v_invite;

  return v_invite;
end;
$$;

revoke all on function public.invite_client(text, text) from public;
grant execute on function public.invite_client(text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 6) Auto-accept ONLY when exactly one pending invite matches.
-- ----------------------------------------------------------------------------
create or replace function public.accept_unambiguous_pending_invitation_for_user(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_role text;
  v_invite_id uuid;
  v_pending_count integer;
begin
  select email, role into v_email, v_role
  from public.profiles
  where id = p_user_id;

  if v_role is distinct from 'client' then
    return 0;
  end if;

  if v_email is null then
    return 0;
  end if;

  if exists (
    select 1 from public.trainer_clients tc
    where tc.client_id = p_user_id
      and tc.status = 'active'
  ) then
    return 0;
  end if;

  perform pg_advisory_xact_lock(88114004, hashtext(lower(v_email)));

  select count(*)::integer, min(i.id)
  into v_pending_count, v_invite_id
  from public.client_invitations i
  where i.status = 'pending'
    and lower(i.email) = lower(v_email);

  if v_pending_count is distinct from 1 then
    return 0;
  end if;

  begin
    perform public.activate_client_invitation(v_invite_id, p_user_id);
    return 1;
  exception
    when others then
      return 0;
  end;
end;
$$;

revoke all on function public.accept_unambiguous_pending_invitation_for_user(uuid) from public;

create or replace function public.accept_pending_invitations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return public.accept_unambiguous_pending_invitation_for_user(auth.uid());
end;
$$;

revoke all on function public.accept_pending_invitations() from public;
grant execute on function public.accept_pending_invitations() to authenticated;

-- ----------------------------------------------------------------------------
-- 7) Explicit choice when multiple trainers invited the same email.
-- ----------------------------------------------------------------------------
create or replace function public.accept_client_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  perform public.activate_client_invitation(p_invitation_id, auth.uid());
end;
$$;

revoke all on function public.accept_client_invitation(uuid) from public;
grant execute on function public.accept_client_invitation(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 8) Client lists pending invites for their own verified account email.
-- ----------------------------------------------------------------------------
create or replace function public.list_my_pending_invitations()
returns table (
  id uuid,
  trainer_id uuid,
  trainer_name text,
  created_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_email text;
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select p.email, p.role into v_email, v_role
  from public.profiles p
  where p.id = auth.uid();

  if v_role is distinct from 'client' then
    return;
  end if;

  if v_email is null then
    return;
  end if;

  if exists (
    select 1 from public.trainer_clients tc
    where tc.client_id = auth.uid()
      and tc.status = 'active'
  ) then
    return;
  end if;

  return query
  select
    i.id,
    i.trainer_id,
    coalesce(nullif(trim(tp.full_name), ''), 'Trainer'),
    i.created_at
  from public.client_invitations i
  left join public.profiles tp on tp.id = i.trainer_id
  where i.status = 'pending'
    and lower(i.email) = lower(v_email)
  order by i.created_at asc;
end;
$$;

revoke all on function public.list_my_pending_invitations() from public;
grant execute on function public.list_my_pending_invitations() to authenticated;

-- ----------------------------------------------------------------------------
-- 9) After existing signup provisioning, auto-accept only if unambiguous.
-- Replaces the function body only; trigger on auth.users is unchanged.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_full_name text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'client');
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));

  if v_role not in ('trainer', 'client') then
    v_role := 'client';
  end if;

  insert into public.profiles (id, role, full_name, email)
  values (new.id, v_role, v_full_name, new.email);

  if v_role = 'trainer' then
    insert into public.trainers (id) values (new.id);

    if new.email is not null then
      update public.client_invitations
      set status = 'cancelled'
      where status = 'pending'
        and lower(email) = lower(new.email);
    end if;
  else
    insert into public.clients (id) values (new.id);

    begin
      perform public.accept_unambiguous_pending_invitation_for_user(new.id);
    exception
      when others then
        null;
    end;
  end if;

  return new;
end;
$$;
