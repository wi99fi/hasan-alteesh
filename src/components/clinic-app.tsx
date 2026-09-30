import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Activity, CalendarDays, ChevronLeft, CircleDollarSign, FileText, HeartPulse, LayoutDashboard, LogOut, Menu, Palette, Plus, Search, Settings, ShieldAlert, Stethoscope, UserRound, MessageCircle, Download, Users, X, Eye, Pencil, Trash2 } from "lucide-react";
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

type Page = "dashboard" | "patients" | "appointments" | "clinical" | "invoices" | "reports" | "team" | "settings";
type AnyRow = Record<string, any>;
type Role = "super_admin" | "admin" | "doctor" | "nurse" | "receptionist";

const nav = [
  ["dashboard", "/dashboard", "نظرة عامة", LayoutDashboard], ["appointments", "/appointments", "الجدول اليومي", CalendarDays],
  ["patients", "/patients", "المرضى", Users], ["clinical", "/clinical", "العلاجات والوصفات", Stethoscope],
  ["invoices", "/invoices", "الفواتير", FileText], ["reports", "/reports", "التقارير", Activity],
  ["team", "/team", "الفريق والكراسي", UserRound], ["settings", "/settings", "إعدادات العيادة", Settings],
] as const;

const pageRoles: Record<Page, Role[]> = {
  dashboard: ["super_admin", "admin", "doctor", "nurse", "receptionist"],
  patients: ["super_admin", "admin", "doctor", "nurse", "receptionist"],
  appointments: ["super_admin", "admin", "doctor", "nurse", "receptionist"],
  clinical: ["super_admin", "admin", "doctor", "nurse"],
  invoices: ["super_admin", "admin", "receptionist", "doctor"], reports: ["super_admin", "admin"],
  team: ["super_admin", "admin"], settings: ["super_admin", "admin"],
};

const titles: Record<Page, [string, string]> = {
  dashboard: ["نظرة عامة", "ملخص نشاط العيادة اليوم"], patients: ["المرضى", "الملفات والسجل الطبي"],
  appointments: ["الجدول اليومي", "تنظيم المواعيد والكراسي"], clinical: ["العلاجات والوصفات", "متابعة الرعاية السريرية"],
  invoices: ["الفواتير", "المدفوعات والأرصدة"], reports: ["التقارير", "مؤشرات الأداء المالي والتشغيلي"],
  team: ["الفريق والكراسي", "إدارة أعضاء الفريق ومساحات العمل"], settings: ["إعدادات العيادة", "الهوية وبيانات التواصل"],
};

