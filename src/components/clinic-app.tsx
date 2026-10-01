import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Activity, CalendarDays, ChevronLeft, CircleDollarSign, FileText, HeartPulse, LayoutDashboard, LogOut, Menu, Palette, Plus, Search, Settings, ShieldAlert, Stethoscope, UserRound, MessageCircle, Download, Users, X, Eye, Pencil, Trash2, Inbox, Package, History, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureClinicProfile, createClinicUser, deleteClinicUser, updateClinicUser } from "@/lib/clinic.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DentalChart, whatsappLink } from "@/components/dental-chart";
import logo from "@/assets/alteesh-clinic-logo.png";

// الجداول الجديدة (الأسعار والنسب) غير موجودة بعد في ملف الأنواع المولّد تلقائياً
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

type Page = "dashboard" | "patients" | "appointments" | "clinical" | "invoices" | "reports" | "team" | "settings" | "inventory" | "bookings" | "activity";
type ClinicData = Awaited<ReturnType<typeof loadClinic>>;
type AnyRow = Record<string, any>;
type Role = "super_admin" | "admin" | "doctor" | "nurse" | "receptionist";

const nav = [
  ["dashboard", "/dashboard", "نظرة عامة", LayoutDashboard], ["appointments", "/appointments", "الجدول اليومي", CalendarDays],
  ["patients", "/patients", "المرضى", Users], ["clinical", "/clinical", "العلاجات والوصفات", Stethoscope],
  ["invoices", "/invoices", "الفواتير", FileText], ["reports", "/reports", "التقارير", Activity],
  ["team", "/team", "الفريق والكراسي", UserRound], ["settings", "/settings", "إعدادات العيادة", Settings],
  ["bookings", "/bookings", "طلبات الحجز", Inbox], ["inventory", "/inventory", "المخزون", Package], ["activity", "/activity", "سجل النشاط", History],
] as const;

const pageRoles: Record<Page, Role[]> = {
  dashboard: ["super_admin", "admin", "doctor", "nurse", "receptionist"],
  patients: ["super_admin", "admin", "doctor", "nurse", "receptionist"],
  appointments: ["super_admin", "admin", "doctor", "nurse", "receptionist"],
  clinical: ["super_admin", "admin", "doctor", "nurse"],
  invoices: ["super_admin", "admin", "receptionist", "doctor"], reports: ["super_admin", "admin"],
  team: ["super_admin", "admin"], settings: ["super_admin", "admin"],
  inventory: ["super_admin", "admin", "nurse", "doctor"], bookings: ["super_admin", "admin", "receptionist"], activity: ["super_admin", "admin"],
};

const titles: Record<Page, [string, string]> = {
  dashboard: ["نظرة عامة", "ملخص نشاط العيادة اليوم"], patients: ["المرضى", "الملفات والسجل الطبي"],
  appointments: ["الجدول اليومي", "تنظيم المواعيد والكراسي"], clinical: ["العلاجات والوصفات", "متابعة الرعاية السريرية"],
  invoices: ["الفواتير", "المدفوعات والأرصدة"], reports: ["التقارير", "مؤشرات الأداء المالي والتشغيلي"],
  team: ["الفريق والكراسي", "إدارة أعضاء الفريق ومساحات العمل"], settings: ["إعدادات العيادة", "الهوية وبيانات التواصل"],
  inventory: ["المخزون", "المواد والمستلزمات وحركتها"], bookings: ["طلبات الحجز", "طلبات المواعيد الواردة من الصفحة العامة"], activity: ["سجل النشاط", "من أضاف أو عدّل أو حذف، ومتى"],
};

const PAGE_SIZE = 1000;
/** يعيد بقية الصفحات إن كانت الصفحة الأولى ممتلئة (الخادم يقطع عند 1000 سجل افتراضياً) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function more<B extends PromiseLike<unknown>>(firstPage: B, make: () => any): Promise<Awaited<B>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const first = (await firstPage) as any;
  if (first.error || !Array.isArray(first.data) || first.data.length < PAGE_SIZE) return first as Awaited<B>;
  const all: unknown[] = [...first.data];
  for (let from = PAGE_SIZE; ; from += PAGE_SIZE) {
    const next = await make().range(from, from + PAGE_SIZE - 1);
    if (next.error) return { ...first, data: null, error: next.error } as Awaited<B>;
    all.push(...(next.data ?? []));
    if (!Array.isArray(next.data) || next.data.length < PAGE_SIZE) break;
  }
  return { ...first, data: all } as Awaited<B>;
}

async function loadClinic() {
  // كل استعلام مُعرَّف كدالة ليُعاد بناؤه لكل صفحة؛ ترتيب id الثانوي يثبّت الصفحات
  const qPatients = () => supabase.from("patients").select("*").eq("is_active", true).order("created_at", { ascending: false }).order("id");
  const qAppointments = () => supabase.from("appointments").select("*, patients(full_name), chairs(name)").order("starts_at").order("id");
  const qInvoices = () => supabase.from("invoices").select("*, patients(full_name)").order("created_at", { ascending: false }).order("id");
  const qTreatments = () => supabase.from("treatments").select("*, patients(full_name)").order("treated_at", { ascending: false }).order("id");
  const qPrescriptions = () => supabase.from("prescriptions").select("*, patients(full_name)").order("prescribed_at", { ascending: false }).order("id");
  const qDental = () => supabase.from("dental_chart_entries").select("*, patients(full_name)").order("created_at", { ascending: false }).order("id");
  const qPayments = () => supabase.from("payments").select("*").order("paid_at", { ascending: false }).order("id");
  const [patients, appointments, profiles, roles, chairs, invoices, settings, treatments, prescriptions, dentalChart, payments] = await Promise.all([
    more(qPatients().range(0, PAGE_SIZE - 1), qPatients),
    more(qAppointments().range(0, PAGE_SIZE - 1), qAppointments),
    supabase.from("profiles").select("*").order("full_name"), supabase.from("user_roles").select("*"),
    supabase.from("chairs").select("*").order("name"), more(qInvoices().range(0, PAGE_SIZE - 1), qInvoices),
    supabase.from("clinic_settings").select("*").limit(1).maybeSingle(), more(qTreatments().range(0, PAGE_SIZE - 1), qTreatments),
    more(qPrescriptions().range(0, PAGE_SIZE - 1), qPrescriptions),
    more(qDental().range(0, PAGE_SIZE - 1), qDental),
    more(qPayments().range(0, PAGE_SIZE - 1), qPayments),
  ]);
  // جداول التسعير والنسب: إن لم تُنفَّذ ملفات SQL بعد نُرجع قوائم فارغة بدل تعطيل التطبيق
  const [pricesRes, sharesRes, financeRes] = await Promise.all([
    sb.from("treatment_prices").select("*").order("name"),
    sb.from("doctor_shares").select("*"),
    sb.from("finance_settings").select("*").limit(1).maybeSingle(),
  ]);
  const error = [patients, appointments, profiles, roles, chairs, invoices, settings, treatments, prescriptions, dentalChart, payments].find((r) => r.error)?.error;
  if (error) throw error;
  return { patients: patients.data ?? [], appointments: appointments.data ?? [], profiles: profiles.data ?? [], roles: roles.data ?? [], chairs: chairs.data ?? [], invoices: invoices.data ?? [], settings: settings.data, treatments: treatments.data ?? [], prescriptions: prescriptions.data ?? [], dentalChart: dentalChart.data ?? [], payments: payments.data ?? [], prices: (pricesRes.data ?? []) as AnyRow[], doctorShares: (sharesRes.data ?? []) as AnyRow[], finance: (financeRes.data ?? null) as AnyRow | null };
}

const BRAND_THEME_CSS = `
:root[data-theme="brand"]{--radius:1rem;--background:#eef6fb;--foreground:#062a40;--card:#fff;--card-foreground:#062a40;--popover:#fff;--popover-foreground:#062a40;--primary:#0b4768;--primary-foreground:#fff;--secondary:#d9ecf6;--secondary-foreground:#0b4768;--muted:#e3f0f7;--muted-foreground:#35566b;--accent:#66adcd;--accent-foreground:#062a40;--border:#b9d6e6;--input:#0b4768;--ring:#66adcd}
:root[data-theme="brand"] .sidebar{background:#0b4768;border-inline-end:3px solid #66adcd}
:root[data-theme="brand"] .sidebar .brand strong,:root[data-theme="brand"] .sidebar .brand span,:root[data-theme="brand"] .sidebar .sidebar-note,:root[data-theme="brand"] .sidebar .sidebar-note *,:root[data-theme="brand"] .sidebar .sidebar-user strong,:root[data-theme="brand"] .sidebar .sidebar-user span{color:#d9ecf6}
:root[data-theme="brand"] .sidebar .logo-mark{background:#d9ecf6;border:2.5px solid #66adcd;border-radius:14px}
:root[data-theme="brand"] .sidebar .nav-link{color:#d9ecf6;border-radius:12px;font-weight:700}
:root[data-theme="brand"] .sidebar .nav-link:hover{background:rgba(255,255,255,.12);color:#fff}
:root[data-theme="brand"] .sidebar .nav-link-active,:root[data-theme="brand"] .sidebar .nav-link-active:hover{background:#66adcd;color:#062a40;font-weight:800}
:root[data-theme="brand"] .sidebar .nav-link-active::before{display:none}
:root[data-theme="brand"] .sidebar .sidebar-note{border:2px solid rgba(217,236,246,.4);border-radius:14px}
:root[data-theme="brand"] .topbar{background:#fff;border-bottom:3px solid #0b4768}
:root[data-theme="brand"] .panel,:root[data-theme="brand"] .stat-card,:root[data-theme="brand"] .team-card,:root[data-theme="brand"] .chair-tile,:root[data-theme="brand"] .quick-actions{border:2.5px solid #0b4768;border-radius:18px;box-shadow:4px 4px 0 #0b4768}
:root[data-theme="brand"] .page-heading h1,:root[data-theme="brand"] .panel h2,:root[data-theme="brand"] .section-title h2{color:#0b4768}
:root[data-theme="brand"] .eyebrow{color:#0b4768;font-weight:800}
:root[data-theme="brand"] .table-panel th{background:#d9ecf6;color:#0b4768}
:root[data-theme="brand"] .table-panel td,:root[data-theme="brand"] .table-panel th{border-bottom-color:#b9d6e6}
:root[data-theme="brand"] .table-panel tbody tr:hover{background:#eef6fb}
:root[data-theme="brand"] button[data-slot="button"]{border-radius:12px;font-weight:800}
:root[data-theme="brand"] .form-stack input,:root[data-theme="brand"] .form-stack textarea,:root[data-theme="brand"] .form-stack select{border:2px solid #0b4768;border-radius:10px;background:#fff}
:root[data-theme="brand"] .modal-card{border:2.5px solid #0b4768;border-radius:20px;box-shadow:6px 6px 0 #0b4768}
`;

export function ClinicApp({ page }: { page: Page }) {
  const navigate = useNavigate(); const qc = useQueryClient(); const ensure = useServerFn(ensureClinicProfile);
  const [open, setOpen] = useState(false); const [menu, setMenu] = useState(false); const [search, setSearch] = useState(""); const [userId,setUserId]=useState<string>(); const [bootstrapped,setBootstrapped]=useState(false);
  const [theme,setTheme]=useState<"classic"|"alt"|"premium"|"brand">("classic");
  function applyTheme(t:"classic"|"alt"|"premium"|"brand"){ if(t==="classic") delete document.documentElement.dataset["theme"]; else document.documentElement.dataset["theme"]=t; }
  useEffect(() => { const el = document.createElement("style"); el.id = "brand-theme-css"; el.textContent = BRAND_THEME_CSS; document.head.appendChild(el); return () => el.remove(); }, []);
  useEffect(()=>{ try{ const s=localStorage.getItem("clinic-theme"); if(s==="alt"||s==="premium"||s==="brand"){ setTheme(s); applyTheme(s); } }catch{ /* التخزين غير متاح */ } },[]);
  function switchTheme(){ const next=theme==="classic"?"alt":theme==="alt"?"premium":theme==="premium"?"brand":"classic"; setTheme(next); applyTheme(next); try{ localStorage.setItem("clinic-theme",next); }catch{ /* التخزين غير متاح */ } }
  const { data, isLoading, error } = useQuery({ queryKey: ["clinic"], queryFn: loadClinic, staleTime: 60_000 });
  useEffect(() => { supabase.auth.getUser().then(async ({ data: auth }) => { if (auth.user) { setUserId(auth.user.id); await ensure({ data: { fullName: String(auth.user.user_metadata?.["full_name"] ?? auth.user.email?.split("@")[0] ?? "مستخدم العيادة") } }); await qc.invalidateQueries({ queryKey: ["clinic"] }); } setBootstrapped(true); }); }, [ensure, qc]);
  const myRoles=(data?.roles.filter(r=>r.user_id===userId).map(r=>r.role)??[]) as Role[]; const allowed=pageRoles[page].some(role=>myRoles.includes(role));
  const me = data?.profiles.find((p) => p.id===userId);
  const settings = data?.settings; const title = titles[page];
  async function signOut() { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); await navigate({ to: "/auth", replace: true }); }
  return <div className="clinic-shell" dir="rtl" data-font={settings?.font_family ?? "formal"} data-density={settings?.interface_density ?? "comfortable"} style={{ "--primary": settings?.primary_color, "--accent": settings?.accent_color } as React.CSSProperties}>
    {menu && <button className="mobile-scrim" aria-label="إغلاق القائمة" onClick={() => setMenu(false)} />}
    <aside className={`sidebar ${menu ? "sidebar-open" : ""}`}>
      <div className="brand"><div className="logo-mark"><img src={settings?.logo_url ?? logo} alt="شعار Alteesh Clinic" /></div><div><strong>Alteesh Clinic</strong><span>نظام الإدارة الطبية</span></div><Button className="mobile-close" variant="ghost" size="icon" onClick={() => setMenu(false)}><X /></Button></div>
       <nav>{nav.filter(([id])=>pageRoles[id].some(role=>myRoles.includes(role))).map(([id, to, label, Icon]) => <Link key={id} to={to} className={`nav-link ${page === id ? "nav-link-active" : ""}`} onClick={() => setMenu(false)}><Icon /> <span>{label}</span></Link>)}</nav>
      <div className="sidebar-note"><div className="sidebar-note-title"><span />حسابك محمي بالصلاحيات</div><p>تظهر صفحات العيادة بحسب دورك، مع الحفاظ على سرية السجلات الطبية.</p></div>
      <div className="sidebar-user"><div className="avatar">{me?.full_name?.slice(0, 1) ?? "م"}</div><div><strong>{me?.full_name ?? "مستخدم العيادة"}</strong><span>حساب نشط</span></div><Button variant="ghost" size="icon" onClick={signOut} title="تسجيل الخروج"><LogOut /></Button></div>
    </aside>
    <main className="app-main">
      <header className="topbar"><Button className="menu-button" variant="ghost" size="icon" onClick={() => setMenu(true)}><Menu /></Button><div className="global-search"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث سريع..." /></div><span className="today">{new Intl.DateTimeFormat("ar-SY", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</span><Button type="button" variant="outline" size="sm" onClick={switchTheme} title="تبديل نمط الواجهة"><Palette /> {theme==="classic"?"النمط الثاني":theme==="alt"?"النمط الثالث":theme==="premium"?"نمط الشعار":"النمط الأول"}</Button><div className="topbar-user"><div className="topbar-identity"><strong>{me?.full_name ?? "مستخدم العيادة"}</strong><span>{myRoles[0] ? roleLabel(myRoles[0]) : ""}</span></div><div className="avatar avatar-coral">{me?.full_name?.slice(0, 1) ?? "م"}</div></div></header>
      <div className="page-wrap"><PageHeading title={title[0]} subtitle={title[1]} action={page === "dashboard" ? <Link to="/appointments" className="heading-action"><CalendarDays /> فتح جدول المواعيد</Link> : page !== "reports" && page !== "activity" && page !== "bookings" && !(page === "inventory" && !myRoles.some((r) => ["super_admin", "admin"].includes(r))) && !(page === "invoices" && !myRoles.some((r) => ["super_admin", "admin", "receptionist"].includes(r))) ? <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus /> إضافة جديد</Button></DialogTrigger><DialogContent dir="rtl" className="modal-card"><DialogHeader><DialogTitle>إضافة {title[0]}</DialogTitle></DialogHeader><CreateForm page={page} data={data ?? undefined} done={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["clinic"] }); qc.invalidateQueries({ queryKey: ["occupancy"] }); qc.invalidateQueries({ queryKey: ["inventory"] }); }} /></DialogContent></Dialog> : undefined} />
      {isLoading || !data || !bootstrapped ? <Loading /> : error ? <Empty title="تعذر تحميل البيانات" text="تحقق من اتصالك ثم أعد المحاولة." /> : !allowed ? <div className="panel empty-state"><ShieldAlert/><h3>ليس لديك صلاحية لهذه الصفحة</h3><p>تواصل مع مدير العيادة إذا كنت تحتاج إلى الوصول.</p></div> : <PageBody page={page} data={data} search={search} myRoles={myRoles} myId={userId} />}</div>
    </main>
  </div>;
}

