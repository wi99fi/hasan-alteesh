ALTER TABLE public.clinic_settings
  ADD COLUMN IF NOT EXISTS public_description text,
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS opening_hours text,
  ADD COLUMN IF NOT EXISTS public_services text,
  ADD COLUMN IF NOT EXISTS font_family text NOT NULL DEFAULT 'formal',
  ADD COLUMN IF NOT EXISTS interface_density text NOT NULL DEFAULT 'comfortable',
  ADD COLUMN IF NOT EXISTS card_style text NOT NULL DEFAULT 'editorial';

CREATE OR REPLACE FUNCTION public.get_public_clinic_settings()
RETURNS TABLE (
  clinic_name text,
  logo_url text,
  primary_color text,
  accent_color text,
  phone text,
  email text,
  address text,
  public_description text,
  hero_image_url text,
  opening_hours text,
  public_services text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.clinic_name, s.logo_url, s.primary_color, s.accent_color,
         s.phone, s.email, s.address, s.public_description, s.hero_image_url,
         s.opening_hours, s.public_services
  FROM public.clinic_settings s
  ORDER BY s.updated_at DESC
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_public_clinic_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_clinic_settings() TO anon, authenticated, service_role;