async function loadClinic() {
  const [patients, appointments, profiles, roles, chairs, invoices, settings, treatments, prescriptions, dentalChart, payments] = await Promise.all([
    supabase.from("patients").select("*").eq("is_active", true).order("created_at", { ascending: false }),
    supabase.from("appointments").select("*, patients(full_name), chairs(name)").order("starts_at"),
    supabase.from("profiles").select("*").order("full_name"), supabase.from("user_roles").select("*"),
    supabase.from("chairs").select("*").order("name"), supabase.from("invoices").select("*, patients(full_name)").order("created_at", { ascending: false }),
    supabase.from("clinic_settings").select("*").limit(1).maybeSingle(), supabase.from("treatments").select("*, patients(full_name)").order("treated_at", { ascending: false }),
    supabase.from("prescriptions").select("*, patients(full_name)").order("prescribed_at", { ascending: false }),
    supabase.from("dental_chart_entries").select("*, patients(full_name)").order("created_at", { ascending: false }),
    supabase.from("payments").select("*").order("paid_at", { ascending: false }),
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

export function ClinicApp({ page }: { page: Page }) {
  const navigate = useNavigate(); const qc = useQueryClient(); const ensure = useServerFn(ensureClinicProfile);
  const [open, setOpen] = useState(false); const [menu, setMenu] = useState(false); const [search, setSearch] = useState(""); const [userId,setUserId]=useState<string>(); const [bootstrapped,setBootstrapped]=useState(false);
  const [theme,setTheme]=useState<"classic"|"alt">("classic");
  useEffect(()=>{ try{ if(localStorage.getItem("clinic-theme")==="alt"){ setTheme("alt"); document.documentElement.dataset["theme"]="alt"; } }catch{ /* التخزين غير متاح */ } },[]);
  function switchTheme(){ const next=theme==="alt"?"classic":"alt"; setTheme(next); if(next==="alt") document.documentElement.dataset["theme"]="alt"; else delete document.documentElement.dataset["theme"]; try{ localStorage.setItem("clinic-theme",next); }catch{ /* التخزين غير متاح */ } }
  const { data, isLoading, error } = useQuery({ queryKey: ["clinic"], queryFn: loadClinic });
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
      <header className="topbar"><Button className="menu-button" variant="ghost" size="icon" onClick={() => setMenu(true)}><Menu /></Button><div className="global-search"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث سريع..." /></div><span className="today">{new Intl.DateTimeFormat("ar-SY", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</span><Button type="button" variant="outline" size="sm" onClick={switchTheme} title="تبديل نمط الواجهة"><Palette /> {theme==="alt"?"النمط الأول":"النمط الثاني"}</Button><div className="topbar-user"><div className="topbar-identity"><strong>{me?.full_name ?? "مستخدم العيادة"}</strong><span>{myRoles[0] ? roleLabel(myRoles[0]) : ""}</span></div><div className="avatar avatar-coral">{me?.full_name?.slice(0, 1) ?? "م"}</div></div></header>
      <div className="page-wrap"><PageHeading title={title[0]} subtitle={title[1]} action={page === "dashboard" ? <Link to="/appointments" className="heading-action"><CalendarDays /> فتح جدول المواعيد</Link> : page !== "reports" && !(page === "invoices" && !myRoles.some((r) => ["super_admin", "admin", "receptionist"].includes(r))) ? <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus /> إضافة جديد</Button></DialogTrigger><DialogContent dir="rtl" className="modal-card"><DialogHeader><DialogTitle>إضافة {title[0]}</DialogTitle></DialogHeader><CreateForm page={page} data={data ?? undefined} done={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["clinic"] }); qc.invalidateQueries({ queryKey: ["occupancy"] }); }} /></DialogContent></Dialog> : undefined} />
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
    <Dialog open={!!view} onOpenChange={(open) => !open && setView(null)}><DialogContent dir="rtl" className="modal-card modal-wide"><DialogHeader><DialogTitle>الملف الطبي — {view?.full_name}</DialogTitle></DialogHeader>{view && <PatientProfile patient={view} data={data} />}</DialogContent></Dialog>
    <Dialog open={!!edit} onOpenChange={(open) => !open && setEdit(null)}><DialogContent dir="rtl" className="modal-card"><DialogHeader><DialogTitle>تعديل ملف {edit?.full_name}</DialogTitle></DialogHeader>{edit && <PatientEditForm patient={edit} done={() => { setEdit(null); qc.invalidateQueries({ queryKey: ["clinic"] }); }} />}</DialogContent></Dialog>
    <Dialog open={!!dental} onOpenChange={(open) => !open && setDental(null)}><DialogContent dir="rtl" className="modal-card modal-wide"><DialogHeader><DialogTitle>مخطط أسنان {dental?.full_name}</DialogTitle></DialogHeader>{dental && <DentalChart patient={dental} entries={data.dentalChart} canEdit={clinical} />}</DialogContent></Dialog>
  </>;
}

type PatientTab = "treatments" | "prescriptions" | "invoices" | "teeth";
const methodLabel = (m: string) => ({ cash: "نقداً", card: "بطاقة", transfer: "تحويل" } as Record<string, string>)[m] ?? m;
const fmtDay = (v?: string | null) => (v ? new Date(v).toLocaleDateString("ar-SY") : "—");