function PageHeading({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) { return <div className="page-heading"><div><span className="eyebrow">ALTEESH CLINIC</span><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>; }
function Loading() { return <div className="panel loading"><span /><span /><span /></div>; }
function Empty({ title, text }: { title: string; text: string }) { return <div className="panel empty-state"><HeartPulse /><h3>{title}</h3><p>{text}</p></div>; }
function money(n: number | string) { return `${Number(n).toLocaleString("ar-SY")} ل.س`; }

function PageBody({ page, data, search, myRoles, myId }: { page: Page; data: Awaited<ReturnType<typeof loadClinic>>; search: string; myRoles: Role[]; myId?: string | undefined }) {
  if (page === "dashboard") return <Dashboard data={data} myRoles={myRoles} />;
  if (page === "patients") return <Patients data={data} search={search} myRoles={myRoles} />;
  if (page === "appointments") return <Appointments data={data} myRoles={myRoles} myId={myId} />;
  if (page === "clinical") return <Clinical data={data} />;
  if (page === "invoices") return <Invoices data={data} myRoles={myRoles} />;
  if (page === "reports") return <Reports data={data} />;
  if (page === "team") return <Team data={data} myId={myId} />;
  if (page === "inventory") return <Inventory data={data} myRoles={myRoles} />;
  if (page === "bookings") return <BookingRequests data={data} myId={myId} myRoles={myRoles} />;
  if (page === "activity") return <ActivityLog data={data} />;
  return <SettingsPage data={data} />;
}

function Dashboard({ data, myRoles }: { data: Awaited<ReturnType<typeof loadClinic>>; myRoles: Role[] }) {
  const now = new Date(); const today = now.toDateString(); const todays = data.appointments.filter((a) => new Date(a.starts_at).toDateString() === today && a.status !== "cancelled");
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const newPatients = data.patients.filter((p) => Date.now() - new Date(p.created_at).getTime() <= 7 * 86400000).length;
  const paid = data.payments.filter((p) => String(p.paid_at).startsWith(month)).reduce((sum, p) => sum + Number(p.amount), 0);
  const due = data.invoices.reduce((sum, invoice) => sum + Math.max(0, Number(invoice.total) - Number(invoice.paid)), 0);
  return <><section className="stat-grid"><Stat icon={<CalendarDays />} label="مواعيد اليوم" value={todays.length} note="باستثناء المواعيد الملغاة" /><Stat icon={<Users />} label="مرضى جدد" value={newPatients} note="خلال الأيام السبعة الماضية" /><Stat icon={<CircleDollarSign />} label="إيرادات الشهر" value={money(paid)} note="دفعات مسجلة هذا الشهر" /><Stat icon={<FileText />} label="مبالغ غير مسددة" value={money(due)} note="على الفواتير الحالية" /></section><section className="dashboard-grid"><div className="panel"><SectionTitle title="جدول اليوم" link="/appointments" />{todays.length ? todays.slice(0,5).map((a) => <AppointmentRow key={a.id} row={a} />) : <Empty title="لا توجد مواعيد اليوم" text="يمكنك إضافة أول موعد من صفحة الجدول اليومي." />}</div><div className="panel"><SectionTitle title="آخر المرضى" link="/patients" />{data.patients.length ? data.patients.slice(0,5).map((p) => <div className="list-row" key={p.id}><div className="avatar avatar-coral">{p.full_name.slice(0,1)}</div><div><strong>{p.full_name}</strong><span>{p.phone ?? "لا يوجد رقم هاتف"}</span></div><ChevronLeft /></div>) : <Empty title="لا يوجد مرضى بعد" text="أضف أول ملف من صفحة المرضى." />}</div></section><section className="quick-actions"><div><strong>إجراءات سريعة</strong><span>اختصارات للمهام اليومية</span></div><div className="quick-action-list"><Link to="/patients" className="quick-action"><Plus /> مريض جديد</Link><Link to="/appointments" className="quick-action"><CalendarDays /> حجز موعد</Link>{pageRoles.invoices.some((role) => myRoles.includes(role)) && <Link to="/invoices" className="quick-action"><FileText /> فاتورة أو دفعة</Link>}</div></section></>;
}
function Stat({ icon, label, value, note }: { icon: ReactNode; label: string; value: ReactNode; note: string }) { return <div className="stat-card"><div className="stat-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>; }
function SectionTitle({ title, link }: { title: string; link: string }) { return <div className="section-title"><h2>{title}</h2><Link to={link as "/patients"}>عرض الكل <ChevronLeft /></Link></div>; }
function AppointmentRow({ row }: { row: AnyRow }) { return <div className="appointment-row"><time>{new Date(row["starts_at"]).toLocaleTimeString("ar-SY", { hour: "2-digit", minute: "2-digit" })}</time><div><strong>{row["patients"]?.full_name ?? "مريض"}</strong><span>{row["reason"] ?? "زيارة عيادة"}</span></div><span className={`status status-${row["status"]}`}>{statusLabel(row["status"])}</span></div>; }
function statusLabel(s: string) { return ({ scheduled: "مجدول", confirmed: "مؤكد", in_progress: "قيد العلاج", completed: "مكتمل", cancelled: "ملغي", unpaid: "غير مدفوعة", partial: "جزئية", paid: "مدفوعة", draft: "مسودة" } as Record<string,string>)[s] ?? s; }

function Patients({ data, search, myRoles }: { data: Awaited<ReturnType<typeof loadClinic>>; search: string; myRoles: Role[] }) {
  const qc = useQueryClient();
  const [dental, setDental] = useState<(typeof data.patients)[number] | null>(null);
  const [view, setView] = useState<(typeof data.patients)[number] | null>(null);
  const [edit, setEdit] = useState<(typeof data.patients)[number] | null>(null);
  const clinical = myRoles.some((role) => pageRoles.clinical.includes(role));
  const clinic = "Alteesh Clinic";
  const rows = data.patients.filter((patient) => patient.full_name.includes(search) || patient.phone?.includes(search) || patient.file_number?.includes(search));

  async function archive(id: string) {
    const { error } = await supabase.from("patients").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id);
    if (!error) await qc.invalidateQueries({ queryKey: ["clinic"] });
  }

  return <>
    <section className="panel table-panel">
      <div className="panel-heading"><div><h2>سجل المرضى</h2><p>{rows.length} ملفاً مطابقاً للبحث</p></div></div>
      {rows.length ? <table><thead><tr><th>المريض</th><th>الهاتف</th><th>آخر زيارة</th><th>الرصيد</th><th>ملاحظات طبية</th><th>إجراءات</th></tr></thead><tbody>
        {rows.map((patient) => {
          const wa = whatsappLink(patient.phone, `مرحباً ${patient.full_name}، معك ${clinic}.`);
          const lastVisit = data.appointments.filter((appointment) => appointment.patient_id === patient.id && appointment.status === "completed").sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())[0];
          const balance = data.invoices.filter((invoice) => invoice.patient_id === patient.id).reduce((sum, invoice) => sum + Math.max(0, Number(invoice.total) - Number(invoice.paid)), 0);
          return <tr key={patient.id}>
            <td><div className="person"><div className="avatar">{patient.full_name.slice(0, 1)}</div><div className="patient-row-copy"><strong>{patient.full_name}</strong><span>ملف {patient.file_number ?? "—"}</span></div></div></td>
            <td>{patient.phone ?? "—"}</td>
            <td>{lastVisit ? new Date(lastVisit.starts_at).toLocaleDateString("ar-SY") : "لا توجد زيارة مكتملة"}</td>
            <td><span className={balance > 0 ? "patient-balance" : "patient-settled"}>{balance > 0 ? money(balance) : "مسدد"}</span></td>
            <td>{patient.allergies || patient.chronic_diseases || "لا يوجد"}</td>
            <td><div className="row-actions"><Button size="icon" variant="ghost" title="عرض الملف" onClick={() => setView(patient)}><Eye /></Button><Button size="icon" variant="ghost" title="تعديل الملف" onClick={() => setEdit(patient)}><Pencil /></Button>{clinical && <Button size="sm" variant="outline" onClick={() => setDental(patient)}>الأسنان</Button>}{wa && <Button size="icon" variant="ghost" title="واتساب" asChild><a href={wa} target="_blank" rel="noreferrer"><MessageCircle /></a></Button>}<ConfirmDelete title="حذف ملف المريض" text="سيُخفى الملف من القائمة مع الاحتفاظ بسجله الطبي للسلامة." onConfirm={() => archive(patient.id)} /></div></td>
          </tr>;
        })}
      </tbody></table> : <Empty title="لا يوجد مرضى بعد" text="أضف أول ملف مريض للبدء." />}
    </section>
    <Dialog open={!!view} onOpenChange={(open) => !open && setView(null)}><DialogContent dir="rtl" className="modal-card modal-wide" style={{ width: "min(880px, calc(100vw - 12px))", maxHeight: "94dvh", overflowY: "auto", padding: 14 }}><DialogHeader><DialogTitle>الملف الطبي</DialogTitle></DialogHeader>{view && <PatientProfile patient={view} data={data} canFiles={clinical} isAdmin={myRoles.some((role) => ["super_admin", "admin"].includes(role))} />}</DialogContent></Dialog>
    <Dialog open={!!edit} onOpenChange={(open) => !open && setEdit(null)}><DialogContent dir="rtl" className="modal-card"><DialogHeader><DialogTitle>تعديل ملف {edit?.full_name}</DialogTitle></DialogHeader>{edit && <PatientEditForm patient={edit} done={() => { setEdit(null); qc.invalidateQueries({ queryKey: ["clinic"] }); }} />}</DialogContent></Dialog>
    <Dialog open={!!dental} onOpenChange={(open) => !open && setDental(null)}><DialogContent dir="rtl" className="modal-card modal-wide"><DialogHeader><DialogTitle>مخطط أسنان {dental?.full_name}</DialogTitle></DialogHeader>{dental && <DentalChart patient={dental} entries={data.dentalChart} canEdit={clinical} />}</DialogContent></Dialog>
  </>;
}

type PatientTab = "treatments" | "prescriptions" | "invoices" | "teeth" | "files";
const methodLabel = (m: string) => ({ cash: "نقداً", card: "بطاقة", transfer: "تحويل" } as Record<string, string>)[m] ?? m;
const fmtDay = (v?: string | null) => (v ? new Date(v).toLocaleDateString("ar-SY") : "—");

