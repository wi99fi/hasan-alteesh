CREATE TYPE public.app_role AS ENUM ('super_admin','admin','doctor','nurse','receptionist');
CREATE TYPE public.appointment_status AS ENUM ('scheduled','confirmed','in_progress','completed','cancelled');
CREATE TYPE public.invoice_status AS ENUM ('draft','unpaid','partial','paid','cancelled');

CREATE TABLE public.branches (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, phone text, address text, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated; GRANT ALL ON public.branches TO service_role; ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (id uuid PRIMARY KEY, full_name text NOT NULL, phone text, avatar_url text, specialty text, branch_id uuid REFERENCES public.branches(id), is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated; GRANT ALL ON public.profiles TO service_role; ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, role public.app_role NOT NULL, UNIQUE(user_id, role));
GRANT SELECT ON public.user_roles TO authenticated; GRANT ALL ON public.user_roles TO service_role; ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id) $$;

CREATE POLICY "Staff read branches" ON public.branches FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage branches" ON public.branches FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Staff read profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR id = auth.uid());
CREATE POLICY "Users create own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Admins manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.patients (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), branch_id uuid REFERENCES public.branches(id), file_number text UNIQUE, full_name text NOT NULL, phone text, date_of_birth date, gender text, address text, allergies text, chronic_diseases text, surgeries text, medical_notes text, created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated; GRANT ALL ON public.patients TO service_role; ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage patients" ON public.patients FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()) AND created_by = auth.uid());

CREATE TABLE public.chairs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), branch_id uuid REFERENCES public.branches(id), name text NOT NULL, color text NOT NULL DEFAULT '#287f7b', is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chairs TO authenticated; GRANT ALL ON public.chairs TO service_role; ALTER TABLE public.chairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read chairs" ON public.chairs FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage chairs" ON public.chairs FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.appointments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE, doctor_id uuid, chair_id uuid REFERENCES public.chairs(id), starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, status public.appointment_status NOT NULL DEFAULT 'scheduled', reason text, notes text, created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated; GRANT ALL ON public.appointments TO service_role; ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage appointments" ON public.appointments FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()) AND created_by = auth.uid());

CREATE TABLE public.treatments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE, doctor_id uuid NOT NULL, title text NOT NULL, tooth_numbers text, diagnosis text, notes text, cost numeric(12,2) NOT NULL DEFAULT 0, treated_at date NOT NULL DEFAULT current_date, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatments TO authenticated; GRANT ALL ON public.treatments TO service_role; ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinical staff manage treatments" ON public.treatments FOR ALL TO authenticated USING (public.has_role(auth.uid(),'doctor') OR public.has_role(auth.uid(),'nurse') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) WITH CHECK (doctor_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.prescriptions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE, doctor_id uuid NOT NULL, medication text NOT NULL, dosage text, instructions text, prescribed_at date NOT NULL DEFAULT current_date, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescriptions TO authenticated; GRANT ALL ON public.prescriptions TO service_role; ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinical staff manage prescriptions" ON public.prescriptions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'doctor') OR public.has_role(auth.uid(),'nurse') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) WITH CHECK (doctor_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.dental_chart_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE, tooth_number integer NOT NULL CHECK (tooth_number BETWEEN 11 AND 85), condition text NOT NULL, treatment text, color text NOT NULL DEFAULT '#287f7b', recorded_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dental_chart_entries TO authenticated; GRANT ALL ON public.dental_chart_entries TO service_role; ALTER TABLE public.dental_chart_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinical staff manage dental chart" ON public.dental_chart_entries FOR ALL TO authenticated USING (public.has_role(auth.uid(),'doctor') OR public.has_role(auth.uid(),'nurse') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) WITH CHECK (recorded_by = auth.uid());

CREATE TABLE public.invoices (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), patient_id uuid NOT NULL REFERENCES public.patients(id), invoice_number text NOT NULL UNIQUE, status public.invoice_status NOT NULL DEFAULT 'unpaid', subtotal numeric(12,2) NOT NULL DEFAULT 0, discount numeric(12,2) NOT NULL DEFAULT 0, total numeric(12,2) NOT NULL DEFAULT 0, paid numeric(12,2) NOT NULL DEFAULT 0, issued_at date NOT NULL DEFAULT current_date, notes text, created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated; GRANT ALL ON public.invoices TO service_role; ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authorized staff manage invoices" ON public.invoices FOR ALL TO authenticated USING (public.has_role(auth.uid(),'receptionist') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) WITH CHECK (created_by = auth.uid());

CREATE TABLE public.invoice_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE, description text NOT NULL, quantity integer NOT NULL DEFAULT 1, unit_price numeric(12,2) NOT NULL DEFAULT 0, total numeric(12,2) NOT NULL DEFAULT 0);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated; GRANT ALL ON public.invoice_items TO service_role; ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authorized staff manage invoice items" ON public.invoice_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id)) WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id));

CREATE TABLE public.payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE, amount numeric(12,2) NOT NULL CHECK (amount > 0), method text NOT NULL DEFAULT 'cash', paid_at timestamptz NOT NULL DEFAULT now(), received_by uuid NOT NULL);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated; GRANT ALL ON public.payments TO service_role; ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authorized staff manage payments" ON public.payments FOR ALL TO authenticated USING (public.has_role(auth.uid(),'receptionist') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) WITH CHECK (received_by = auth.uid());

CREATE TABLE public.clinic_settings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), clinic_name text NOT NULL DEFAULT 'عيادة التيش', logo_url text, primary_color text NOT NULL DEFAULT '#287f7b', accent_color text NOT NULL DEFAULT '#d17a5c', phone text, email text, address text, updated_by uuid, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_settings TO authenticated; GRANT ALL ON public.clinic_settings TO service_role; ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read clinic settings" ON public.clinic_settings FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins manage clinic settings" ON public.clinic_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin'));

CREATE INDEX appointments_starts_at_idx ON public.appointments(starts_at); CREATE INDEX appointments_patient_idx ON public.appointments(patient_id); CREATE INDEX treatments_patient_idx ON public.treatments(patient_id); CREATE INDEX invoices_patient_idx ON public.invoices(patient_id);