function PatientProfile({ patient, data }: { patient: AnyRow; data: Awaited<ReturnType<typeof loadClinic>> }) {
  const [tab, setTab] = useState<PatientTab>("treatments");
  const [toothFilter, setToothFilter] = useState("");
  const pid = patient["id"];
  const docName = (id?: string | null) => data.profiles.find((p) => p.id === id)?.full_name ?? "—";
  const treatments = data.treatments.filter((t) => t.patient_id === pid);
  const prescriptions = data.prescriptions.filter((p) => p.patient_id === pid);
  const invoices = data.invoices.filter((i) => i.patient_id === pid);
  const chart = data.dentalChart.filter((d) => d.patient_id === pid);
  const billed = invoices.reduce((s, i) => s + Number(i.total), 0);
  const paid = invoices.reduce((s, i) => s + Number(i.paid), 0);
  const remaining = Math.max(0, billed - paid);
  const latestByTooth = new Map<number, AnyRow>();
  chart.forEach((d) => { if (!latestByTooth.has(d.tooth_number)) latestByTooth.set(d.tooth_number, d); });
  const teeth = [...latestByTooth.values()].sort((a, b) => a.tooth_number - b.tooth_number);
  const shownTreatments = toothFilter.trim() ? treatments.filter((t) => String(t.tooth_numbers ?? "").includes(toothFilter.trim())) : treatments;
  const tabs: [PatientTab, string, number][] = [["treatments", "العلاجات", treatments.length], ["prescriptions", "الوصفات", prescriptions.length], ["invoices", "الفواتير والدفعات", invoices.length], ["teeth", "حالة الأسنان", teeth.length]];
  const wide = { minWidth: 520 } as React.CSSProperties;
  return <div className="patient-profile">
    <div className="patient-identity"><div className="avatar avatar-lg">{String(patient["full_name"]).slice(0, 1)}</div><div><h2>{patient["full_name"]}</h2><span>ملف رقم {patient["file_number"] || "—"}</span></div></div>
    <div className="detail-grid"><Detail label="الهاتف" value={patient["phone"]} /><Detail label="تاريخ الميلاد" value={patient["date_of_birth"]} /><Detail label="الحساسية" value={patient["allergies"]} /><Detail label="الأمراض المزمنة" value={patient["chronic_diseases"]} /><Detail label="العمليات السابقة" value={patient["surgeries"]} /><Detail label="ملاحظات" value={patient["medical_notes"]} /></div>
    <div className="detail-grid"><Detail label="إجمالي الفواتير" value={money(billed)} /><Detail label="المدفوع" value={money(paid)} /><Detail label="المتبقي على المريض" value={remaining > 0 ? money(remaining) : "مسدد بالكامل"} /></div>
    <div role="tablist" style={{ marginTop: 6 }}>{tabs.map(([id, label, count]) => <button key={id} type="button" role="tab" data-state={tab === id ? "active" : "inactive"} onClick={() => setTab(id)}>{label} ({count})</button>)}</div>
    {tab === "treatments" && <div>
      <label className="form-stack" style={{ margin: "10px 0" }}><span style={{ fontSize: 12, fontWeight: 600 }}>تصفية برقم السن</span><Input value={toothFilter} onChange={(e) => setToothFilter(e.target.value)} placeholder="مثال: 16" style={{ maxWidth: 160 }} /></label>
      {shownTreatments.length ? <div className="table-panel"><table style={wide}><thead><tr><th>التاريخ</th><th>السن</th><th>العلاج</th><th>الطبيب</th><th>التكلفة</th></tr></thead><tbody>{shownTreatments.map((t) => <tr key={t.id}><td>{fmtDay(t.treated_at)}</td><td>{t.tooth_numbers || "—"}</td><td>{t.title}{t.diagnosis ? <small style={{ display: "block", color: "var(--muted-foreground)" }}>{t.diagnosis}</small> : null}</td><td>{docName(t.doctor_id)}</td><td>{money(t.cost)}</td></tr>)}<tr><td colSpan={4}><strong>مجموع العلاجات</strong></td><td><strong>{money(shownTreatments.reduce((s, t) => s + Number(t.cost), 0))}</strong></td></tr></tbody></table></div> : <Empty title="لا توجد علاجات" text={toothFilter ? "لا نتائج لهذا السن." : "لم تُسجَّل علاجات لهذا المريض بعد."} />}
    </div>}
    {tab === "prescriptions" && (prescriptions.length ? <div className="table-panel"><table style={wide}><thead><tr><th>التاريخ</th><th>الدواء</th><th>الجرعة</th><th>الطبيب</th></tr></thead><tbody>{prescriptions.map((p) => <tr key={p.id}><td>{fmtDay(p.prescribed_at)}</td><td>{p.medication}</td><td>{p.dosage || "—"}{p.instructions ? <small style={{ display: "block", color: "var(--muted-foreground)" }}>{p.instructions}</small> : null}</td><td>{docName(p.doctor_id)}</td></tr>)}</tbody></table></div> : <Empty title="لا توجد وصفات" text="لم تُكتب وصفات لهذا المريض بعد." />)}
    {tab === "invoices" && (invoices.length ? <div className="form-stack">{invoices.map((i: AnyRow) => { const pays = data.payments.filter((py) => py.invoice_id === i.id); const rest = Math.max(0, Number(i.total) - Number(i.paid)); return <div className="panel" key={i.id} style={{ padding: 14 }}>
      <div className="record-row" style={{ borderTop: 0, paddingTop: 0 }}><div><strong>{i.invoice_number}</strong><span>{fmtDay(i.issued_at)}{i.doctor_id ? ` · ${docName(i.doctor_id)}` : ""}</span></div><span className={`status status-${i.status}`}>{statusLabel(i.status)}</span></div>
      <div className="detail-grid"><Detail label="الإجمالي" value={money(i.total)} /><Detail label="الحسم" value={Number(i.discount) ? money(i.discount) : "—"} /><Detail label="المدفوع" value={money(i.paid)} /><Detail label="المتبقي" value={rest > 0 ? money(rest) : "مسدد"} /></div>
      {pays.length ? <div style={{ marginTop: 8 }}>{pays.map((py) => <div className="list-row" key={py.id}><div><strong>{money(py.amount)}</strong><span>{methodLabel(py.method)} · {new Date(py.paid_at).toLocaleString("ar-SY")}</span></div></div>)}</div> : <small style={{ color: "var(--muted-foreground)" }}>لا توجد دفعات على هذه الفاتورة.</small>}
    </div>; })}</div> : <Empty title="لا توجد فواتير" text="لا فواتير مسجلة لهذا المريض، أو أن دورك لا يتيح رؤيتها." />)}
    {tab === "teeth" && (teeth.length ? <div className="table-panel"><table style={wide}><thead><tr><th>السن (FDI)</th><th>آخر حالة</th><th>الإجراء</th><th>التاريخ</th></tr></thead><tbody>{teeth.map((d) => <tr key={d.id}><td><strong>{d.tooth_number}</strong></td><td>{d.condition}</td><td>{d.treatment || "—"}</td><td>{fmtDay(d.created_at)}</td></tr>)}</tbody></table></div> : <Empty title="لا توجد سجلات أسنان" text="سجّل حالة الأسنان من زر «الأسنان» في قائمة المرضى." />)}
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
function Invoices({ data, myRoles }: { data: Awaited<ReturnType<typeof loadClinic>>; myRoles: Role[] }) {
  const doctorOnly = !myRoles.some((r) => ["super_admin", "admin", "receptionist"].includes(r));
  const docName = (id?: string | null) => data.profiles.find((p) => p.id === id)?.full_name ?? "—";
  return <>
    {doctorOnly && <FinanceReport admin={false} />}
    <div className="panel table-panel"><table><thead><tr><th>رقم الفاتورة</th><th>المريض</th><th>الطبيب</th><th>الإجمالي</th><th>الحسم</th><th>المدفوع</th><th>الحالة</th></tr></thead><tbody>{data.invoices.map((i: AnyRow) => <tr key={i.id}><td>{i.invoice_number}</td><td>{i.patients?.full_name}</td><td>{docName(i.doctor_id)}</td><td>{money(i.total)}</td><td>{Number(i.discount) ? money(i.discount) : "—"}</td><td>{money(i.paid)}</td><td><span className={`status status-${i.status}`}>{statusLabel(i.status)}</span></td></tr>)}</tbody></table>{!data.invoices.length && <Empty title="لا توجد فواتير" text={doctorOnly ? "ستظهر هنا فواتير ودفعات مرضاك." : "أنشئ أول فاتورة لمريض."} />}<p className="subheading">الدفعات المسجلة: {data.payments.length}</p></div>
  </>;
}
function Reports({ data }: { data: Awaited<ReturnType<typeof loadClinic>> }) { const billed=data.invoices.reduce((s,i)=>s+Number(i.total),0), paid=data.invoices.reduce((s,i)=>s+Number(i.paid),0); return <><div className="row-actions" style={{marginBottom:16}}><Button onClick={()=>exportExcel(data)}><Download/> تصدير نسخة احتياطية (Excel)</Button></div><section className="stat-grid"><Stat icon={<CircleDollarSign />} label="إجمالي الفواتير" value={money(billed)} note="القيمة الصادرة"/><Stat icon={<Activity />} label="المحصل" value={money(paid)} note="دفعات مسجلة"/><Stat icon={<FileText />} label="المتبقي" value={money(billed-paid)} note="ذمم مفتوحة"/><Stat icon={<CalendarDays />} label="المواعيد المكتملة" value={data.appointments.filter(a=>a.status==='completed').length} note="زيارة مكتملة"/></section><div className="panel chart"><h2>توزيع حالة المواعيد</h2>{["completed","confirmed","scheduled","cancelled"].map(s=><div className="bar-row" key={s}><span>{statusLabel(s)}</span><div><i style={{width:`${Math.max(4,data.appointments.length ? data.appointments.filter(a=>a.status===s).length/data.appointments.length*100:4)}%`}} /></div><b>{data.appointments.filter(a=>a.status===s).length}</b></div>)}</div><FinanceReport admin /></>; }
function Team({ data, myId }: { data: Awaited<ReturnType<typeof loadClinic>>; myId?: string | undefined }) { const qc=useQueryClient();const [err,setErr]=useState("");const updateUser=useServerFn(updateClinicUser);const deleteUser=useServerFn(deleteClinicUser);const [edit,setEdit]=useState<AnyRow|null>(null);const roleFor=(id:string)=>(data.roles.find(r=>r.user_id===id)?.role??"doctor") as Role;async function remove(id:string){setErr("");try{await deleteUser({data:{id}});}catch(e){setErr(e instanceof Error?e.message:"تعذر الحذف");}await qc.invalidateQueries({queryKey:["clinic"]});}return <>{err&&<div className="form-message" style={{marginBottom:12}}>{err}</div>}<div className="team-grid">{data.profiles.map((p) => <article className="team-card" key={p.id}><div className="avatar avatar-lg">{p.full_name.slice(0,1)}</div><h3>{p.full_name}</h3><p>{p.specialty || "فريق العيادة"}</p>{roleFor(p.id)==="doctor"&&<small>نسبة الطبيب: {Number(data.doctorShares.find((x:AnyRow)=>x.doctor_id===p.id)?.percent??0)}%</small>}{roleFor(p.id)==="super_admin"?<span className="status status-protected">المدير العام - محمي</span>:<span className="status status-confirmed">{roleLabel(roleFor(p.id))}</span>}{roleFor(p.id)!=="super_admin"&&p.id!==myId&&<div className="team-actions"><Button size="icon" variant="ghost" title="تعديل" onClick={()=>setEdit({...p,role:roleFor(p.id),doctorPercent:Number(data.doctorShares.find((x:AnyRow)=>x.doctor_id===p.id)?.percent??0)})}><Pencil/></Button><ConfirmDelete title="حذف ملف الطبيب" text="سيُحذف حساب الدخول وملف عضو الفريق نهائيًا، مع بقاء السجلات الطبية السابقة." onConfirm={()=>remove(p.id)}/></div>}</article>)}</div><Dialog open={!!edit} onOpenChange={(o)=>!o&&setEdit(null)}><DialogContent dir="rtl" className="modal-card"><DialogHeader><DialogTitle>تعديل ملف عضو الفريق</DialogTitle></DialogHeader>{edit&&<TeamEditForm member={edit} save={async(values)=>{const {doctorPercent,...rest}=values;await updateUser({data:rest});if(rest.role==="doctor"){const r=await sb.from("doctor_shares").upsert({doctor_id:rest.id,percent:doctorPercent,updated_at:new Date().toISOString()});if(r.error)throw new Error(r.error.message);}setEdit(null);await qc.invalidateQueries({queryKey:["clinic"]});}}/>}</DialogContent></Dialog><h2 className="subheading">كراسي العيادة</h2><div className="chair-grid">{data.chairs.map(c=><div className="chair-tile" key={c.id}><span className="chair-dot" style={{backgroundColor:c.color}}/><strong>{c.name}</strong><small>{c.is_active?'متاح':'غير نشط'}</small></div>)}</div></>; }
function roleLabel(role:Role){return({super_admin:"مدير عام",admin:"مدير",doctor:"طبيب",nurse:"ممرض",receptionist:"استقبال"} as Record<Role,string>)[role]}
function TeamEditForm({member,save}:{member:AnyRow;save:(values:{id:string;fullName:string;phone?:string;specialty?:string;role:Exclude<Role,"super_admin">;doctorPercent:number})=>Promise<void>}){const [message,setMessage]=useState("");async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);try{await save({id:String(member["id"]),fullName:String(f.get("fullName")).trim(),phone:String(f.get("phone")),specialty:String(f.get("specialty")),role:String(f.get("role")) as Exclude<Role,"super_admin">,doctorPercent:Number(f.get("doctorPercent")||0)})}catch(error){setMessage(error instanceof Error?error.message:"تعذر حفظ التعديلات")}}return <form className="form-stack" onSubmit={submit}><label>الاسم الكامل<Input name="fullName" required maxLength={120} defaultValue={member["full_name"]}/></label><label>الهاتف<Input name="phone" maxLength={30} defaultValue={member["phone"]||""}/></label><label>التخصص<Input name="specialty" maxLength={120} defaultValue={member["specialty"]||""}/></label><label>الدور<select name="role" defaultValue={member["role"]}><option value="doctor">طبيب</option><option value="nurse">ممرض</option><option value="receptionist">استقبال</option><option value="admin">مدير</option></select></label><label>نسبة الطبيب % من المبالغ المحصّلة (للأطباء فقط)<Input name="doctorPercent" type="number" min="0" max="100" step="0.5" defaultValue={member["doctorPercent"]??0}/></label>{message&&<div className="form-message">{message}</div>}<Button size="lg">حفظ التعديلات</Button></form>}