const muted = { color: "var(--muted-foreground)" } as React.CSSProperties;
function RecCard({ children }: { children: ReactNode }) {
  return <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 12, background: "var(--card)", display: "grid", gap: 6 }}>{children}</div>;
}
function Chip({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "danger" | "warn" | "ok" }) {
  const tones = { muted: ["var(--secondary)", "var(--foreground)"], danger: ["#f9e7e5", "#a14d45"], warn: ["#fdf0d8", "#8a5a12"], ok: ["#e3f3ee", "#1f6b57"] } as const;
  const [bg, fg] = tones[tone];
  return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, background: bg, color: fg, fontSize: 12, fontWeight: 700 }}>{children}</span>;
}

function PatientProfile({ patient, data, canFiles = false, isAdmin = false }: { patient: AnyRow; data: Awaited<ReturnType<typeof loadClinic>>; canFiles?: boolean; isAdmin?: boolean }) {
  const [tab, setTab] = useState<PatientTab>("treatments");
  const [toothFilter, setToothFilter] = useState("");
  const pid = patient["id"];
  const docName = (id?: string | null) => data.profiles.find((p) => p.id === id)?.full_name ?? "—";
  const treatments = data.treatments.filter((t) => t.patient_id === pid);
  const prescriptions = data.prescriptions.filter((p) => p.patient_id === pid);
  const invoices = data.invoices.filter((i) => i.patient_id === pid);
  const chart = data.dentalChart.filter((d) => d.patient_id === pid);
  const visits = data.appointments.filter((a) => a.patient_id === pid && a.status !== "cancelled");
  const now = Date.now();
  const nextVisit = visits.filter((a) => new Date(a.starts_at).getTime() >= now).sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0];
  const pastDates = [...treatments.map((t) => new Date(t.treated_at).getTime()), ...visits.filter((a) => new Date(a.starts_at).getTime() < now).map((a) => new Date(a.starts_at).getTime())].filter((n) => Number.isFinite(n));
  const lastVisit = pastDates.length ? Math.max(...pastDates) : null;
  const billed = invoices.filter((i) => i.status !== "cancelled").reduce((s, i) => s + Number(i.total), 0);
  const paid = invoices.filter((i) => i.status !== "cancelled").reduce((s, i) => s + Number(i.paid), 0);
  const remaining = Math.max(0, billed - paid);
  const latestByTooth = new Map<number, AnyRow>();
  chart.forEach((d) => { if (!latestByTooth.has(d.tooth_number)) latestByTooth.set(d.tooth_number, d); });
  const teeth = [...latestByTooth.values()].sort((a, b) => a['tooth_number'] - b['tooth_number']);
  const shownTreatments = toothFilter.trim() ? treatments.filter((t) => String(t.tooth_numbers ?? "").includes(toothFilter.trim())) : treatments;
  const age = patient["date_of_birth"] ? Math.floor((now - new Date(patient["date_of_birth"]).getTime()) / 31557600000) : null;
  const phone = String(patient["phone"] ?? "");
  const wa = whatsappLink(phone, `مرحباً ${patient["full_name"]}، معك Alteesh Clinic.`);
  const extra: [string, string][] = ([["تاريخ الميلاد", patient["date_of_birth"]], ["العمليات السابقة", patient["surgeries"]], ["ملاحظات طبية", patient["medical_notes"]]] as [string, string][]).filter(([, v]) => v);
  const tabs: [PatientTab, string, number][] = [["treatments", "العلاجات", treatments.length], ["teeth", "الأسنان", teeth.length], ["prescriptions", "الوصفات", prescriptions.length], ["invoices", "الفواتير", invoices.length], ...(canFiles ? [["files", "الملفات", -1] as [PatientTab, string, number]] : [])];
  const tile = (label: string, value: ReactNode, color?: string) => <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "10px 6px", textAlign: "center", background: "var(--card)" }}><div style={{ fontSize: 11, ...muted }}>{label}</div><div style={{ fontWeight: 800, fontSize: 14, marginTop: 4, color }}>{value}</div></div>;
  const gap = { display: "grid", gap: 10 } as React.CSSProperties;
  return <div style={{ display: "grid", gap: 14 }}>
    {/* الترويسة */}
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div className="avatar avatar-lg" style={{ flex: "none" }}>{String(patient["full_name"]).slice(0, 1)}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.3 }}>{patient["full_name"]}</div>
        <div style={{ fontSize: 13, ...muted }}>ملف {patient["file_number"] || "—"}{age !== null && age >= 0 ? ` · ${age} سنة` : ""}</div>
      </div>
    </div>
    {phone && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Button size="sm" variant="outline" asChild><a href={`tel:${phone}`}><Phone /> <span dir="ltr">{phone}</span></a></Button>
      {wa && <Button size="sm" variant="outline" asChild><a href={wa} target="_blank" rel="noreferrer"><MessageCircle /> واتساب</a></Button>}
    </div>}
    {/* تحذيرات طبية */}
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      {patient["allergies"] && <Chip tone="danger">حساسية: {patient["allergies"]}</Chip>}
      {patient["chronic_diseases"] && <Chip tone="warn">مرض مزمن: {patient["chronic_diseases"]}</Chip>}
      {!patient["allergies"] && !patient["chronic_diseases"] && <small style={muted}>لم تُسجَّل حساسية أو أمراض مزمنة.</small>}
    </div>
    {/* ملخص */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
      {tile("المتبقي", remaining > 0 ? money(remaining) : "مسدد", remaining > 0 ? "#a14d45" : "#1f6b57")}
      {tile("آخر زيارة", lastVisit ? fmtDay(new Date(lastVisit).toISOString()) : "—")}
      {tile("الموعد القادم", nextVisit ? new Date(nextVisit.starts_at).toLocaleDateString("ar-SY", { day: "numeric", month: "short" }) + " · " + new Date(nextVisit.starts_at).toLocaleTimeString("ar-SY", { hour: "2-digit", minute: "2-digit" }) : "—")}
    </div>
    {extra.length > 0 && <details style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "8px 12px", background: "var(--card)" }}>
      <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 13 }}>بيانات إضافية ({extra.length})</summary>
      <div style={{ display: "grid", gap: 8, marginTop: 8 }}>{extra.map(([k, v]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}><span style={muted}>{k}</span><strong style={{ textAlign: "left" }}>{v}</strong></div>)}</div>
    </details>}
    {/* التبويبات */}
    <div role="tablist" style={{ display: "flex", flexWrap: "nowrap", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
      {tabs.map(([id, label, count]) => <button key={id} type="button" role="tab" data-state={tab === id ? "active" : "inactive"} onClick={() => setTab(id)} style={{ flex: "none", whiteSpace: "nowrap", padding: "8px 14px", borderRadius: 999 }}>{label}{count > 0 ? ` (${count})` : ""}</button>)}
    </div>
    {/* المحتوى */}
    {tab === "treatments" && <div style={gap}>
      {treatments.length > 4 && <Input value={toothFilter} onChange={(e) => setToothFilter(e.target.value)} placeholder="تصفية برقم السن، مثال: 16" style={{ maxWidth: 240 }} />}
      {shownTreatments.length ? <>
        {shownTreatments.map((t) => <RecCard key={t.id}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong>{t.title}</strong><b style={{ whiteSpace: "nowrap" }}>{money(t.cost)}</b></div>
          {t.diagnosis && <div style={{ fontSize: 12, ...muted }}>{t.diagnosis}</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 12, ...muted }}>{t.tooth_numbers && <Chip>سن {t.tooth_numbers}</Chip>}<span>{fmtDay(t.treated_at)}</span><span>· {docName(t.doctor_id)}</span></div>
        </RecCard>)}
        <div style={{ fontWeight: 800, textAlign: "left" }}>مجموع العلاجات: {money(shownTreatments.reduce((s, t) => s + Number(t.cost), 0))}</div>
      </> : <Empty title="لا توجد علاجات" text={toothFilter ? "لا نتائج لهذا السن." : "لم تُسجَّل علاجات لهذا المريض بعد."} />}
    </div>}
    {tab === "teeth" && (teeth.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
      {teeth.map((d) => <RecCard key={d['id']}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="avatar" style={{ flex: "none" }}>{d['tooth_number']}</span><div style={{ minWidth: 0 }}><strong style={{ display: "block" }}>{d['condition']}</strong><small style={muted}>{d['treatment'] || "دون إجراء"}</small></div></div><small style={muted}>{fmtDay(d['created_at'])}</small></RecCard>)}
    </div> : <Empty title="لا توجد سجلات أسنان" text="سجّل حالة الأسنان من زر «الأسنان» في قائمة المرضى." />)}
    {tab === "prescriptions" && (prescriptions.length ? <div style={gap}>
      {prescriptions.map((p) => <RecCard key={p.id}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong>{p.medication}</strong><small style={muted}>{fmtDay(p.prescribed_at)}</small></div>{p.dosage && <div style={{ fontSize: 13 }}>{p.dosage}</div>}{p.instructions && <div style={{ fontSize: 12, ...muted }}>{p.instructions}</div>}<small style={muted}>{docName(p.doctor_id)}</small></RecCard>)}
    </div> : <Empty title="لا توجد وصفات" text="لم تُكتب وصفات لهذا المريض بعد." />)}
    {tab === "invoices" && (invoices.length ? <div style={gap}>
      {invoices.map((i: AnyRow) => { const pays = data.payments.filter((py) => py.invoice_id === i['id']); const rest = Math.max(0, Number(i['total']) - Number(i['paid'])); return <RecCard key={i['id']}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><strong>{i['invoice_number']}</strong><span className={`status status-${i['status']}`}>{statusLabel(i['status'])}</span></div>
        <small style={muted}>{fmtDay(i['issued_at'])}{i['doctor_id'] ? ` · ${docName(i['doctor_id'])}` : ""}</small>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, textAlign: "center", fontSize: 12 }}>
          <div><div style={muted}>الإجمالي</div><b>{money(i['total'])}</b></div><div><div style={muted}>المدفوع</div><b>{money(i['paid'])}</b></div><div><div style={muted}>المتبقي</div><b style={{ color: rest > 0 && i['status'] !== "cancelled" ? "#a14d45" : "#1f6b57" }}>{rest > 0 && i['status'] !== "cancelled" ? money(rest) : "مسدد"}</b></div>
        </div>
        {Number(i['discount']) > 0 && <div><Chip tone="ok">حسم {money(i['discount'])}</Chip></div>}
        {pays.length > 0 && <details><summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 700 }}>الدفعات ({pays.length})</summary><div style={{ display: "grid", gap: 6, marginTop: 6 }}>{pays.map((py) => <div key={py.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span>{money(py.amount)} · {methodLabel(py.method)}</span><span style={muted}>{new Date(py.paid_at).toLocaleDateString("ar-SY")}</span></div>)}</div></details>}
      </RecCard>; })}
    </div> : <Empty title="لا توجد فواتير" text="لا فواتير مسجلة لهذا المريض، أو أن دورك لا يتيح رؤيتها." />)}
    {tab === "files" && canFiles && <PatientFiles patientId={pid} isAdmin={isAdmin} />}
  </div>;
}
function Detail({label,value}:{label:string;value?:string|null}){return <div className="detail-item"><span>{label}</span><strong>{value||"غير مسجل"}</strong></div>}
function PatientEditForm({patient,done}:{patient:AnyRow;done:()=>void}){const [message,setMessage]=useState("");async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const {error}=await supabase.from("patients").update({full_name:String(f.get("fullName")).trim(),file_number:String(f.get("fileNumber"))||null,phone:String(f.get("phone"))||null,date_of_birth:String(f.get("birth"))||null,allergies:String(f.get("allergies"))||null,chronic_diseases:String(f.get("chronic"))||null,surgeries:String(f.get("surgeries"))||null,medical_notes:String(f.get("notes"))||null,updated_at:new Date().toISOString()}).eq("id",patient["id"]);if(error){setMessage(error.message);return}done()}return <form className="form-stack" onSubmit={submit}><label>اسم المريض<Input name="fullName" required maxLength={120} defaultValue={patient["full_name"]}/></label><div className="form-grid"><label>رقم الملف<Input name="fileNumber" maxLength={50} defaultValue={patient["file_number"]||""}/></label><label>الهاتف<Input name="phone" maxLength={30} defaultValue={patient["phone"]||""}/></label></div><label>تاريخ الميلاد<Input name="birth" type="date" defaultValue={patient["date_of_birth"]||""}/></label><label>الحساسية<Textarea name="allergies" maxLength={1000} defaultValue={patient["allergies"]||""}/></label><label>الأمراض المزمنة<Textarea name="chronic" maxLength={1000} defaultValue={patient["chronic_diseases"]||""}/></label><label>العمليات السابقة<Textarea name="surgeries" maxLength={1000} defaultValue={patient["surgeries"]||""}/></label><label>ملاحظات طبية<Textarea name="notes" maxLength={2000} defaultValue={patient["medical_notes"]||""}/></label>{message&&<div className="form-message">{message}</div>}<Button size="lg">حفظ التعديلات</Button></form>}
function ConfirmDelete({title,text,onConfirm}:{title:string;text:string;onConfirm:()=>void|Promise<void>}){return <AlertDialog><AlertDialogTrigger asChild><Button size="icon" variant="ghost" title={title}><Trash2/></Button></AlertDialogTrigger><AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{text}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={onConfirm}>تأكيد الحذف</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
function Appointments({ data, myRoles, myId }: { data: Awaited<ReturnType<typeof loadClinic>>; myRoles: Role[]; myId?: string | undefined }) {
  const clinic="Alteesh Clinic";
  const [day,setDay]=useState(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;});
  const START=8, END=20, ROW=64;
  const from=new Date(`${day}T00:00:00`), to=new Date(from.getTime()+86400000);
  const isDoctorOnly=myRoles.includes("doctor")&&!myRoles.some(r=>r!=="doctor");
  const { data: busy=[] } = useQuery({ queryKey:["occupancy",day], queryFn: async()=>{const {data:rows,error}=await supabase.rpc("get_chair_occupancy",{_from:from.toISOString(),_to:to.toISOString()});if(error)throw error;return rows??[];} });
  const mine=data.appointments.filter(a=>{const s=new Date(a.starts_at);return s>=from&&s<to&&a.status!=="cancelled";});
  const chairs=[...data.chairs.filter(c=>c.is_active),{id:"none",name:"دون كرسي",color:"#94a3b8",is_active:true}] as {id:string;name:string;color:string;is_active:boolean}[];
  const pos=(s:Date,e:Date)=>{const top=((s.getHours()+s.getMinutes()/60)-START)*ROW;const h=Math.max(22,((e.getTime()-s.getTime())/3600000)*ROW);return {top:Math.max(0,top),height:h};};
  const others=busy.filter(b=>!mine.some(m=>m.starts_at===b.starts_at&&(m.chair_id??null)===(b.chair_id??null)&&(!isDoctorOnly||b.doctor_id===myId)));
  return <div className="panel day-calendar">
    <div className="cal-toolbar"><label>اليوم<Input type="date" value={day} onChange={e=>setDay(e.target.value)}/></label><span className="cal-legend"><i className="lg-mine"/>موعد {isDoctorOnly?"لمرضاك":"مسجّل"} <i className="lg-busy"/>مشغول</span></div>
    <div className="cal-scroll"><div className="cal-grid" style={{gridTemplateColumns:`64px repeat(${chairs.length},minmax(150px,1fr))`}}>
      <div className="cal-head"/>{chairs.map(c=><div key={c.id} className="cal-head"><span className="chair-dot" style={{backgroundColor:c.color}}/>{c.name}</div>)}
      <div className="cal-hours">{Array.from({length:END-START},(_,i)=><div key={i} style={{height:ROW}}>{`${String(START+i).padStart(2,"0")}:00`}</div>)}</div>
      {chairs.map(c=>{const cid=c.id==="none"?null:c.id; return <div key={c.id} className="cal-col" style={{height:(END-START)*ROW}}>
        {Array.from({length:END-START},(_,i)=><div key={i} className="cal-slot" style={{top:i*ROW,height:ROW}}/>)}
        {others.filter(b=>(b.chair_id??null)===cid).map((b,i)=><div key={`b${i}`} className="cal-event cal-busy" style={pos(new Date(b.starts_at),new Date(b.ends_at))}>مشغول</div>)}
        {mine.filter(a=>(a.chair_id??null)===cid).map(a=>{const s=new Date(a.starts_at),e=new Date(a.ends_at);const phone=data.patients.find(p=>p.id===a.patient_id)?.phone;const when=s.toLocaleString("ar-SY",{weekday:"long",day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"});const wa=whatsappLink(phone,`مرحباً ${a.patients?.full_name ?? ""}، نذكّرك بموعدك في ${clinic} يوم ${when}. نرجو تأكيد الحضور.`);
          return <div key={a.id} className="cal-event" style={{...pos(s,e),borderInlineStartColor:c.color}}><time>{s.toLocaleTimeString("ar-SY",{hour:"2-digit",minute:"2-digit"})} – {e.toLocaleTimeString("ar-SY",{hour:"2-digit",minute:"2-digit"})}</time><strong>{a.patients?.full_name ?? "مريض"}</strong><span>{a.reason ?? ""}</span>{wa&&<a href={wa} target="_blank" rel="noreferrer" title="تذكير واتساب"><MessageCircle/></a>}</div>;})}
      </div>;})}
    </div></div>
    {!data.chairs.length&&<p className="subheading">أضف كراسي العيادة من صفحة الإعدادات لتظهر أعمدتها هنا.</p>}
  </div>;
}
async function exportExcel(data: Awaited<ReturnType<typeof loadClinic>>) {
  const XLSX = await import("xlsx"); const wb = XLSX.utils.book_new();
  const add = (name: string, rows: AnyRow[]) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ "لا توجد بيانات": "" }]), name);
  add("المرضى", data.patients.map(p => ({ "الاسم": p.full_name, "رقم الملف": p.file_number, "الهاتف": p.phone, "تاريخ الميلاد": p.date_of_birth, "الحساسية": p.allergies, "أمراض مزمنة": p.chronic_diseases, "ملاحظات": p.medical_notes })));
  add("المواعيد", data.appointments.map(a => ({ "المريض": a.patients?.full_name, "البداية": new Date(a.starts_at).toLocaleString("ar-SY"), "السبب": a.reason, "الحالة": statusLabel(a.status), "الكرسي": a.chairs?.name })));
  add("العلاجات", data.treatments.map(t => ({ "المريض": t.patients?.full_name, "العلاج": t.title, "الأسنان": t.tooth_numbers, "التكلفة": Number(t.cost), "التاريخ": t.treated_at })));
  add("الوصفات", data.prescriptions.map(p => ({ "المريض": p.patients?.full_name, "الدواء": p.medication, "الجرعة": p.dosage, "التاريخ": p.prescribed_at })));
  add("سجل الأسنان", data.dentalChart.map(d => ({ "المريض": d.patients?.full_name, "السن": d.tooth_number, "الحالة": d.condition, "الإجراء": d.treatment, "التاريخ": new Date(d.created_at).toLocaleDateString("ar-SY") })));
  add("الفواتير", data.invoices.map(i => ({ "الرقم": i.invoice_number, "المريض": i.patients?.full_name, "الإجمالي": Number(i.total), "المدفوع": Number(i.paid), "الحالة": statusLabel(i.status), "التاريخ": i.issued_at })));
  add("الدفعات", data.payments.map(p => ({ "المبلغ": Number(p.amount), "الطريقة": p.method, "التاريخ": new Date(p.paid_at).toLocaleString("ar-SY") })));
  wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.writeFile(wb, `نسخة-العيادة-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
function Clinical({ data }: { data: Awaited<ReturnType<typeof loadClinic>> }) { return <div className="dashboard-grid"><div className="panel"><SectionTitle title="العلاجات الأخيرة" link="/clinical" />{data.treatments.map((t) => <div className="record-row" key={t.id}><Stethoscope /><div><strong>{t.title}</strong><span>{t.patients?.full_name} · الأسنان {t.tooth_numbers || "—"}</span></div><b>{money(t.cost)}</b></div>)}</div><div className="panel"><SectionTitle title="الوصفات الأخيرة" link="/clinical" />{data.prescriptions.map((p) => <div className="record-row" key={p.id}><FileText /><div><strong>{p.medication}</strong><span>{p.patients?.full_name} · {p.dosage ?? "حسب الوصفة"}</span></div></div>)}</div><div className="panel"><SectionTitle title="سجل الأسنان" link="/clinical" />{data.dentalChart.map((d) => <div className="record-row" key={d.id}><span className="avatar">{d.tooth_number}</span><div><strong>{d.condition}</strong><span>{d.patients?.full_name} · {d.treatment ?? "دون إجراء"}</span></div></div>)}</div></div>; }
const escHtml = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[ch] ?? ch);

/** فتح فاتورة بتصميم العيادة في نافذة طباعة (يمكن حفظها PDF من نافذة الطباعة) */
function printInvoice(inv: AnyRow, pays: AnyRow[], doctor: string, settings: AnyRow | null | undefined): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  const logoSrc = settings?.["logo_url"] ? String(settings["logo_url"]) : new URL(logo, window.location.href).href;
  const rest = Math.max(0, Number(inv["total"]) - Number(inv["paid"]));
  const rows = pays.length ? pays.map((p) => `<tr><td>${escHtml(fmtDay(p["paid_at"]))}</td><td>${escHtml(methodLabel(p["method"]))}</td><td>${escHtml(money(p["amount"]))}</td></tr>`).join("") : `<tr><td colspan="3">لا توجد دفعات مسجلة</td></tr>`;
  const contact = [settings?.["phone"], settings?.["address"]].filter(Boolean).map(escHtml).join(" · ");
  w.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>فاتورة ${escHtml(inv["invoice_number"])}</title><style>
*{box-sizing:border-box}body{margin:0;padding:28px;font-family:Tahoma,Arial,sans-serif;color:#062a40;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.sheet{max-width:760px;margin:auto;border:3px solid #0b4768;border-radius:22px;overflow:hidden}
.head{display:flex;align-items:center;justify-content:space-between;gap:16px;background:#d9ecf6;border-bottom:3px solid #0b4768;padding:16px 22px}
.head img{height:64px}.head h1{margin:0;font-size:22px;color:#0b4768}.head small{display:block;color:#35566b;margin-top:4px}
.body{padding:22px}.title{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.title h2{margin:0;color:#0b4768;font-size:20px}.badge{background:#66adcd;color:#062a40;border:2px solid #0b4768;border-radius:999px;padding:3px 14px;font-weight:700;font-size:13px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px}.grid div{background:#f1f8fc;border:2px solid #b9d6e6;border-radius:12px;padding:10px 12px}
.grid span{display:block;font-size:12px;color:#35566b}.grid strong{font-size:15px}
table{width:100%;border-collapse:collapse;margin-bottom:18px}th{background:#0b4768;color:#fff;padding:9px 12px;text-align:start;font-size:13px}td{padding:9px 12px;border-bottom:1px solid #b9d6e6;font-size:14px}
.sum td:first-child{color:#35566b}.sum tr:last-child td{font-weight:800;border-bottom:0;color:#0b4768;font-size:16px}
.foot{text-align:center;background:#0b4768;color:#d9ecf6;padding:12px;font-size:13px}@media print{body{padding:0}.sheet{border-radius:0;border-width:2px}}
</style></head><body><div class="sheet">
<div class="head"><div><h1>Alteesh Clinic</h1><small>${contact}</small></div><img src="${escHtml(logoSrc)}" alt=""></div>
<div class="body"><div class="title"><h2>فاتورة رقم ${escHtml(inv["invoice_number"])}</h2><span class="badge">${escHtml(statusLabel(inv["status"]))}</span></div>
<div class="grid"><div><span>المريض</span><strong>${escHtml(inv["patients"]?.["full_name"] ?? "—")}</strong></div><div><span>الطبيب</span><strong>${escHtml(doctor)}</strong></div><div><span>تاريخ الفاتورة</span><strong>${escHtml(fmtDay(inv["issued_at"] ?? inv["created_at"]))}</strong></div><div><span>ملاحظات</span><strong>${escHtml(inv["notes"] || "—")}</strong></div></div>
<table class="sum"><tbody><tr><td>المبلغ قبل الحسم</td><td>${escHtml(money(inv["subtotal"] ?? inv["total"]))}</td></tr><tr><td>الحسم</td><td>${Number(inv["discount"]) ? escHtml(money(inv["discount"])) : "—"}</td></tr><tr><td>الإجمالي</td><td>${escHtml(money(inv["total"]))}</td></tr><tr><td>المدفوع</td><td>${escHtml(money(inv["paid"]))}</td></tr><tr><td>المتبقي</td><td>${rest > 0 ? escHtml(money(rest)) : "مسدد بالكامل"}</td></tr></tbody></table>
<table><thead><tr><th>تاريخ الدفعة</th><th>الطريقة</th><th>المبلغ</th></tr></thead><tbody>${rows}</tbody></table></div>
<div class="foot">شكراً لثقتكم بنا — نتمنى لكم دوام الابتسامة</div></div></body></html>`);
  w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch { /* تجاهل */ } }, 700);
  return true;
}

