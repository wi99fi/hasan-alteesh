ALTER TABLE public.clinic_settings ALTER COLUMN clinic_name SET DEFAULT 'Alteesh Clinic';

CREATE OR REPLACE FUNCTION public.claim_initial_super_admin(_full_name text)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  LOCK TABLE public.user_roles IN EXCLUSIVE MODE;
  IF EXISTS (SELECT 1 FROM public.user_roles) THEN RETURN false; END IF;
  INSERT INTO public.profiles (id, full_name) VALUES (auth.uid(), _full_name) ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'super_admin');
  INSERT INTO public.clinic_settings (clinic_name, updated_by) VALUES ('Alteesh Clinic', auth.uid());
  RETURN true;
END;
$function$;

-- Super admin protection
CREATE OR REPLACE FUNCTION public.protect_super_admin_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'super_admin' THEN RAISE EXCEPTION 'لا يمكن حذف أو تعديل حساب المدير العام'; END IF;
    IF auth.uid() IS NOT NULL AND OLD.user_id = auth.uid() THEN RAISE EXCEPTION 'لا يمكنك حذف حسابك الحالي'; END IF;
    RETURN OLD;
  END IF;
  IF OLD.role = 'super_admin' OR NEW.role = 'super_admin' THEN
    RAISE EXCEPTION 'لا يمكن حذف أو تعديل حساب المدير العام';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER protect_super_admin_role BEFORE UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.protect_super_admin_role();

CREATE OR REPLACE FUNCTION public.protect_super_admin_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF public.has_role(OLD.id, 'super_admin') THEN RAISE EXCEPTION 'لا يمكن حذف أو تعديل حساب المدير العام'; END IF;
    IF auth.uid() IS NOT NULL AND OLD.id = auth.uid() THEN RAISE EXCEPTION 'لا يمكنك حذف حسابك الحالي'; END IF;
    RETURN OLD;
  END IF;
  IF public.has_role(OLD.id, 'super_admin') AND auth.uid() IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'لا يمكن حذف أو تعديل حساب المدير العام';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER protect_super_admin_profile BEFORE UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_super_admin_profile();

-- Appointment overlap prevention
CREATE OR REPLACE FUNCTION public.prevent_appointment_overlap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.ends_at <= NEW.starts_at THEN RAISE EXCEPTION 'وقت انتهاء الموعد يجب أن يكون بعد بدايته'; END IF;
  IF NEW.status = 'cancelled' THEN RETURN NEW; END IF;
  IF NEW.chair_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.appointments a WHERE a.id <> NEW.id AND a.status <> 'cancelled'
      AND a.chair_id = NEW.chair_id AND a.starts_at < NEW.ends_at AND a.ends_at > NEW.starts_at) THEN
    RAISE EXCEPTION 'الكرسي محجوز في هذا الوقت';
  END IF;
  IF NEW.doctor_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.appointments a WHERE a.id <> NEW.id AND a.status <> 'cancelled'
      AND a.doctor_id = NEW.doctor_id AND a.starts_at < NEW.ends_at AND a.ends_at > NEW.starts_at) THEN
    RAISE EXCEPTION 'الطبيب لديه موعد آخر في هذا الوقت';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER prevent_appointment_overlap BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.prevent_appointment_overlap();

-- Helpers
CREATE OR REPLACE FUNCTION public.is_non_doctor_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('super_admin','admin','nurse','receptionist'))
$$;
CREATE OR REPLACE FUNCTION public.is_doctor_patient(_user_id uuid, _patient_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.appointments WHERE patient_id = _patient_id AND doctor_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.treatments WHERE patient_id = _patient_id AND doctor_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.patients WHERE id = _patient_id AND created_by = _user_id)
$$;
REVOKE EXECUTE ON FUNCTION public.is_non_doctor_staff(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_doctor_patient(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_non_doctor_staff(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_doctor_patient(uuid, uuid) TO authenticated, service_role;

-- Chair occupancy without patient data
CREATE OR REPLACE FUNCTION public.get_chair_occupancy(_from timestamptz, _to timestamptz)
RETURNS TABLE(chair_id uuid, doctor_id uuid, starts_at timestamptz, ends_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT a.chair_id, a.doctor_id, a.starts_at, a.ends_at FROM public.appointments a
  WHERE public.is_staff(auth.uid()) AND a.status <> 'cancelled' AND a.starts_at < _to AND a.ends_at > _from
$$;
REVOKE EXECUTE ON FUNCTION public.get_chair_occupancy(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_chair_occupancy(timestamptz, timestamptz) TO authenticated, service_role;

-- Appointments: doctors only own
DROP POLICY IF EXISTS "Staff manage appointments" ON public.appointments;
CREATE POLICY "Non-doctor staff manage appointments" ON public.appointments FOR ALL TO authenticated
  USING (public.is_non_doctor_staff(auth.uid()))
  WITH CHECK (public.is_non_doctor_staff(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Doctors read own appointments" ON public.appointments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'doctor') AND doctor_id = auth.uid());
CREATE POLICY "Doctors create own appointments" ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'doctor') AND doctor_id = auth.uid() AND created_by = auth.uid());
CREATE POLICY "Doctors update own appointments" ON public.appointments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'doctor') AND doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

-- Patients: doctors only their patients
DROP POLICY IF EXISTS "Staff manage patients" ON public.patients;
CREATE POLICY "Non-doctor staff manage patients" ON public.patients FOR ALL TO authenticated
  USING (public.is_non_doctor_staff(auth.uid()))
  WITH CHECK (public.is_non_doctor_staff(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Doctors read own patients" ON public.patients FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'doctor') AND public.is_doctor_patient(auth.uid(), id));
CREATE POLICY "Doctors create patients" ON public.patients FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'doctor') AND created_by = auth.uid());
CREATE POLICY "Doctors update own patients" ON public.patients FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'doctor') AND public.is_doctor_patient(auth.uid(), id))
  WITH CHECK (public.has_role(auth.uid(), 'doctor'));

-- Invoices & payments: doctors read their patients only
CREATE POLICY "Doctors read own patients invoices" ON public.invoices FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'doctor') AND public.is_doctor_patient(auth.uid(), patient_id));
CREATE POLICY "Doctors read own patients payments" ON public.payments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'doctor') AND EXISTS (
    SELECT 1 FROM public.invoices i WHERE i.id = payments.invoice_id AND public.is_doctor_patient(auth.uid(), i.patient_id)));

-- Treatments / prescriptions / dental chart: doctors only their patients
DROP POLICY IF EXISTS "Clinical staff manage treatments" ON public.treatments;
CREATE POLICY "Clinical staff manage treatments" ON public.treatments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'nurse') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR (public.has_role(auth.uid(),'doctor') AND (doctor_id = auth.uid() OR public.is_doctor_patient(auth.uid(), patient_id))))
  WITH CHECK ((doctor_id = auth.uid()) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
DROP POLICY IF EXISTS "Clinical staff manage prescriptions" ON public.prescriptions;
CREATE POLICY "Clinical staff manage prescriptions" ON public.prescriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'nurse') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR (public.has_role(auth.uid(),'doctor') AND public.is_doctor_patient(auth.uid(), patient_id)))
  WITH CHECK ((doctor_id = auth.uid()) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
DROP POLICY IF EXISTS "Clinical staff manage dental chart" ON public.dental_chart_entries;
CREATE POLICY "Clinical staff manage dental chart" ON public.dental_chart_entries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'nurse') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR (public.has_role(auth.uid(),'doctor') AND public.is_doctor_patient(auth.uid(), patient_id)))
  WITH CHECK (recorded_by = auth.uid());
