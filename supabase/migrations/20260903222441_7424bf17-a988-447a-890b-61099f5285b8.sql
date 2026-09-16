-- Restore execute rights for functions the app calls directly (each enforces its own auth checks internally)
GRANT EXECUTE ON FUNCTION public.submit_application(uuid, text, text, public.org_type, text, text, text, text, text, text[], text[], text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tier_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_tier_upgrade(public.membership_tier, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_resource_download(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_virtual_link(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_profiles(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_broadcast_notification(uuid[], text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_cop_chair(uuid, public.cop_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tier_meets(uuid, public.membership_tier) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_tier(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tier_rank(public.membership_tier) TO anon, authenticated;