function Invoices({ data, myRoles }: { data: Awaited<ReturnType<typeof loadClinic>>; myRoles: Role[] }) {
  const doctorOnly = !myRoles.some((r) => ["super_admin", "admin", "receptionist"].includes(r));
  const qc = useQueryClient(); const [msg, setMsg] = useState("");
  const canCancel = !doctorOnly;
  async function cancelInvoice(id: string) { const { error } = await sb.rpc("cancel_invoice", { _invoice_id: id }); setMsg(error ? error.message : ""); await qc.invalidateQueries({ queryKey: ["clinic"] }); }
  const docName = (id?: string | null) => data.profiles.find((p) => p.id === id)?.full_name ?? "—";
  function printOne(i: AnyRow) { const ok = printInvoice(i, data.payments.filter((py) => py.invoice_id === i['id']), docName(i['doctor_id']), data.settings as AnyRow | null); setMsg(ok ? "" : "اسمح بالنوافذ المنبثقة في المتصفح لتتمكن من الطباعة"); }
  return <>
    {doctorOnly && <FinanceReport admin={false} />}
    {msg && <p className="form-error">{msg}</p>}
    <div className="panel table-panel"><table><thead><tr><th>رقم الفاتورة</th><th>المريض</th><th>الطبيب</th><th>الإجمالي</th><th>الحسم</th><th>المدفوع</th><th>الحالة</th><th></th>{canCancel && <th></th>}</tr></thead><tbody>{data.invoices.map((i: AnyRow) => <tr key={i['id']}><td>{i['invoice_number']}</td><td>{i['patients']?.full_name}</td><td>{docName(i['doctor_id'])}</td><td>{money(i['total'])}</td><td>{Number(i['discount']) ? money(i['discount']) : "—"}</td><td>{money(i['paid'])}</td><td><span className={`status status-${i['status']}`}>{statusLabel(i['status'])}</span></td><td><Button size="sm" variant="outline" type="button" onClick={() => printOne(i)}>طباعة</Button></td>{canCancel && <td>{i['status'] !== "cancelled" && Number(i['paid']) === 0 && <CancelInvoiceButton number={i['invoice_number']} onConfirm={() => cancelInvoice(i['id'])} />}</td>}</tr>)}</tbody></table>{!data.invoices.length && <Empty title="لا توجد فواتير" text={doctorOnly ? "ستظهر هنا فواتير ودفعات مرضاك." : "أنشئ أول فاتورة لمريض."} />}<p className="subheading">الدفعات المسجلة: {data.payments.length}</p></div>
  </>;
}

