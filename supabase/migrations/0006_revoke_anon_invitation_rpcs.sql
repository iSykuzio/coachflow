-- ============================================================================
-- CoachFlow — lock invitation RPCs against anon.
-- Additive. Does not change function bodies, tables, or RLS.
-- Internal helpers stay ungranted to authenticated and anon.
-- ============================================================================

revoke all on function public.activate_client_invitation(uuid, uuid) from public, anon;
revoke all on function public.accept_unambiguous_pending_invitation_for_user(uuid) from public, anon;

revoke all on function public.invite_client(text, text) from public, anon;
revoke all on function public.accept_pending_invitations() from public, anon;
revoke all on function public.accept_client_invitation(uuid) from public, anon;
revoke all on function public.list_my_pending_invitations() from public, anon;

grant execute on function public.invite_client(text, text) to authenticated;
grant execute on function public.accept_pending_invitations() to authenticated;
grant execute on function public.accept_client_invitation(uuid) to authenticated;
grant execute on function public.list_my_pending_invitations() to authenticated;
