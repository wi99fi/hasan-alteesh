DROP POLICY "Anyone can view cases" ON public.clinic_cases;
CREATE POLICY "Staff can view cases" ON public.clinic_cases FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE OR REPLACE FUNCTION public.get_public_clinic_cases()
RETURNS TABLE(id uuid, title text, description text, before_url text, after_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.title, c.description, c.before_url, c.after_url
  FROM public.clinic_cases c ORDER BY c.sort_order ASC, c.created_at DESC LIMIT 12
$$;
REVOKE ALL ON FUNCTION public.get_public_clinic_cases() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_clinic_cases() TO anon, authenticated, service_role;