function CancelInvoiceButton({ number, onConfirm }: { number: string; onConfirm: () => void | Promise<void> }) {
  return <AlertDialog><AlertDialogTrigger asChild><Button size="sm" variant="ghost">إلغاء الفاتورة</Button></AlertDialogTrigger><AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>إلغاء الفاتورة {number}؟</AlertDialogTitle><AlertDialogDescription>سيتم إلغاء الفاتورة ولا يمكن التراجع. لا يمكن إلغاء فاتورة عليها دفعات.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>رجوع</AlertDialogCancel><AlertDialogAction onClick={onConfirm}>تأكيد الإلغاء</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}
function Reports({ data }: { data: Awaited<ReturnType<typeof loadClinic>> }) { const billed=data.invoices.reduce((s,i)=>s+Number(i.total),0), paid=data.invoices.reduce((s,i)=>s+Number(i.paid),0); return <><div className="row-actions" style={{marginBottom:16}}><Button onClick={()=>exportExcel(data)}><Download/> تصدير نسخة احتياطية (Excel)</Button></div><section className="stat-grid"><Stat icon={<CircleDollarSign />} label="إجمالي الفواتير" value={money(billed)} note="القيمة الصادرة"/><Stat icon={<Activity />} label="المحصل" value={money(paid)} note="دفعات مسجلة"/><Stat icon={<FileText />} label="المتبقي" value={money(billed-paid)} note="ذمم مفتوحة"/><Stat icon={<CalendarDays />} label="المواعيد المكتملة" value={data.appointments.filter(a=>a.status==='completed').length} note="زيارة مكتملة"/></section><div className="panel chart"><h2>توزيع حالة المواعيد</h2>{["completed","confirmed","scheduled","cancelled"].map(s=><div className="bar-row" key={s}><span>{statusLabel(s)}</span><div><i style={{width:`${Math.max(4,data.appointments.length ? data.appointments.filter(a=>a.status===s).length/data.appointments.length*100:4)}%`}} /></div><b>{data.appointments.filter(a=>a.status===s).length}</b></div>)}</div><FinanceReport admin /></>; }
function Team({ data, myId }: { data: Awaited<ReturnType<typeof loadClinic>>; myId?: string | undefined }) { const qc=useQueryClient();const [err,setErr]=useState("");const updateUser=useServerFn(updateClinicUser);const deleteUser=useServerFn(deleteClinicUser);const [edit,setEdit]=useState<AnyRow|null>(null);const roleFor=(id:string)=>(data.roles.find(r=>r.user_id===id)?.role??"doctor") as Role;async function remove(id:string){setErr("");try{await deleteUser({data:{id}});}catch(e){setErr(e instanceof Error?e.message:"تعذر الحذف");}await qc.invalidateQueries({queryKey:["clinic"]});}return <>{err&&<div className="form-message" style={{marginBottom:12}}>{err}</div>}<div className="team-grid">{data.profiles.map((p) => <article className="team-card" key={p.id}><div className="avatar avatar-lg">{p.full_name.slice(0,1)}</div><h3>{p.full_name}</h3><p>{p.specialty || "فريق العيادة"}</p>{roleFor(p.id)==="doctor"&&<small>نسبة الطبيب: {Number(data.doctorShares.find((x:AnyRow)=>x['doctor_id']===p.id)?.['percent']??0)}%</small>}{roleFor(p.id)==="super_admin"?<span className="status status-protected">المدير العام - محمي</span>:<span className="status status-confirmed">{roleLabel(roleFor(p.id))}</span>}{roleFor(p.id)!=="super_admin"&&p.id!==myId&&<div className="team-actions"><Button size="icon" variant="ghost" title="تعديل" onClick={()=>setEdit({...p,role:roleFor(p.id),doctorPercent:Number(data.doctorShares.find((x:AnyRow)=>x['doctor_id']===p.id)?.['percent']??0)})}><Pencil/></Button><ConfirmDelete title="حذف ملف الطبيب" text="سيُحذف حساب الدخول وملف عضو الفريق نهائيًا، مع بقاء السجلات الطبية السابقة." onConfirm={()=>remove(p.id)}/></div>}</article>)}</div><Dialog open={!!edit} onOpenChange={(o)=>!o&&setEdit(null)}><DialogContent dir="rtl" className="modal-card"><DialogHeader><DialogTitle>تعديل ملف عضو الفريق</DialogTitle></DialogHeader>{edit&&<TeamEditForm member={edit} save={async(values)=>{const {doctorPercent,...rest}=values;await updateUser({data:rest});if(rest.role==="doctor"){const r=await sb.from("doctor_shares").upsert({doctor_id:rest.id,percent:doctorPercent,updated_at:new Date().toISOString()});if(r.error)throw new Error(r.error.message);}setEdit(null);await qc.invalidateQueries({queryKey:["clinic"]});}}/>}</DialogContent></Dialog><h2 className="subheading">كراسي العيادة</h2><div className="chair-grid">{data.chairs.map(c=><div className="chair-tile" key={c.id}><span className="chair-dot" style={{backgroundColor:c.color}}/><strong>{c.name}</strong><small>{c.is_active?'متاح':'غير نشط'}</small></div>)}</div></>; }
function roleLabel(role:Role){return({super_admin:"مدير عام",admin:"مدير",doctor:"طبيب",nurse:"ممرض",receptionist:"استقبال"} as Record<Role,string>)[role]}
function TeamEditForm({member,save}:{member:AnyRow;save:(values:{id:string;fullName:string;phone?:string;specialty?:string;role:Exclude<Role,"super_admin">;doctorPercent:number})=>Promise<void>}){const [message,setMessage]=useState("");async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);try{await save({id:String(member["id"]),fullName:String(f.get("fullName")).trim(),phone:String(f.get("phone")),specialty:String(f.get("specialty")),role:String(f.get("role")) as Exclude<Role,"super_admin">,doctorPercent:Number(f.get("doctorPercent")||0)})}catch(error){setMessage(error instanceof Error?error.message:"تعذر حفظ التعديلات")}}return <form className="form-stack" onSubmit={submit}><label>الاسم الكامل<Input name="fullName" required maxLength={120} defaultValue={member["full_name"]}/></label><label>الهاتف<Input name="phone" maxLength={30} defaultValue={member["phone"]||""}/></label><label>التخصص<Input name="specialty" maxLength={120} defaultValue={member["specialty"]||""}/></label><label>الدور<select name="role" defaultValue={member["role"]}><option value="doctor">طبيب</option><option value="nurse">ممرض</option><option value="receptionist">استقبال</option><option value="admin">مدير</option></select></label><label>نسبة الطبيب % من المبالغ المحصّلة (للأطباء فقط)<Input name="doctorPercent" type="number" min="0" max="100" step="0.5" defaultValue={member["doctorPercent"]??0}/></label>{message&&<div className="form-message">{message}</div>}<Button size="lg">حفظ التعديلات</Button></form>}

function SettingsPage({ data }: { data: Awaited<ReturnType<typeof loadClinic>> }) {
  const qc=useQueryClient(); const [saved,setSaved]=useState("");
  async function save(e:FormEvent<HTMLFormElement>){e.preventDefault(); const f=new FormData(e.currentTarget); const {data:{user}}=await supabase.auth.getUser(); if(!user)return; let logoUrl:string|null=data.settings?.logo_url??null; const file=f.get('logo'); if(file instanceof File&&file.size){const ext=(file.name.split('.').pop()||'png').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,5)||'png'; const path=`${user.id}/logo-${Date.now()}.${ext}`; const up=await supabase.storage.from('clinic-branding').upload(path,file,{contentType:file.type,upsert:false}); if(up.error){setSaved('تعذر رفع الشعار: '+up.error.message);return;} logoUrl=supabase.storage.from('clinic-branding').getPublicUrl(path).data.publicUrl;} let heroUrl:string|null=data.settings?.hero_image_url??null; const heroFile=f.get('heroImage'); if(f.get('resetHero')){heroUrl=null;} else if(heroFile instanceof File&&heroFile.size){ if(!['image/jpeg','image/png','image/webp'].includes(heroFile.type)){setSaved('صورة الواجهة: الأنواع المسموحة JPG أو PNG أو WEBP');return;} const small=await shrinkImage(heroFile); const hext=(small.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,5)||'jpg'; const hpath=`${user.id}/hero-${Date.now()}.${hext}`; const hup=await supabase.storage.from('clinic-branding').upload(hpath,small,{contentType:small.type,upsert:false}); if(hup.error){setSaved('تعذر رفع صورة الواجهة: '+hup.error.message);return;} heroUrl=supabase.storage.from('clinic-branding').getPublicUrl(hpath).data.publicUrl;} const payload={clinic_name:String(f.get('clinicName')),primary_color:String(f.get('primary')),accent_color:String(f.get('accent')),phone:String(f.get('phone')),email:String(f.get('email')),address:String(f.get('address')),logo_url:logoUrl,hero_image_url:heroUrl,font_family:String(f.get('fontFamily')||'formal'),interface_density:String(f.get('density')||'comfortable'),public_description:String(f.get('description')||'')||null,public_services:String(f.get('services')||'')||null,opening_hours:String(f.get('hours')||'')||null,updated_by:user.id,updated_at:new Date().toISOString()}; const res=data.settings?await supabase.from('clinic_settings').update(payload).eq('id',data.settings.id):await supabase.from('clinic_settings').insert(payload); setSaved(res.error?res.error.message:'تم حفظ هوية العيادة بنجاح'); qc.invalidateQueries({queryKey:['clinic']});}
  return <><form className="settings-grid" onSubmit={save}><section className="panel form-stack"><h2><Palette/> الهوية البصرية</h2><label>اسم العيادة<Input name="clinicName" value="Alteesh Clinic" readOnly/></label><label>الشعار<Input name="logo" type="file" accept="image/png,image/jpeg,image/webp"/></label><label>صورة واجهة الصفحة العامة (أفقية 4:3 يفضّل)<Input name="heroImage" type="file" accept="image/png,image/jpeg,image/webp"/></label>{data.settings?.hero_image_url&&<div style={{display:"flex",gap:10,alignItems:"center"}}><img src={data.settings.hero_image_url} alt="الصورة الحالية" style={{width:96,height:72,objectFit:"cover",borderRadius:8}}/><label style={{display:"flex",gap:6,alignItems:"center",fontSize:13}}><input type="checkbox" name="resetHero"/> العودة إلى الصورة الافتراضية</label></div>}<div className="color-fields"><label>اللون الأساسي<Input name="primary" type="color" defaultValue={data.settings?.primary_color}/></label><label>اللون المساند<Input name="accent" type="color" defaultValue={data.settings?.accent_color}/></label></div><label>الخط<select name="fontFamily" defaultValue={data.settings?.font_family??"formal"}><option value="formal">رسمي أنيق</option><option value="modern">عصري واضح</option></select></label><label>كثافة الواجهة<select name="density" defaultValue={data.settings?.interface_density??"comfortable"}><option value="comfortable">مريحة</option><option value="compact">مدمجة</option></select></label></section><section className="panel form-stack"><h2>صفحة العرض والتواصل</h2><label>نبذة العيادة<Textarea name="description" maxLength={1000} defaultValue={data.settings?.public_description??''}/></label><label>الخدمات (خدمة في كل سطر)<Textarea name="services" maxLength={1000} defaultValue={data.settings?.public_services??''}/></label><label>ساعات العمل<Input name="hours" maxLength={200} defaultValue={data.settings?.opening_hours??''}/></label><label>الهاتف<Input name="phone" maxLength={30} defaultValue={data.settings?.phone??''}/></label><label>البريد<Input name="email" type="email" maxLength={255} defaultValue={data.settings?.email??''}/></label><label>العنوان<Textarea name="address" maxLength={500} defaultValue={data.settings?.address??''}/></label>{saved&&<div className="form-message">{saved}</div>}<Button size="lg">حفظ التغييرات</Button></section></form><GalleryManager /><CasesManager /><PricesManager data={data} /><FinanceSettings data={data} /></>;
}

