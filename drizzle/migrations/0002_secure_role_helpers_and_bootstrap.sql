REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.claim_initial_super_admin(_full_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  LOCK TABLE public.user_roles IN EXCLUSIVE MODE;
  IF EXISTS (SELECT 1 FROM public.user_roles) THEN RETURN false; END IF;
  INSERT INTO public.profiles (id, full_name) VALUES (auth.uid(), _full_name) ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'super_admin');
  INSERT INTO public.clinic_settings (clinic_name, updated_by) VALUES ('عيادة التيش', auth.uid());
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_initial_super_admin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_initial_super_admin(text) TO authenticated;