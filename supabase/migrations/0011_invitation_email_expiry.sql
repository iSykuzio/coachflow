-- ============================================================================
-- CoachFlow — invitation expiry and safe resend.
-- Additive. Does not rewrite 0001–0010 or disable RLS.
-- Email delivery is Supabase Auth. This migration only stores the deadline.
-- ============================================================================

alter table public.client_invitations
  add column if not exists expires_at timestamptz;

update public.client_invitations
set expires_at = created_at + interval '14 days'
where expires_at is null;

alter table public.client_invitations
  alter column expires_at set default (now() + interval '14 days');

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

  if r.status = 'cancelled' then
    raise exception 'This invitation was revoked';
  end if;

  if r.status = 'accepted' then
    raise exception 'This invitation has already been accepted';
  end if;

  if r.status is distinct from 'pending' then
    raise exception 'This invitation is no longer pending';
  end if;

  if r.expires_at is not null and r.expires_at < now() then
    raise exception 'This invitation has expired';
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

revoke all on function public.activate_client_invitation(uuid, uuid) from public, anon;

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

  select * into v_invite
  from public.client_invitations i
  where i.trainer_id = v_trainer_id
    and lower(i.email) = v_email
    and i.status = 'pending'
  for update;

  if found then
    update public.client_invitations
    set full_name = v_name,
        expires_at = now() + interval '14 days'
    where id = v_invite.id
    returning * into v_invite;

    return v_invite;
  end if;

  insert into public.client_invitations (trainer_id, email, full_name, status, expires_at)
  values (v_trainer_id, v_email, v_name, 'pending', now() + interval '14 days')
  returning * into v_invite;

  return v_invite;
end;
$$;

revoke all on function public.invite_client(text, text) from public, anon;
grant execute on function public.invite_client(text, text) to authenticated;