function CreateForm({ page, data, done }: { page: Page; data: Awaited<ReturnType<typeof loadClinic>> | undefined; done: () => void }) {
  const createUser=useServerFn(createClinicUser); const [message,setMessage]=useState("");
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault(); const f=new FormData(e.currentTarget); const {data:{user}}=await supabase.auth.getUser(); if(!user)return; let error:unknown;
    if(page==='patients'){({error}=await supabase.from('patients').insert({full_name:String(f.get('fullName')),file_number:String(f.get('fileNumber'))||null,phone:String(f.get('phone'))||null,date_of_birth:String(f.get('birth'))||null,allergies:String(f.get('allergies'))||null,chronic_diseases:String(f.get('chronic'))||null,created_by:user.id}));}
    else if(page==='appointments'){const start=new Date(String(f.get('startsAt'))); ({error}=await supabase.from('appointments').insert({patient_id:String(f.get('patientId')),doctor_id:String(f.get('doctorId'))||null,chair_id:String(f.get('chairId'))||null,starts_at:start.toISOString(),ends_at:new Date(start.getTime()+Number(f.get('duration')||30)*60000).toISOString(),reason:String(f.get('reason')),created_by:user.id}));}
    else if(page==='clinical'){const kind=String(f.get('kind')); if(kind==='prescription')({error}=await supabase.from('prescriptions').insert({patient_id:String(f.get('patientId')),doctor_id:user.id,medication:String(f.get('title')),dosage:String(f.get('details'))})); else if(kind==='dental')({error}=await supabase.from('dental_chart_entries').insert({patient_id:String(f.get('patientId')),tooth_number:Number(f.get('toothNumber')),condition:String(f.get('title')),treatment:String(f.get('details'))||null,recorded_by:user.id})); else ({error}=await supabase.from('treatments').insert({patient_id:String(f.get('patientId')),doctor_id:user.id,title:String(f.get('title')),tooth_numbers:String(f.get('details')),cost:Number(f.get('cost')||0)}));}
    else if(page==='invoices'){const kind=String(f.get('kind')); if(kind==='payment'){({error}=await sb.rpc('record_payment',{_invoice_id:String(f.get('invoiceId')),_amount:Number(f.get('amount')||0),_method:String(f.get('method'))}));} else {({error}=await sb.rpc('create_invoice',{_patient_id:String(f.get('patientId')),_doctor_id:String(f.get('doctorId'))||null,_subtotal:Number(f.get('subtotal')||0),_discount_kind:String(f.get('discountKind')),_discount_value:Number(f.get('discountValue')||0),_notes:null}));}}
    else if(page==='team'){try{const created=await createUser({data:{email:String(f.get('email')),password:String(f.get('password')),fullName:String(f.get('fullName')),phone:String(f.get('phone')),specialty:String(f.get('specialty')),role:String(f.get('role')) as 'doctor'}});const pct=Number(f.get('doctorPercent')||0);if(created?.id&&String(f.get('role'))==='doctor'&&pct>0){const r=await sb.from('doctor_shares').upsert({doctor_id:created.id,percent:pct});if(r.error)error=r.error;}}catch(e){error=e;}}
    else if(page==='inventory'){const qty=Math.max(0,Number(f.get('quantity')||0)); const ins=await sb.from('inventory_items').insert({name:String(f.get('name')).trim(),unit:String(f.get('unit')||'قطعة').trim()||'قطعة',min_quantity:Math.max(0,Number(f.get('minQuantity')||0)),unit_cost:Math.max(0,Number(f.get('unitCost')||0))}).select('id').single(); error=ins.error; if(!error&&qty>0){const mv=await sb.from('inventory_movements').insert({item_id:ins.data.id,kind:'in',quantity:qty,note:'رصيد افتتاحي',created_by:user.id}); error=mv.error;}}
    else if(page==='settings'){({error}=await supabase.from('chairs').insert({name:String(f.get('name')),color:String(f.get('color'))}));}
    if(error){setMessage(error instanceof Error?error.message:String((error as AnyRow)?.["message"]??error));return;} done();}
  return <form className="form-stack" onSubmit={submit}>
    {page==='patients'&&<><label>اسم المريض<Input name="fullName" required/></label><div className="form-grid"><label>رقم الملف<Input name="fileNumber"/></label><label>الهاتف<Input name="phone"/></label></div><label>تاريخ الميلاد<Input name="birth" type="date"/></label><label>الحساسية<Textarea name="allergies"/></label><label>الأمراض المزمنة<Textarea name="chronic"/></label></>}
    {page==='appointments'&&<><PatientSelect data={data}/><label>الطبيب<select name="doctorId"><option value="">دون تحديد</option>{data?.profiles.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label><label>الكرسي<select name="chairId"><option value="">دون تحديد</option>{data?.chairs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><div className="form-grid"><label>التاريخ والوقت<Input name="startsAt" type="datetime-local" step={900} required/></label><label>مدة الموعد<select name="duration" defaultValue="30"><option value="15">15 دقيقة</option><option value="30">30 دقيقة</option><option value="45">45 دقيقة</option><option value="60">ساعة</option><option value="90">ساعة ونصف</option><option value="120">ساعتان</option></select></label></div><label>سبب الزيارة<Input name="reason" required/></label></>}
    {page==='clinical'&&<><PatientSelect data={data}/><label>نوع السجل<select name="kind"><option value="treatment">علاج</option><option value="prescription">وصفة</option><option value="dental">سجل سن</option></select></label>{(data?.prices ?? []).some((x:AnyRow)=>x['is_active'])&&<label>من قائمة الأسعار (اختياري)<select defaultValue="" onChange={(e)=>{const f=e.currentTarget.form; const pr=data?.prices.find((x:AnyRow)=>x['id']===e.currentTarget.value); if(f&&pr){(f.elements.namedItem("title") as HTMLInputElement).value=pr['name'];(f.elements.namedItem("cost") as HTMLInputElement).value=String(pr['default_price']);}}}><option value="">اختر علاجاً</option>{data?.prices.filter((x:AnyRow)=>x['is_active']).map((x:AnyRow)=><option key={x['id']} value={x['id']}>{x['name']} — {money(x['default_price'])}</option>)}</select></label>}<label>العلاج أو الدواء أو الحالة<Input name="title" required/></label><label>الأسنان أو الجرعة أو الإجراء<Input name="details"/></label><label>رقم السن (لسجل الأسنان)<Input name="toothNumber" type="number" min="11" max="85"/></label><label>التكلفة<Input name="cost" type="number" min="0"/></label></>}
    {page==='invoices'&&<><label>نوع العملية<select name="kind"><option value="invoice">فاتورة جديدة</option><option value="payment">تسجيل دفعة</option></select></label><PatientSelect data={data}/><label>الفاتورة (عند تسجيل دفعة)<select name="invoiceId"><option value="">اختر الفاتورة</option>{data?.invoices.map(i=><option key={i.id} value={i.id}>{i.invoice_number}</option>)}</select></label><InvoiceFields data={data}/><label>مبلغ الدفعة<Input name="amount" type="number" min="1"/></label><label>طريقة الدفع<select name="method"><option value="cash">نقداً</option><option value="card">بطاقة</option><option value="transfer">تحويل</option></select></label></>}
    {page==='team'&&<><label>الاسم الكامل<Input name="fullName" required/></label><label>البريد<Input name="email" type="email" required/></label><label>كلمة مرور مؤقتة<Input name="password" type="password" minLength={8} required/></label><label>الهاتف<Input name="phone"/></label><label>التخصص<Input name="specialty"/></label><label>الدور<select name="role"><option value="doctor">طبيب</option><option value="nurse">ممرض</option><option value="receptionist">استقبال</option><option value="admin">مدير</option></select></label><label>نسبة الطبيب % (للأطباء فقط)<Input name="doctorPercent" type="number" min="0" max="100" step="0.5" defaultValue="0"/></label></>}
    {page==='inventory'&&<><label>اسم المادة<Input name="name" required maxLength={120}/></label><div className="form-grid"><label>الوحدة<Input name="unit" defaultValue="قطعة" maxLength={30}/></label><label>الكمية الافتتاحية<Input name="quantity" type="number" min="0" step="0.01" defaultValue="0"/></label></div><div className="form-grid"><label>حد التنبيه الأدنى<Input name="minQuantity" type="number" min="0" step="0.01" defaultValue="0"/></label><label>تكلفة الوحدة<Input name="unitCost" type="number" min="0" step="0.01" defaultValue="0"/></label></div></>}
    {page==='settings'&&<><label>اسم الكرسي<Input name="name" required/></label><label>لون الكرسي<Input name="color" type="color" defaultValue="#287f7b"/></label></>}
    {message&&<div className="form-message">{message}</div>}<Button size="lg">حفظ</Button>
  </form>;
}
function num(v: unknown) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

function InvoiceFields({ data }: { data: Awaited<ReturnType<typeof loadClinic>> | undefined }) {
  const [subtotal, setSubtotal] = useState(0);
  const [kind, setKind] = useState<"percent" | "amount">("percent");
  const [value, setValue] = useState(0);
  const discount = Math.min(subtotal, Math.max(0, kind === "percent" ? (subtotal * value) / 100 : value));
  const doctors = (data?.profiles ?? []).filter((p) => data?.roles.some((r) => r.user_id === p.id && r.role === "doctor"));
  const prices = (data?.prices ?? []).filter((x: AnyRow) => x['is_active']);
  return <>
    <label>الطبيب المعالج (يُحسب على أساسه نصيبه)<select name="doctorId"><option value="">دون تحديد</option>{doctors.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>
    {prices.length > 0 && <label>أضف علاجاً من قائمة الأسعار<select value="" onChange={(e) => { const pr = prices.find((x: AnyRow) => x['id'] === e.target.value); if (pr) setSubtotal((v) => v + num(pr['default_price'])); }}><option value="">اختر علاجاً ليُضاف إلى المبلغ</option>{prices.map((x: AnyRow) => <option key={x['id']} value={x['id']}>{x['name']} — {money(x['default_price'])}</option>)}</select></label>}
    <label>المبلغ قبل الحسم<Input name="subtotal" type="number" min="0" value={subtotal || ""} onChange={(e) => setSubtotal(num(e.target.value))} /></label>
    <div className="form-grid">
      <label>نوع الحسم<select name="discountKind" value={kind} onChange={(e) => setKind(e.target.value as "percent" | "amount")}><option value="percent">نسبة %</option><option value="amount">مبلغ ثابت</option></select></label>
      <label>قيمة الحسم<Input name="discountValue" type="number" min="0" value={value || ""} onChange={(e) => setValue(num(e.target.value))} /></label>
    </div>
    <p className="subheading">الحسم: {money(discount)} — الإجمالي بعد الحسم: {money(subtotal - discount)}</p>
  </>;
}

function GalleryManager() {
  const qc = useQueryClient();
  const [caption, setCaption] = useState(""); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const list = useQuery({
    queryKey: ["gallery"],
    queryFn: async () => { const { data: rows, error } = await sb.from("clinic_gallery").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false }); if (error) throw error; return (rows ?? []) as AnyRow[]; },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["gallery"] });
  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget; const picked = input.files?.[0]; if (!picked) return;
    setBusy(true); setMsg("");
    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(picked.type)) throw new Error("الأنواع المسموحة: JPG أو PNG أو WEBP");
      if ((list.data ?? []).length >= 24) throw new Error("الحد الأقصى 24 صورة، احذف صورة قبل إضافة أخرى");
      const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("انتهت الجلسة، سجّل الدخول من جديد");
      const file = await shrinkImage(picked);
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("clinic-gallery").upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) throw up.error;
      const url = supabase.storage.from("clinic-gallery").getPublicUrl(path).data.publicUrl;
      const ins = await sb.from("clinic_gallery").insert({ image_url: url, storage_path: path, caption: caption.trim() || null, created_by: user.id });
      if (ins.error) { await supabase.storage.from("clinic-gallery").remove([path]); throw ins.error; }
      setCaption(""); await refresh();
    } catch (err) { setMsg(errText(err)); } finally { setBusy(false); input.value = ""; }
  }
  async function remove(row: AnyRow) {
    setMsg("");
    const { error } = await sb.from("clinic_gallery").delete().eq("id", row["id"]);
    if (error) { setMsg(error.message); return; }
    await supabase.storage.from("clinic-gallery").remove([row["storage_path"]]);
    await refresh();
  }
  return <section className="panel form-stack" style={{ marginTop: 16 }}>
    <h2>معرض صور الصفحة العامة</h2>
    <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>الصور التي تضيفها هنا تظهر للمرضى في الصفحة العامة للعيادة (حتى 24 صورة).</p>
    <label>وصف الصورة (اختياري)<Input value={caption} maxLength={200} onChange={(e) => setCaption(e.target.value)} /></label>
    <label>اختر صورة (JPG أو PNG أو WEBP)<Input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={upload} /></label>
    {busy && <div className="form-message">جارٍ الرفع...</div>}
    {msg && <div className="form-message">{msg}</div>}
    {list.isLoading ? <Loading /> : list.error ? <Empty title="تعذر تحميل المعرض" text="تأكد من تنفيذ ملف SQL الخاص بالمعرض (0012)." /> : !(list.data ?? []).length ? <Empty title="لا توجد صور" text="أضف أول صورة لتظهر في الصفحة العامة." /> :
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>
        {(list.data ?? []).map((r: AnyRow) => <div className="panel" key={r["id"]} style={{ padding: 8 }}>
          <img src={r["image_url"]} alt={r["caption"] || "صورة"} loading="lazy" style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 8 }} />
          {r["caption"] && <div style={{ fontSize: 12, marginTop: 6 }}>{r["caption"]}</div>}
          <ConfirmDelete title="حذف الصورة" text="ستُحذف الصورة من المعرض ومن الصفحة العامة نهائياً." onConfirm={() => remove(r)} />
        </div>)}
      </div>}
  </section>;
}

