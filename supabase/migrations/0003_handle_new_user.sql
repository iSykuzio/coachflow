-- ============================================================================
-- CoachFlow — new user provisioning
-- On signup, the client passes { full_name, role } in auth signUp options.data.
-- This trigger reads that metadata and creates the matching profiles row plus
-- the role-specific trainers/clients row, atomically, bypassing RLS via
-- SECURITY DEFINER (the client itself has no INSERT policy on profiles for
-- other users, which is correct — only this trusted trigger does it).
-- ============================================================================

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
  else
    insert into public.clients (id) values (new.id);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