function SettingsPage({ data }: { data: Awaited<ReturnType<typeof loadClinic>> }) {
  const qc=useQueryClient(); const [saved,setSaved]=useState("");
  async function save(e:FormEvent<HTMLFormElement>){e.preventDefault(); const f=new FormData(e.currentTarget); const {data:{user}}=await supabase.auth.getUser(); if(!user)return; let logoUrl:string|null=data.settings?.logo_url??null; const file=f.get('logo'); if(file instanceof File&&file.size){const path=`${user.id}/${Date.now()}-${file.name}`; const up=await supabase.storage.from('clinic-branding').upload(path,file); if(!up.error){const signed=await supabase.storage.from('clinic-branding').createSignedUrl(path,60*60*24*365); logoUrl=signed.data?.signedUrl??logoUrl;}} const payload={clinic_name:String(f.get('clinicName')),primary_color:String(f.get('primary')),accent_color:String(f.get('accent')),phone:String(f.get('phone')),email:String(f.get('email')),address:String(f.get('address')),logo_url:logoUrl,font_family:String(f.get('fontFamily')||'formal'),interface_density:String(f.get('density')||'comfortable'),public_description:String(f.get('description')||'')||null,public_services:String(f.get('services')||'')||null,opening_hours:String(f.get('hours')||'')||null,updated_by:user.id,updated_at:new Date().toISOString()}; const res=data.settings?await supabase.from('clinic_settings').update(payload).eq('id',data.settings.id):await supabase.from('clinic_settings').insert(payload); setSaved(res.error?res.error.message:'تم حفظ هوية العيادة بنجاح'); qc.invalidateQueries({queryKey:['clinic']});}
  return <><form className="settings-grid" onSubmit={save}><section className="panel form-stack"><h2><Palette/> الهوية البصرية</h2><label>اسم العيادة<Input name="clinicName" value="Alteesh Clinic" readOnly/></label><label>الشعار<Input name="logo" type="file" accept="image/png,image/jpeg,image/webp"/></label><div className="color-fields"><label>اللون الأساسي<Input name="primary" type="color" defaultValue={data.settings?.primary_color}/></label><label>اللون المساند<Input name="accent" type="color" defaultValue={data.settings?.accent_color}/></label></div><label>الخط<select name="fontFamily" defaultValue={data.settings?.font_family??"formal"}><option value="formal">رسمي أنيق</option><option value="modern">عصري واضح</option></select></label><label>كثافة الواجهة<select name="density" defaultValue={data.settings?.interface_density??"comfortable"}><option value="comfortable">مريحة</option><option value="compact">مدمجة</option></select></label></section><section className="panel form-stack"><h2>صفحة العرض والتواصل</h2><label>نبذة العيادة<Textarea name="description" maxLength={1000} defaultValue={data.settings?.public_description??''}/></label><label>الخدمات (خدمة في كل سطر)<Textarea name="services" maxLength={1000} defaultValue={data.settings?.public_services??''}/></label><label>ساعات العمل<Input name="hours" maxLength={200} defaultValue={data.settings?.opening_hours??''}/></label><label>الهاتف<Input name="phone" maxLength={30} defaultValue={data.settings?.phone??''}/></label><label>البريد<Input name="email" type="email" maxLength={255} defaultValue={data.settings?.email??''}/></label><label>العنوان<Textarea name="address" maxLength={500} defaultValue={data.settings?.address??''}/></label>{saved&&<div className="form-message">{saved}</div>}<Button size="lg">حفظ التغييرات</Button></section></form><PricesManager data={data} /><FinanceSettings data={data} /></>;
}