function CasesManager() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const list = useQuery({
    queryKey: ["cases"],
    queryFn: async () => { const { data: rows, error } = await sb.from("clinic_cases").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false }); if (error) throw error; return (rows ?? []) as AnyRow[]; },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["cases"] });
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
    setBusy(true); setMsg("");
    const uploaded: string[] = [];
    try {
      const title = String(f.get("title") || "").trim(); if (title.length < 2) throw new Error("اكتب عنواناً للحالة");
      const before = f.get("before"); const after = f.get("after");
      if (!(before instanceof File) || !before.size || !(after instanceof File) || !after.size) throw new Error("اختر صورة «قبل» وصورة «بعد»");
      for (const fl of [before, after]) if (!["image/jpeg", "image/png", "image/webp"].includes(fl.type)) throw new Error("الأنواع المسموحة: JPG أو PNG أو WEBP");
      if ((list.data ?? []).length >= 12) throw new Error("الحد الأقصى 12 حالة، احذف حالة قبل إضافة أخرى");
      if (!f.get("consent")) throw new Error("أكّد موافقة المريض على نشر الصور");
      const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("انتهت الجلسة، سجّل الدخول من جديد");
      const put = async (raw: File) => {
        const file = await shrinkImage(raw);
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
        const path = `cases/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from("clinic-gallery").upload(path, file, { contentType: file.type, upsert: false });
        if (up.error) throw up.error;
        uploaded.push(path);
        return { path, url: supabase.storage.from("clinic-gallery").getPublicUrl(path).data.publicUrl };
      };
      const b = await put(before); const a = await put(after);
      const ins = await sb.from("clinic_cases").insert({ title, description: String(f.get("description") || "").trim() || null, before_url: b.url, before_path: b.path, after_url: a.url, after_path: a.path, created_by: user.id });
      if (ins.error) throw ins.error;
      form.reset(); await refresh();
    } catch (err) {
      if (uploaded.length) await supabase.storage.from("clinic-gallery").remove(uploaded);
      setMsg(errText(err));
    } finally { setBusy(false); }
  }
  async function remove(row: AnyRow) {
    setMsg("");
    const { error } = await sb.from("clinic_cases").delete().eq("id", row["id"]);
    if (error) { setMsg(error.message); return; }
    await supabase.storage.from("clinic-gallery").remove([row["before_path"], row["after_path"]]);
    await refresh();
  }
  return <section className="panel form-stack" style={{ marginTop: 16 }}>
    <h2>عرض الحالات (قبل / بعد)</h2>
    <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>تظهر هذه الحالات للمرضى في الصفحة العامة (حتى 12 حالة). انشر فقط صور مرضى وافقوا على ذلك، وتجنّب أي صورة تكشف هويتهم.</p>
    <form className="form-stack" onSubmit={submit}>
      <label>عنوان الحالة<Input name="title" maxLength={120} required placeholder="مثال: تجميل الأسنان الأمامية" /></label>
      <label>وصف قصير (اختياري)<Textarea name="description" maxLength={300} /></label>
      <div className="form-grid">
        <label>صورة «قبل»<Input name="before" type="file" accept="image/jpeg,image/png,image/webp" required /></label>
        <label>صورة «بعد»<Input name="after" type="file" accept="image/jpeg,image/png,image/webp" required /></label>
      </div>
      <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" name="consent" /> أؤكد موافقة المريض على نشر صور حالته</label>
      <Button type="submit" disabled={busy}>{busy ? "جارٍ الرفع..." : "إضافة الحالة"}</Button>
    </form>
    {msg && <div className="form-message">{msg}</div>}
    {list.isLoading ? <Loading /> : list.error ? <Empty title="تعذر تحميل الحالات" text="تأكد من تنفيذ ملف SQL الخاص بالحالات (0013)." /> : !(list.data ?? []).length ? <Empty title="لا توجد حالات" text="أضف أول حالة لتظهر في الصفحة العامة." /> :
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
        {(list.data ?? []).map((r: AnyRow) => <div className="panel" key={r["id"]} style={{ padding: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            <img src={r["before_url"]} alt="قبل" loading="lazy" style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 6 }} />
            <img src={r["after_url"]} alt="بعد" loading="lazy" style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 6 }} />
          </div>
          <div style={{ fontSize: 13, marginTop: 6, fontWeight: 600 }}>{r["title"]}</div>
          <ConfirmDelete title="حذف الحالة" text="ستُحذف الحالة وصورتاها من الصفحة العامة نهائياً." onConfirm={() => remove(r)} />
        </div>)}
      </div>}
  </section>;
}

function PricesManager({ data }: { data: Awaited<ReturnType<typeof loadClinic>> }) {
  const qc = useQueryClient(); const [msg, setMsg] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["clinic"] });
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
    const { error } = await sb.from("treatment_prices").insert({ name: String(f.get("name")).trim(), default_price: num(f.get("price")) });
    if (error) { setMsg(error.message); return; }
    form.reset(); setMsg(""); await refresh();
  }
  async function update(id: string, patch: AnyRow) { const { error } = await sb.from("treatment_prices").update(patch).eq("id", id); setMsg(error ? error.message : ""); await refresh(); }
  async function remove(id: string) { const { error } = await sb.from("treatment_prices").delete().eq("id", id); setMsg(error ? error.message : ""); await refresh(); }
  return <section className="panel form-stack" style={{ marginTop: 16 }}>
    <h2><CircleDollarSign /> قائمة أسعار العلاجات</h2>
    <form className="form-grid" onSubmit={add}><label>اسم العلاج<Input name="name" required maxLength={120} /></label><label>السعر الافتراضي<Input name="price" type="number" min="0" required /></label><Button>إضافة للقائمة</Button></form>
    {msg && <div className="form-message">{msg}</div>}
    {data.prices.length ? <div className="table-panel"><table><thead><tr><th>العلاج</th><th>السعر</th><th>الحالة</th><th></th></tr></thead><tbody>{data.prices.map((p: AnyRow) => <tr key={`${p['id']}-${p['default_price']}`}><td>{p['name']}</td><td><Input type="number" min="0" defaultValue={p['default_price']} style={{ maxWidth: 130 }} onBlur={(e) => { const v = num(e.currentTarget.value); if (v !== Number(p['default_price'])) update(p['id'], { default_price: v }); }} /></td><td><Button type="button" size="sm" variant="outline" onClick={() => update(p['id'], { is_active: !p['is_active'] })}>{p['is_active'] ? "فعّال" : "معطّل"}</Button></td><td><ConfirmDelete title="حذف العلاج من القائمة" text="يُحذف من قائمة الأسعار فقط، ولا تتأثر الفواتير والعلاجات السابقة." onConfirm={() => remove(p['id'])} /></td></tr>)}</tbody></table></div> : <p className="subheading">لا توجد أسعار بعد. أضف أول علاج من النموذج أعلاه.</p>}
  </section>;
}

function FinanceSettings({ data }: { data: Awaited<ReturnType<typeof loadClinic>> }) {
  const qc = useQueryClient(); const [msg, setMsg] = useState("");
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const { error } = await sb.from("finance_settings").upsert({ id: true, clinic_share_percent: num(f.get("clinic")), materials_share_percent: num(f.get("materials")), updated_at: new Date().toISOString() });
    setMsg(error ? error.message : "تم حفظ النسب"); await qc.invalidateQueries({ queryKey: ["clinic"] });
  }
  return <form className="panel form-stack" style={{ marginTop: 16 }} onSubmit={save}>
    <h2>نسب توزيع الإيرادات</h2>
    <p className="subheading">تُحسب كل نسبة من المبالغ المحصّلة فعلياً على فواتير كل طبيب. نسبة كل طبيب تُحدَّد من صفحة الفريق. تأكد ألا يتجاوز مجموع نسبة الطبيب والعيادة والمواد 100%.</p>
    <div className="form-grid"><label>نسبة العيادة %<Input name="clinic" type="number" min="0" max="100" step="0.5" defaultValue={data.finance?.['clinic_share_percent'] ?? 0} /></label><label>نسبة المواد %<Input name="materials" type="number" min="0" max="100" step="0.5" defaultValue={data.finance?.['materials_share_percent'] ?? 0} /></label></div>
    {msg && <div className="form-message">{msg}</div>}<Button size="lg">حفظ النسب</Button>
  </form>;
}

function FinanceReport({ admin }: { admin: boolean }) {
  const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const now = new Date();
  const [from, setFrom] = useState(iso(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(iso(now));
  const { data: rows, isLoading, error } = useQuery({
    queryKey: ["finance", from, to],
    queryFn: async () => { const { data, error } = await sb.rpc("get_finance_report", { _from: from, _to: to }); if (error) throw error; return (data ?? []) as AnyRow[]; },
  });
  const sum = (k: string) => (rows ?? []).reduce((s, r) => s + num(r[k]), 0);
  return <div className="panel table-panel" style={{ marginBottom: 16, marginTop: 16 }}>
    <h2>{admin ? "حصص الأطباء والعيادة والمواد" : "حصتي من المبالغ المحصّلة"}</h2>
    <div className="form-grid"><label>من تاريخ<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label>إلى تاريخ<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label></div>
    {isLoading ? <Loading /> : error ? <Empty title="تعذر تحميل التقرير" text="تأكد من تنفيذ ملف SQL الخاص بالنسب، ثم أعد المحاولة." /> : !(rows ?? []).length ? <Empty title="لا توجد بيانات" text="ستظهر الحصص بعد ربط الفواتير بالأطباء وتسجيل دفعات." /> :
      <table><thead><tr>{admin && <th>الطبيب</th>}<th>الإيراد المحصّل</th><th>{admin ? "حصة الطبيب" : "حصتي"}</th>{admin && <th>حصة العيادة</th>}{admin && <th>حصة المواد</th>}</tr></thead>
        <tbody>{(rows ?? []).map((r) => <tr key={r['doctor_id']}>{admin && <td>{r['doctor_name']}</td>}<td>{money(r['revenue'])}</td><td>{money(r['doctor_share'])}</td>{admin && <td>{money(r['clinic_share'])}</td>}{admin && <td>{money(r['materials_share'])}</td>}</tr>)}
          {admin && <tr><td><strong>المجموع</strong></td><td><strong>{money(sum("revenue"))}</strong></td><td><strong>{money(sum("doctor_share"))}</strong></td><td><strong>{money(sum("clinic_share"))}</strong></td><td><strong>{money(sum("materials_share"))}</strong></td></tr>}</tbody></table>}
  </div>;
}

const auditTables: Record<string, string> = { patients: "المرضى", appointments: "المواعيد", invoices: "الفواتير", payments: "الدفعات", treatments: "العلاجات", prescriptions: "الوصفات", dental_chart_entries: "سجل الأسنان", profiles: "الفريق", user_roles: "الأدوار", chairs: "الكراسي", clinic_settings: "إعدادات العيادة", treatment_prices: "قائمة الأسعار", doctor_shares: "نسب الأطباء", finance_settings: "نسب العيادة والمواد", patient_files: "ملفات المرضى", inventory_items: "المخزون", inventory_movements: "حركة المخزون", booking_requests: "طلبات الحجز" };
const auditActions: Record<string, [string, string]> = { INSERT: ["إضافة", "confirmed"], UPDATE: ["تعديل", "in_progress"], DELETE: ["حذف", "cancelled"] };
const moveKinds: Record<string, string> = { in: "وارد", out: "صرف", adjust: "جرد" };
const fileKinds: Record<string, string> = { xray: "أشعة", before: "قبل العلاج", after: "بعد العلاج", document: "مستند" };
const bookingStatuses: Record<string, [string, string]> = { new: ["جديد", "scheduled"], contacted: ["تم الاتصال", "in_progress"], confirmed: ["مؤكد", "confirmed"], declined: ["مرفوض", "cancelled"] };
const errText = (err: unknown) => (err instanceof Error ? err.message : String((err as AnyRow)?.["message"] ?? err));

/* ===================== ملفات المريض (أشعة وصور) ===================== */
async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.size < 600_000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch { return file; }
}

function PatientFiles({ patientId, isAdmin }: { patientId: string; isAdmin: boolean }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState("xray"); const [note, setNote] = useState(""); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const files = useQuery({
    queryKey: ["pfiles", patientId],
    queryFn: async () => {
      const { data: rows, error } = await sb.from("patient_files").select("*").eq("patient_id", patientId).order("created_at", { ascending: false });
      if (error) throw error;
      return await Promise.all(((rows ?? []) as AnyRow[]).map(async (r) => { const sg = await sb.storage.from("patient-files").createSignedUrl(r["storage_path"], 3600); return { ...r, url: (sg.data?.signedUrl ?? null) as string | null }; }));
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["pfiles", patientId] });
  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget; const picked = input.files?.[0]; if (!picked) return;
    setBusy(true); setMsg("");
    try {
      const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("انتهت الجلسة، سجّل الدخول من جديد");
      const file = await shrinkImage(picked);
      const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
      const path = `${patientId}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("patient-files").upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) throw up.error;
      const ins = await sb.from("patient_files").insert({ patient_id: patientId, storage_path: path, file_name: picked.name, kind, note: note.trim() || null, uploaded_by: user.id });
      if (ins.error) { await supabase.storage.from("patient-files").remove([path]); throw ins.error; }
      setNote(""); await refresh();
    } catch (err) { setMsg(errText(err)); } finally { setBusy(false); input.value = ""; }
  }
  async function remove(row: AnyRow) {
    await supabase.storage.from("patient-files").remove([row["storage_path"]]);
    const { error } = await sb.from("patient_files").delete().eq("id", row["id"]);
    setMsg(error ? error.message : ""); await refresh();
  }
  return <div className="form-stack" style={{ marginTop: 10 }}>
    <div className="form-grid">
      <label>نوع الملف<select value={kind} onChange={(e) => setKind(e.target.value)}>{Object.entries(fileKinds).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label>ملاحظة (اختياري)<Input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} /></label>
    </div>
    <label>اختر صورة أو ملف PDF (حتى 8 ميغابايت)<Input type="file" accept="image/*,application/pdf" disabled={busy} onChange={upload} /></label>
    {busy && <div className="form-message">جارٍ الرفع...</div>}
    {msg && <div className="form-message">{msg}</div>}
    {files.isLoading ? <Loading /> : files.error ? <Empty title="تعذر تحميل الملفات" text="تأكد من تنفيذ ملف SQL الخاص بالملفات، وأن دورك يتيح رؤيتها." /> : !(files.data ?? []).length ? <Empty title="لا توجد ملفات" text="ارفع أشعة أو صور قبل/بعد العلاج لتظهر هنا." /> :
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>
        {(files.data ?? []).map((r: AnyRow) => { const isImg = /\.(jpe?g|png|webp|gif)$/i.test(String(r["storage_path"])); return <div className="panel" key={r["id"]} style={{ padding: 8 }}>
          {r["url"] ? <a href={r["url"]} target="_blank" rel="noreferrer">{isImg ? <img src={r["url"]} alt={r["file_name"]} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8 }} /> : <div style={{ height: 120, display: "grid", placeItems: "center" }}><FileText size={36} /></div>}</a> : <div style={{ height: 120 }} />}
          <div style={{ fontSize: 12, marginTop: 6 }}><strong>{fileKinds[r["kind"]] ?? r["kind"]}</strong><div>{fmtDay(r["created_at"])}</div>{r["note"] && <div style={{ color: "var(--muted-foreground)" }}>{r["note"]}</div>}</div>
          {isAdmin && <ConfirmDelete title="حذف الملف" text="سيُحذف الملف نهائياً ولا يمكن استرجاعه." onConfirm={() => remove(r)} />}
        </div>; })}
      </div>}
  </div>;
}