function CreateForm({ page, data, done }: { page: Page; data: Awaited<ReturnType<typeof loadClinic>> | undefined; done: () => void }) {
  const createUser=useServerFn(createClinicUser); const [message,setMessage]=useState("");
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault(); const f=new FormData(e.currentTarget); const {data:{user}}=await supabase.auth.getUser(); if(!user)return; let error:unknown;
    if(page==='patients'){({error}=await supabase.from('patients').insert({full_name:String(f.get('fullName')),file_number:String(f.get('fileNumber'))||null,phone:String(f.get('phone'))||null,date_of_birth:String(f.get('birth'))||null,allergies:String(f.get('allergies'))||null,chronic_diseases:String(f.get('chronic'))||null,created_by:user.id}));}
    else if(page==='appointments'){const start=new Date(String(f.get('startsAt'))); ({error}=await supabase.from('appointments').insert({patient_id:String(f.get('patientId')),doctor_id:String(f.get('doctorId'))||null,chair_id:String(f.get('chairId'))||null,starts_at:start.toISOString(),ends_at:new Date(start.getTime()+Number(f.get('duration')||30)*60000).toISOString(),reason:String(f.get('reason')),created_by:user.id}));}
    else if(page==='clinical'){const kind=String(f.get('kind')); if(kind==='prescription')({error}=await supabase.from('prescriptions').insert({patient_id:String(f.get('patientId')),doctor_id:user.id,medication:String(f.get('title')),dosage:String(f.get('details'))})); else if(kind==='dental')({error}=await supabase.from('dental_chart_entries').insert({patient_id:String(f.get('patientId')),tooth_number:Number(f.get('toothNumber')),condition:String(f.get('title')),treatment:String(f.get('details'))||null,recorded_by:user.id})); else ({error}=await supabase.from('treatments').insert({patient_id:String(f.get('patientId')),doctor_id:user.id,title:String(f.get('title')),tooth_numbers:String(f.get('details')),cost:Number(f.get('cost')||0)}));}
    else if(page==='invoices'){const kind=String(f.get('kind')); if(kind==='payment'){({error}=await supabase.from('payments').insert({invoice_id:String(f.get('invoiceId')),amount:Number(f.get('amount')||0),method:String(f.get('method')),received_by:user.id}));} else {const subtotal=Math.max(0,Number(f.get('subtotal')||0)); const dv=Math.max(0,Number(f.get('discountValue')||0)); const discount=Math.min(subtotal,String(f.get('discountKind'))==='percent'?subtotal*dv/100:dv); const total=subtotal-discount; ({error}=await sb.from('invoices').insert({patient_id:String(f.get('patientId')),doctor_id:String(f.get('doctorId'))||null,invoice_number:`INV-${Date.now().toString().slice(-7)}`,subtotal,discount,total,created_by:user.id}));}}
    else if(page==='team'){try{const created=await createUser({data:{email:String(f.get('email')),password:String(f.get('password')),fullName:String(f.get('fullName')),phone:String(f.get('phone')),specialty:String(f.get('specialty')),role:String(f.get('role')) as 'doctor'}});const pct=Number(f.get('doctorPercent')||0);if(created?.id&&String(f.get('role'))==='doctor'&&pct>0){const r=await sb.from('doctor_shares').upsert({doctor_id:created.id,percent:pct});if(r.error)error=r.error;}}catch(e){error=e;}}
    else if(page==='settings'){({error}=await supabase.from('chairs').insert({name:String(f.get('name')),color:String(f.get('color'))}));}
    if(error){setMessage(error instanceof Error?error.message:String((error as AnyRow)?.["message"]??error));return;} done();}
  return <form className="form-stack" onSubmit={submit}>
    {page==='patients'&&<><label>اسم المريض<Input name="fullName" required/></label><div className="form-grid"><label>رقم الملف<Input name="fileNumber"/></label><label>الهاتف<Input name="phone"/></label></div><label>تاريخ الميلاد<Input name="birth" type="date"/></label><label>الحساسية<Textarea name="allergies"/></label><label>الأمراض المزمنة<Textarea name="chronic"/></label></>}
    {page==='appointments'&&<><PatientSelect data={data}/><label>الطبيب<select name="doctorId"><option value="">دون تحديد</option>{data?.profiles.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label><label>الكرسي<select name="chairId"><option value="">دون تحديد</option>{data?.chairs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><div className="form-grid"><label>التاريخ والوقت<Input name="startsAt" type="datetime-local" step={900} required/></label><label>مدة الموعد<select name="duration" defaultValue="30"><option value="15">15 دقيقة</option><option value="30">30 دقيقة</option><option value="45">45 دقيقة</option><option value="60">ساعة</option><option value="90">ساعة ونصف</option><option value="120">ساعتان</option></select></label></div><label>سبب الزيارة<Input name="reason" required/></label></>}
    {page==='clinical'&&<><PatientSelect data={data}/><label>نوع السجل<select name="kind"><option value="treatment">علاج</option><option value="prescription">وصفة</option><option value="dental">سجل سن</option></select></label>{(data?.prices ?? []).some((x:AnyRow)=>x.is_active)&&<label>من قائمة الأسعار (اختياري)<select defaultValue="" onChange={(e)=>{const f=e.currentTarget.form; const pr=data?.prices.find((x:AnyRow)=>x.id===e.currentTarget.value); if(f&&pr){(f.elements.namedItem("title") as HTMLInputElement).value=pr.name;(f.elements.namedItem("cost") as HTMLInputElement).value=String(pr.default_price);}}}><option value="">اختر علاجاً</option>{data?.prices.filter((x:AnyRow)=>x.is_active).map((x:AnyRow)=><option key={x.id} value={x.id}>{x.name} — {money(x.default_price)}</option>)}</select></label>}<label>العلاج أو الدواء أو الحالة<Input name="title" required/></label><label>الأسنان أو الجرعة أو الإجراء<Input name="details"/></label><label>رقم السن (لسجل الأسنان)<Input name="toothNumber" type="number" min="11" max="85"/></label><label>التكلفة<Input name="cost" type="number" min="0"/></label></>}
    {page==='invoices'&&<><label>نوع العملية<select name="kind"><option value="invoice">فاتورة جديدة</option><option value="payment">تسجيل دفعة</option></select></label><PatientSelect data={data}/><label>الفاتورة (عند تسجيل دفعة)<select name="invoiceId"><option value="">اختر الفاتورة</option>{data?.invoices.map(i=><option key={i.id} value={i.id}>{i.invoice_number}</option>)}</select></label><InvoiceFields data={data}/><label>مبلغ الدفعة<Input name="amount" type="number" min="1"/></label><label>طريقة الدفع<select name="method"><option value="cash">نقداً</option><option value="card">بطاقة</option><option value="transfer">تحويل</option></select></label></>}
    {page==='team'&&<><label>الاسم الكامل<Input name="fullName" required/></label><label>البريد<Input name="email" type="email" required/></label><label>كلمة مرور مؤقتة<Input name="password" type="password" minLength={8} required/></label><label>الهاتف<Input name="phone"/></label><label>التخصص<Input name="specialty"/></label><label>الدور<select name="role"><option value="doctor">طبيب</option><option value="nurse">ممرض</option><option value="receptionist">استقبال</option><option value="admin">مدير</option></select></label><label>نسبة الطبيب % (للأطباء فقط)<Input name="doctorPercent" type="number" min="0" max="100" step="0.5" defaultValue="0"/></label></>}
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
  const prices = (data?.prices ?? []).filter((x: AnyRow) => x.is_active);
  return <>
    <label>الطبيب المعالج (يُحسب على أساسه نصيبه)<select name="doctorId"><option value="">دون تحديد</option>{doctors.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>
    {prices.length > 0 && <label>أضف علاجاً من قائمة الأسعار<select value="" onChange={(e) => { const pr = prices.find((x: AnyRow) => x.id === e.target.value); if (pr) setSubtotal((v) => v + num(pr.default_price)); }}><option value="">اختر علاجاً ليُضاف إلى المبلغ</option>{prices.map((x: AnyRow) => <option key={x.id} value={x.id}>{x.name} — {money(x.default_price)}</option>)}</select></label>}
    <label>المبلغ قبل الحسم<Input name="subtotal" type="number" min="0" value={subtotal || ""} onChange={(e) => setSubtotal(num(e.target.value))} /></label>
    <div className="form-grid">
      <label>نوع الحسم<select name="discountKind" value={kind} onChange={(e) => setKind(e.target.value as "percent" | "amount")}><option value="percent">نسبة %</option><option value="amount">مبلغ ثابت</option></select></label>
      <label>قيمة الحسم<Input name="discountValue" type="number" min="0" value={value || ""} onChange={(e) => setValue(num(e.target.value))} /></label>
    </div>
    <p className="subheading">الحسم: {money(discount)} — الإجمالي بعد الحسم: {money(subtotal - discount)}</p>
  </>;
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
    {data.prices.length ? <div className="table-panel"><table><thead><tr><th>العلاج</th><th>السعر</th><th>الحالة</th><th></th></tr></thead><tbody>{data.prices.map((p: AnyRow) => <tr key={`${p.id}-${p.default_price}`}><td>{p.name}</td><td><Input type="number" min="0" defaultValue={p.default_price} style={{ maxWidth: 130 }} onBlur={(e) => { const v = num(e.currentTarget.value); if (v !== Number(p.default_price)) update(p.id, { default_price: v }); }} /></td><td><Button type="button" size="sm" variant="outline" onClick={() => update(p.id, { is_active: !p.is_active })}>{p.is_active ? "فعّال" : "معطّل"}</Button></td><td><ConfirmDelete title="حذف العلاج من القائمة" text="يُحذف من قائمة الأسعار فقط، ولا تتأثر الفواتير والعلاجات السابقة." onConfirm={() => remove(p.id)} /></td></tr>)}</tbody></table></div> : <p className="subheading">لا توجد أسعار بعد. أضف أول علاج من النموذج أعلاه.</p>}
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
    <div className="form-grid"><label>نسبة العيادة %<Input name="clinic" type="number" min="0" max="100" step="0.5" defaultValue={data.finance?.clinic_share_percent ?? 0} /></label><label>نسبة المواد %<Input name="materials" type="number" min="0" max="100" step="0.5" defaultValue={data.finance?.materials_share_percent ?? 0} /></label></div>
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
        <tbody>{(rows ?? []).map((r) => <tr key={r.doctor_id}>{admin && <td>{r.doctor_name}</td>}<td>{money(r.revenue)}</td><td>{money(r.doctor_share)}</td>{admin && <td>{money(r.clinic_share)}</td>}{admin && <td>{money(r.materials_share)}</td>}</tr>)}
          {admin && <tr><td><strong>المجموع</strong></td><td><strong>{money(sum("revenue"))}</strong></td><td><strong>{money(sum("doctor_share"))}</strong></td><td><strong>{money(sum("clinic_share"))}</strong></td><td><strong>{money(sum("materials_share"))}</strong></td></tr>}</tbody></table>}
  </div>;
}

function PatientSelect({data}:{data:Awaited<ReturnType<typeof loadClinic>>|undefined}){return <label>المريض<select name="patientId" required><option value="">اختر المريض</option>{data?.patients.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>}