/* ===================== المخزون ===================== */
function MovementForm({ item, canStock, done }: { item: AnyRow; canStock: boolean; done: () => void | Promise<void> }) {
  const [message, setMessage] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    const { error } = await sb.from("inventory_movements").insert({ item_id: item["id"], kind: canStock ? String(f.get("kind")) : "out", quantity: Number(f.get("quantity") || 0), note: String(f.get("note") || "") || null, created_by: user.id });
    if (error) { setMessage(error.message); return; }
    await done();
  }
  return <form className="form-stack" onSubmit={submit}>
    <p className="subheading">الكمية الحالية: {Number(item["quantity"])} {item["unit"]}</p>
    {canStock ? <label>نوع الحركة<select name="kind" defaultValue="in"><option value="in">وارد (إضافة للمخزون)</option><option value="out">صرف (استهلاك)</option><option value="adjust">جرد (ضبط الكمية الفعلية)</option></select></label> : <p className="subheading">ستُسجَّل هذه الحركة كصرف من المخزون.</p>}
    <label>الكمية<Input name="quantity" type="number" min="0" step="0.01" required /></label>
    <label>ملاحظة<Input name="note" maxLength={200} /></label>
    {message && <div className="form-message">{message}</div>}<Button size="lg">حفظ الحركة</Button>
  </form>;
}

function Inventory({ data, myRoles }: { data: ClinicData; myRoles: Role[] }) {
  const qc = useQueryClient();
  const isAdmin = myRoles.some((r) => ["super_admin", "admin"].includes(r));
  const canStock = isAdmin || myRoles.includes("nurse");
  const [move, setMove] = useState<AnyRow | null>(null); const [msg, setMsg] = useState("");
  const items = useQuery({ queryKey: ["inventory"], queryFn: async () => { const { data: rows, error } = await sb.from("inventory_items").select("*").order("name"); if (error) throw error; return (rows ?? []) as AnyRow[]; } });
  const moves = useQuery({ queryKey: ["inventory-moves"], queryFn: async () => { const { data: rows, error } = await sb.from("inventory_movements").select("*, inventory_items(name, unit)").order("created_at", { ascending: false }).limit(60); if (error) throw error; return (rows ?? []) as AnyRow[]; } });
  const refresh = async () => { await Promise.all([qc.invalidateQueries({ queryKey: ["inventory"] }), qc.invalidateQueries({ queryKey: ["inventory-moves"] })]); };
  async function patch(id: string, values: AnyRow) { const { error } = await sb.from("inventory_items").update(values).eq("id", id); setMsg(error ? error.message : ""); await refresh(); }
  const who = (id?: string | null) => data.profiles.find((p) => p.id === id)?.full_name ?? "—";
  if (items.isLoading) return <Loading />;
  if (items.error) return <Empty title="تعذر تحميل المخزون" text="تأكد من تنفيذ ملف SQL الخاص بالمخزون ثم أعد المحاولة." />;
  const list = items.data ?? [];
  const low = list.filter((i) => i["is_active"] && Number(i["quantity"]) <= Number(i["min_quantity"]));
  const value = list.reduce((s2, i) => s2 + Number(i["quantity"]) * Number(i["unit_cost"]), 0);
  const state = (i: AnyRow): [string, string] => Number(i["quantity"]) <= 0 ? ["نفد", "cancelled"] : Number(i["quantity"]) <= Number(i["min_quantity"]) ? ["منخفض", "in_progress"] : ["متوفر", "confirmed"];
  return <>
    <section className="stat-grid"><Stat icon={<Package />} label="عدد المواد" value={list.length} note="مادة مسجلة" /><Stat icon={<ShieldAlert />} label="تحتاج تزويداً" value={low.length} note="عند الحد الأدنى أو أقل" />{isAdmin && <Stat icon={<CircleDollarSign />} label="قيمة المخزون" value={money(value)} note="الكمية × تكلفة الوحدة" />}</section>
    {msg && <div className="form-message">{msg}</div>}
    <div className="panel table-panel">{list.length ? <table><thead><tr><th>المادة</th><th>الكمية</th><th>حد التنبيه</th>{isAdmin && <th>تكلفة الوحدة</th>}<th>الحالة</th><th>إجراءات</th></tr></thead><tbody>{list.map((i) => { const st = state(i); return <tr key={`${i["id"]}-${i["min_quantity"]}-${i["unit_cost"]}`} style={i["is_active"] ? undefined : { opacity: 0.55 }}>
      <td><strong>{i["name"]}</strong></td><td>{Number(i["quantity"])} {i["unit"]}</td>
      <td>{isAdmin ? <Input type="number" min="0" step="0.01" defaultValue={i["min_quantity"]} style={{ maxWidth: 100 }} onBlur={(e) => { const v = Number(e.currentTarget.value); if (v !== Number(i["min_quantity"])) patch(i["id"], { min_quantity: v }); }} /> : Number(i["min_quantity"])}</td>
      {isAdmin && <td><Input type="number" min="0" step="0.01" defaultValue={i["unit_cost"]} style={{ maxWidth: 110 }} onBlur={(e) => { const v = Number(e.currentTarget.value); if (v !== Number(i["unit_cost"])) patch(i["id"], { unit_cost: v }); }} /></td>}
      <td><span className={`status status-${st[1]}`}>{st[0]}</span></td>
      <td><div className="row-actions"><Button size="sm" variant="outline" disabled={!i["is_active"]} onClick={() => setMove(i)}>حركة</Button>{isAdmin && <Button size="sm" variant="ghost" onClick={() => patch(i["id"], { is_active: !i["is_active"] })}>{i["is_active"] ? "تعطيل" : "تفعيل"}</Button>}</div></td>
    </tr>; })}</tbody></table> : <Empty title="لا توجد مواد" text={isAdmin ? "أضف أول مادة من زر «إضافة جديد»." : "لم تُسجَّل مواد بعد."} />}</div>
    <h2 className="subheading">آخر الحركات</h2>
    <div className="panel table-panel">{(moves.data ?? []).length ? <table><thead><tr><th>الوقت</th><th>المادة</th><th>النوع</th><th>الكمية</th><th>بواسطة</th><th>ملاحظة</th></tr></thead><tbody>{(moves.data ?? []).map((m) => <tr key={m["id"]}><td>{new Date(m["created_at"]).toLocaleString("ar-SY")}</td><td>{m["inventory_items"]?.name ?? "—"}</td><td>{moveKinds[m["kind"]] ?? m["kind"]}</td><td>{Number(m["quantity"])}</td><td>{who(m["created_by"])}</td><td>{m["note"] || "—"}</td></tr>)}</tbody></table> : <Empty title="لا توجد حركات" text="ستظهر هنا حركات الوارد والصرف والجرد." />}</div>
    <Dialog open={!!move} onOpenChange={(o) => !o && setMove(null)}><DialogContent dir="rtl" className="modal-card"><DialogHeader><DialogTitle>حركة مخزون — {move?.["name"]}</DialogTitle></DialogHeader>{move && <MovementForm item={move} canStock={canStock} done={async () => { setMove(null); await refresh(); }} />}</DialogContent></Dialog>
  </>;
}

/* ===================== طلبات الحجز من الصفحة العامة ===================== */
function BookingRequests({ data, myId, myRoles }: { data: ClinicData; myId?: string | undefined; myRoles: Role[] }) {
  const qc = useQueryClient(); const [msg, setMsg] = useState("");
  const isAdmin = myRoles.some((r) => ["super_admin", "admin"].includes(r));
  const q = useQuery({ queryKey: ["bookings"], queryFn: async () => { const { data: rows, error } = await sb.from("booking_requests").select("*").order("created_at", { ascending: false }).limit(200); if (error) throw error; return (rows ?? []) as AnyRow[]; } });
  const refresh = () => qc.invalidateQueries({ queryKey: ["bookings"] });
  const digits = (v?: string | null) => String(v ?? "").replace(/\D/g, "");
  const hasPatient = (phone: string) => data.patients.some((p) => digits(p.phone) && digits(p.phone) === digits(phone));
  async function setStatus(id: string, status: string) { const { error } = await sb.from("booking_requests").update({ status, handled_by: myId ?? null }).eq("id", id); setMsg(error ? error.message : ""); await refresh(); }
  async function makePatient(r: AnyRow) {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    const { error } = await sb.from("patients").insert({ full_name: r["full_name"], phone: r["phone"], created_by: user.id });
    setMsg(error ? error.message : "تم إنشاء ملف المريض، احجز موعده الآن من «الجدول اليومي»."); await qc.invalidateQueries({ queryKey: ["clinic"] });
  }
  async function remove(id: string) { const { error } = await sb.from("booking_requests").delete().eq("id", id); setMsg(error ? error.message : ""); await refresh(); }
  if (q.isLoading) return <Loading />;
  if (q.error) return <Empty title="تعذر تحميل الطلبات" text="تأكد من تنفيذ ملف SQL الخاص بطلبات الحجز ثم أعد المحاولة." />;
  const rows = q.data ?? [];
  return <>
    <section className="stat-grid"><Stat icon={<Inbox />} label="طلبات جديدة" value={rows.filter((r) => r["status"] === "new").length} note="تنتظر الاتصال" /><Stat icon={<CalendarDays />} label="مؤكدة" value={rows.filter((r) => r["status"] === "confirmed").length} note="تم تأكيد موعدها" /></section>
    {msg && <div className="form-message">{msg}</div>}
    {rows.length ? <div className="form-stack">{rows.map((r) => { const st = bookingStatuses[r["status"]] ?? [r["status"], "scheduled"]; const wa = whatsappLink(r["phone"], `مرحباً ${r["full_name"]}، معك Alteesh Clinic بخصوص طلب موعدك.`); return <div className="panel" key={r["id"]} style={{ padding: 14 }}>
      <div className="record-row" style={{ borderTop: 0, paddingTop: 0 }}><div><strong>{r["full_name"]}</strong><span dir="ltr" style={{ textAlign: "right" }}>{r["phone"]}</span></div><span className={`status status-${st[1]}`}>{st[0]}</span></div>
      <div className="detail-grid"><Detail label="التاريخ المفضل" value={r["preferred_date"] ? fmtDay(r["preferred_date"]) : null} /><Detail label="الفترة" value={r["preferred_time"]} /><Detail label="سبب الزيارة" value={r["reason"]} /><Detail label="وصل الطلب" value={new Date(r["created_at"]).toLocaleString("ar-SY")} /></div>
      <div className="row-actions" style={{ marginTop: 10, flexWrap: "wrap" }}>
        <Button size="sm" variant="outline" asChild><a href={`tel:${r["phone"]}`}>اتصال</a></Button>
        {wa && <Button size="sm" variant="outline" asChild><a href={wa} target="_blank" rel="noreferrer"><MessageCircle /> واتساب</a></Button>}
        {r["status"] !== "contacted" && <Button size="sm" variant="ghost" onClick={() => setStatus(r["id"], "contacted")}>تم الاتصال</Button>}
        {r["status"] !== "confirmed" && <Button size="sm" variant="ghost" onClick={() => setStatus(r["id"], "confirmed")}>تأكيد</Button>}
        {r["status"] !== "declined" && <Button size="sm" variant="ghost" onClick={() => setStatus(r["id"], "declined")}>رفض</Button>}
        {hasPatient(r["phone"]) ? <small style={{ color: "var(--muted-foreground)" }}>له ملف في النظام</small> : <Button size="sm" onClick={() => makePatient(r)}>إنشاء ملف مريض</Button>}
        {isAdmin && <ConfirmDelete title="حذف الطلب" text="سيُحذف هذا الطلب نهائياً." onConfirm={() => remove(r["id"])} />}
      </div>
    </div>; })}</div> : <Empty title="لا توجد طلبات" text="ستظهر هنا الطلبات التي يرسلها الزوار من الصفحة العامة." />}
  </>;
}

/* ===================== سجل النشاط ===================== */
function ActivityLog({ data }: { data: ClinicData }) {
  const [table, setTable] = useState("");
  const q = useQuery({ queryKey: ["audit", table], queryFn: async () => { let req = sb.from("audit_log").select("*").order("at", { ascending: false }).limit(150); if (table) req = req.eq("table_name", table); const { data: rows, error } = await req; if (error) throw error; return (rows ?? []) as AnyRow[]; } });
  const who = (id?: string | null) => (id ? (data.profiles.find((p) => p.id === id)?.full_name ?? "مستخدم محذوف") : "النظام");
  return <div className="panel table-panel">
    <div className="form-grid" style={{ marginBottom: 10 }}><label>القسم<select value={table} onChange={(e) => setTable(e.target.value)}><option value="">كل الأقسام</option>{Object.entries(auditTables).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label></div>
    {q.isLoading ? <Loading /> : q.error ? <Empty title="تعذر تحميل السجل" text="تأكد من تنفيذ ملف SQL الخاص بسجل النشاط ثم أعد المحاولة." /> : !(q.data ?? []).length ? <Empty title="السجل فارغ" text="ستظهر هنا العمليات بعد تنفيذ ملف SQL ومباشرة العمل." /> :
      <table style={{ minWidth: 640 }}><thead><tr><th>الوقت</th><th>المستخدم</th><th>العملية</th><th>القسم</th><th>التفاصيل</th></tr></thead><tbody>{(q.data ?? []).map((r) => { const a = auditActions[r["action"]] ?? [r["action"], "scheduled"]; return <tr key={r["id"]}><td>{new Date(r["at"]).toLocaleString("ar-SY")}</td><td>{who(r["user_id"])}</td><td><span className={`status status-${a[1]}`}>{a[0]}</span></td><td>{auditTables[r["table_name"]] ?? r["table_name"]}</td><td style={{ maxWidth: 320 }}>{r["summary"] || "—"}</td></tr>; })}</tbody></table>}
  </div>;
}

function PatientSelect({data}:{data:Awaited<ReturnType<typeof loadClinic>>|undefined}){return <label>المريض<select name="patientId" required><option value="">اختر المريض</option>{data?.patients.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>}