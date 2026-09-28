import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Activity, CalendarDays, ChevronLeft, CircleDollarSign, FileText, HeartPulse, LayoutDashboard, LogOut, Menu, Palette, Plus, Search, Settings, ShieldAlert, Stethoscope, UserRound, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureClinicProfile, createClinicUser } from "@/lib/clinic.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import logo from "@/assets/alteesh-clinic-logo.png";

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
  invoices: ["super_admin", "admin", "receptionist"], reports: ["super_admin", "admin"],
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
    supabase.from("patients").select("*").order("created_at", { ascending: false }),
    supabase.from("appointments").select("*, patients(full_name), chairs(name)").order("starts_at"),
    supabase.from("profiles").select("*").order("full_name"), supabase.from("user_roles").select("*"),
    supabase.from("chairs").select("*").order("name"), supabase.from("invoices").select("*, patients(full_name)").order("created_at", { ascending: false }),
    supabase.from("clinic_settings").select("*").limit(1).maybeSingle(), supabase.from("treatments").select("*, patients(full_name)").order("treated_at", { ascending: false }),
    supabase.from("prescriptions").select("*, patients(full_name)").order("prescribed_at", { ascending: false }),
    supabase.from("dental_chart_entries").select("*, patients(full_name)").order("created_at", { ascending: false }),
    supabase.from("payments").select("*").order("paid_at", { ascending: false }),
  ]);
  const error = [patients, appointments, profiles, roles, chairs, invoices, settings, treatments, prescriptions, dentalChart, payments].find((r) => r.error)?.error;
  if (error) throw error;
  return { patients: patients.data ?? [], appointments: appointments.data ?? [], profiles: profiles.data ?? [], roles: roles.data ?? [], chairs: chairs.data ?? [], invoices: invoices.data ?? [], settings: settings.data, treatments: treatments.data ?? [], prescriptions: prescriptions.data ?? [], dentalChart: dentalChart.data ?? [], payments: payments.data ?? [] };
}

export function ClinicApp({ page }: { page: Page }) {
  const navigate = useNavigate(); const qc = useQueryClient(); const ensure = useServerFn(ensureClinicProfile);
  const [open, setOpen] = useState(false); const [menu, setMenu] = useState(false); const [search, setSearch] = useState(""); const [userId,setUserId]=useState<string>(); const [bootstrapped,setBootstrapped]=useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: ["clinic"], queryFn: loadClinic });
  useEffect(() => { supabase.auth.getUser().then(async ({ data: auth }) => { if (auth.user) { setUserId(auth.user.id); await ensure({ data: { fullName: String(auth.user.user_metadata?.["full_name"] ?? auth.user.email?.split("@")[0] ?? "مستخدم العيادة") } }); await qc.invalidateQueries({ queryKey: ["clinic"] }); } setBootstrapped(true); }); }, [ensure, qc]);
  const myRoles=(data?.roles.filter(r=>r.user_id===userId).map(r=>r.role)??[]) as Role[]; const allowed=pageRoles[page].some(role=>myRoles.includes(role));
  const me = data?.profiles.find((p) => p.id===userId);
  const settings = data?.settings; const title = titles[page];
  async function signOut() { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); await navigate({ to: "/auth", replace: true }); }
  return <div className="clinic-shell" dir="rtl" style={{ "--primary": settings?.primary_color, "--accent": settings?.accent_color } as React.CSSProperties}>
    {menu && <button className="mobile-scrim" aria-label="إغلاق القائمة" onClick={() => setMenu(false)} />}
    <aside className={`sidebar ${menu ? "sidebar-open" : ""}`}>
      <div className="brand"><img src={settings?.logo_url ?? logo} alt="شعار العيادة" /><div><strong>{settings?.clinic_name ?? "عيادة التيش"}</strong><span>نظام الإدارة الطبية</span></div><Button className="mobile-close" variant="ghost" size="icon" onClick={() => setMenu(false)}><X /></Button></div>
       <nav>{nav.filter(([id])=>pageRoles[id].some(role=>myRoles.includes(role))).map(([id, to, label, Icon]) => <Link key={id} to={to} className={`nav-link ${page === id ? "nav-link-active" : ""}`} onClick={() => setMenu(false)}><Icon /> <span>{label}</span></Link>)}</nav>
      <div className="sidebar-user"><div className="avatar">{me?.full_name?.slice(0, 1) ?? "م"}</div><div><strong>{me?.full_name ?? "مستخدم العيادة"}</strong><span>حساب نشط</span></div><Button variant="ghost" size="icon" onClick={signOut} title="تسجيل الخروج"><LogOut /></Button></div>
    </aside>
    <main className="app-main">
      <header className="topbar"><Button className="menu-button" variant="ghost" size="icon" onClick={() => setMenu(true)}><Menu /></Button><div className="global-search"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث سريع..." /></div><span className="today">{new Intl.DateTimeFormat("ar-SY", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</span></header>
      <div className="page-wrap"><PageHeading title={title[0]} subtitle={title[1]} action={page !== "dashboard" && page !== "reports" ? <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus /> إضافة جديد</Button></DialogTrigger><DialogContent dir="rtl" className="modal-card"><DialogHeader><DialogTitle>إضافة {title[0]}</DialogTitle></DialogHeader><CreateForm page={page} data={data ?? undefined} done={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["clinic"] }); }} /></DialogContent></Dialog> : undefined} />
      {isLoading || !data || !bootstrapped ? <Loading /> : error ? <Empty title="تعذر تحميل البيانات" text="تحقق من اتصالك ثم أعد المحاولة." /> : !allowed ? <div className="panel empty-state"><ShieldAlert/><h3>ليس لديك صلاحية لهذه الصفحة</h3><p>تواصل مع مدير العيادة إذا كنت تحتاج إلى الوصول.</p></div> : <PageBody page={page} data={data} search={search} />}</div>
    </main>
  </div>;
}

function PageHeading({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) { return <div className="page-heading"><div><span className="eyebrow">ALTEESH CLINIC</span><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>; }
function Loading() { return <div className="panel loading"><span /><span /><span /></div>; }
function Empty({ title, text }: { title: string; text: string }) { return <div className="panel empty-state"><HeartPulse /><h3>{title}</h3><p>{text}</p></div>; }
function money(n: number | string) { return `${Number(n).toLocaleString("ar-SY")} ل.س`; }

function PageBody({ page, data, search }: { page: Page; data: Awaited<ReturnType<typeof loadClinic>>; search: string }) {
  if (page === "dashboard") return <Dashboard data={data} />;
  if (page === "patients") return <Patients data={data} search={search} />;
  if (page === "appointments") return <Appointments data={data} />;
  if (page === "clinical") return <Clinical data={data} />;
  if (page === "invoices") return <Invoices data={data} />;
  if (page === "reports") return <Reports data={data} />;
  if (page === "team") return <Team data={data} />;
  return <SettingsPage data={data} />;
}

function Dashboard({ data }: { data: Awaited<ReturnType<typeof loadClinic>> }) {
  const today = new Date().toDateString(); const todays = data.appointments.filter((a) => new Date(a.starts_at).toDateString() === today); const paid = data.invoices.reduce((s, i) => s + Number(i.paid), 0);
  return <><section className="stat-grid"><Stat icon={<Users />} label="إجمالي المرضى" value={data.patients.length} note="ملف مسجل" /><Stat icon={<CalendarDays />} label="مواعيد اليوم" value={todays.length} note="موعد مجدول" /><Stat icon={<CircleDollarSign />} label="إجمالي المحصل" value={money(paid)} note="من الفواتير" /><Stat icon={<Stethoscope />} label="الفريق الطبي" value={data.profiles.length} note="عضو نشط" /></section><section className="dashboard-grid"><div className="panel"><SectionTitle title="مواعيد اليوم" link="/appointments" />{todays.length ? todays.slice(0,5).map((a) => <AppointmentRow key={a.id} row={a} />) : <Empty title="لا توجد مواعيد اليوم" text="يمكنك إضافة أول موعد من صفحة الجدول اليومي." />}</div><div className="panel"><SectionTitle title="آخر المرضى" link="/patients" />{data.patients.slice(0,5).map((p) => <div className="list-row" key={p.id}><div className="avatar avatar-coral">{p.full_name.slice(0,1)}</div><div><strong>{p.full_name}</strong><span>{p.phone ?? "لا يوجد رقم هاتف"}</span></div><ChevronLeft /></div>)}</div></section></>;
}
function Stat({ icon, label, value, note }: { icon: ReactNode; label: string; value: ReactNode; note: string }) { return <div className="stat-card"><div className="stat-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>; }
function SectionTitle({ title, link }: { title: string; link: string }) { return <div className="section-title"><h2>{title}</h2><Link to={link as "/patients"}>عرض الكل <ChevronLeft /></Link></div>; }
function AppointmentRow({ row }: { row: AnyRow }) { return <div className="appointment-row"><time>{new Date(row["starts_at"]).toLocaleTimeString("ar-SY", { hour: "2-digit", minute: "2-digit" })}</time><div><strong>{row["patients"]?.full_name ?? "مريض"}</strong><span>{row["reason"] ?? "زيارة عيادة"}</span></div><span className={`status status-${row["status"]}`}>{statusLabel(row["status"])}</span></div>; }
function statusLabel(s: string) { return ({ scheduled: "مجدول", confirmed: "مؤكد", in_progress: "قيد العلاج", completed: "مكتمل", cancelled: "ملغي", unpaid: "غير مدفوعة", partial: "جزئية", paid: "مدفوعة", draft: "مسودة" } as Record<string,string>)[s] ?? s; }

function Patients({ data, search }: { data: Awaited<ReturnType<typeof loadClinic>>; search: string }) { const rows = data.patients.filter((p) => p.full_name.includes(search) || p.phone?.includes(search) || p.file_number?.includes(search)); return <div className="panel table-panel">{rows.length ? <table><thead><tr><th>المريض</th><th>رقم الملف</th><th>الهاتف</th><th>تاريخ الميلاد</th><th>ملاحظات طبية</th></tr></thead><tbody>{rows.map((p) => <tr key={p.id}><td><div className="person"><div className="avatar">{p.full_name.slice(0,1)}</div><strong>{p.full_name}</strong></div></td><td>{p.file_number ?? "—"}</td><td>{p.phone ?? "—"}</td><td>{p.date_of_birth ?? "—"}</td><td>{p.allergies || p.chronic_diseases || "لا يوجد"}</td></tr>)}</tbody></table> : <Empty title="لا يوجد مرضى بعد" text="أضف أول ملف مريض للبدء." />}</div>; }
function Appointments({ data }: { data: Awaited<ReturnType<typeof loadClinic>> }) { return <div className="schedule-grid">{data.appointments.length ? data.appointments.map((a) => <div className="appointment-block" key={a.id}><time>{new Date(a.starts_at).toLocaleString("ar-SY", { weekday: "short", hour: "2-digit", minute: "2-digit" })}</time><h3>{a.patients?.full_name}</h3><p>{a.reason ?? "زيارة العيادة"}</p><div><span className={`status status-${a.status}`}>{statusLabel(a.status)}</span><small>{a.chairs?.name ?? "دون كرسي"}</small></div></div>) : <Empty title="الجدول فارغ" text="أضف موعداً جديداً لتظهر خطة اليوم." />}</div>; }
function Clinical({ data }: { data: Awaited<ReturnType<typeof loadClinic>> }) { return <div className="dashboard-grid"><div className="panel"><SectionTitle title="العلاجات الأخيرة" link="/clinical" />{data.treatments.map((t) => <div className="record-row" key={t.id}><Stethoscope /><div><strong>{t.title}</strong><span>{t.patients?.full_name} · الأسنان {t.tooth_numbers || "—"}</span></div><b>{money(t.cost)}</b></div>)}</div><div className="panel"><SectionTitle title="الوصفات الأخيرة" link="/clinical" />{data.prescriptions.map((p) => <div className="record-row" key={p.id}><FileText /><div><strong>{p.medication}</strong><span>{p.patients?.full_name} · {p.dosage ?? "حسب الوصفة"}</span></div></div>)}</div><div className="panel"><SectionTitle title="سجل الأسنان" link="/clinical" />{data.dentalChart.map((d) => <div className="record-row" key={d.id}><span className="avatar">{d.tooth_number}</span><div><strong>{d.condition}</strong><span>{d.patients?.full_name} · {d.treatment ?? "دون إجراء"}</span></div></div>)}</div></div>; }
function Invoices({ data }: { data: Awaited<ReturnType<typeof loadClinic>> }) { return <div className="panel table-panel"><table><thead><tr><th>رقم الفاتورة</th><th>المريض</th><th>الإجمالي</th><th>المدفوع</th><th>الحالة</th></tr></thead><tbody>{data.invoices.map((i) => <tr key={i.id}><td>{i.invoice_number}</td><td>{i.patients?.full_name}</td><td>{money(i.total)}</td><td>{money(i.paid)}</td><td><span className={`status status-${i.status}`}>{statusLabel(i.status)}</span></td></tr>)}</tbody></table>{!data.invoices.length && <Empty title="لا توجد فواتير" text="أنشئ أول فاتورة لمريض." />}<p className="subheading">الدفعات المسجلة: {data.payments.length}</p></div>; }
function Reports({ data }: { data: Awaited<ReturnType<typeof loadClinic>> }) { const billed=data.invoices.reduce((s,i)=>s+Number(i.total),0), paid=data.invoices.reduce((s,i)=>s+Number(i.paid),0); return <><section className="stat-grid"><Stat icon={<CircleDollarSign />} label="إجمالي الفواتير" value={money(billed)} note="القيمة الصادرة"/><Stat icon={<Activity />} label="المحصل" value={money(paid)} note="دفعات مسجلة"/><Stat icon={<FileText />} label="المتبقي" value={money(billed-paid)} note="ذمم مفتوحة"/><Stat icon={<CalendarDays />} label="المواعيد المكتملة" value={data.appointments.filter(a=>a.status==='completed').length} note="زيارة مكتملة"/></section><div className="panel chart"><h2>توزيع حالة المواعيد</h2>{["completed","confirmed","scheduled","cancelled"].map(s=><div className="bar-row" key={s}><span>{statusLabel(s)}</span><div><i style={{width:`${Math.max(4,data.appointments.length ? data.appointments.filter(a=>a.status===s).length/data.appointments.length*100:4)}%`}} /></div><b>{data.appointments.filter(a=>a.status===s).length}</b></div>)}</div></>; }
function Team({ data }: { data: Awaited<ReturnType<typeof loadClinic>> }) { return <><div className="team-grid">{data.profiles.map((p) => <article className="team-card" key={p.id}><div className="avatar avatar-lg">{p.full_name.slice(0,1)}</div><h3>{p.full_name}</h3><p>{p.specialty || "فريق العيادة"}</p><span className="status status-confirmed">نشط</span></article>)}</div><h2 className="subheading">كراسي العيادة</h2><div className="chair-grid">{data.chairs.map(c=><div className="chair-tile" key={c.id}><span className="chair-dot" style={{backgroundColor:c.color}}/><strong>{c.name}</strong><small>{c.is_active?'متاح':'غير نشط'}</small></div>)}</div></>; }

function SettingsPage({ data }: { data: Awaited<ReturnType<typeof loadClinic>> }) {
  const qc=useQueryClient(); const [saved,setSaved]=useState("");
  async function save(e:FormEvent<HTMLFormElement>){e.preventDefault(); const f=new FormData(e.currentTarget); const {data:{user}}=await supabase.auth.getUser(); if(!user)return; let logoUrl:string|null=data.settings?.logo_url??null; const file=f.get('logo'); if(file instanceof File&&file.size){const path=`${user.id}/${Date.now()}-${file.name}`; const up=await supabase.storage.from('clinic-branding').upload(path,file); if(!up.error){const signed=await supabase.storage.from('clinic-branding').createSignedUrl(path,60*60*24*365); logoUrl=signed.data?.signedUrl??logoUrl;}} const payload={clinic_name:String(f.get('clinicName')),primary_color:String(f.get('primary')),accent_color:String(f.get('accent')),phone:String(f.get('phone')),email:String(f.get('email')),address:String(f.get('address')),logo_url:logoUrl,updated_by:user.id,updated_at:new Date().toISOString()}; const res=data.settings?await supabase.from('clinic_settings').update(payload).eq('id',data.settings.id):await supabase.from('clinic_settings').insert(payload); setSaved(res.error?res.error.message:'تم حفظ هوية العيادة بنجاح'); qc.invalidateQueries({queryKey:['clinic']});}
  return <form className="settings-grid" onSubmit={save}><section className="panel form-stack"><h2><Palette/> الهوية البصرية</h2><label>اسم العيادة<Input name="clinicName" defaultValue={data.settings?.clinic_name}/></label><label>الشعار<Input name="logo" type="file" accept="image/png,image/jpeg,image/webp"/></label><div className="color-fields"><label>اللون الأساسي<Input name="primary" type="color" defaultValue={data.settings?.primary_color}/></label><label>اللون المساند<Input name="accent" type="color" defaultValue={data.settings?.accent_color}/></label></div></section><section className="panel form-stack"><h2>بيانات التواصل</h2><label>الهاتف<Input name="phone" defaultValue={data.settings?.phone??''}/></label><label>البريد<Input name="email" type="email" defaultValue={data.settings?.email??''}/></label><label>العنوان<Textarea name="address" defaultValue={data.settings?.address??''}/></label>{saved&&<div className="form-message">{saved}</div>}<Button size="lg">حفظ التغييرات</Button></section></form>;
}

function CreateForm({ page, data, done }: { page: Page; data: Awaited<ReturnType<typeof loadClinic>> | undefined; done: () => void }) {
  const createUser=useServerFn(createClinicUser); const [message,setMessage]=useState("");
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault(); const f=new FormData(e.currentTarget); const {data:{user}}=await supabase.auth.getUser(); if(!user)return; let error:unknown;
    if(page==='patients'){({error}=await supabase.from('patients').insert({full_name:String(f.get('fullName')),file_number:String(f.get('fileNumber'))||null,phone:String(f.get('phone'))||null,date_of_birth:String(f.get('birth'))||null,allergies:String(f.get('allergies'))||null,chronic_diseases:String(f.get('chronic'))||null,created_by:user.id}));}
    else if(page==='appointments'){const start=new Date(String(f.get('startsAt'))); ({error}=await supabase.from('appointments').insert({patient_id:String(f.get('patientId')),doctor_id:String(f.get('doctorId'))||null,chair_id:String(f.get('chairId'))||null,starts_at:start.toISOString(),ends_at:new Date(start.getTime()+30*60000).toISOString(),reason:String(f.get('reason')),created_by:user.id}));}
    else if(page==='clinical'){const kind=String(f.get('kind')); if(kind==='prescription')({error}=await supabase.from('prescriptions').insert({patient_id:String(f.get('patientId')),doctor_id:user.id,medication:String(f.get('title')),dosage:String(f.get('details'))})); else if(kind==='dental')({error}=await supabase.from('dental_chart_entries').insert({patient_id:String(f.get('patientId')),tooth_number:Number(f.get('toothNumber')),condition:String(f.get('title')),treatment:String(f.get('details'))||null,recorded_by:user.id})); else ({error}=await supabase.from('treatments').insert({patient_id:String(f.get('patientId')),doctor_id:user.id,title:String(f.get('title')),tooth_numbers:String(f.get('details')),cost:Number(f.get('cost')||0)}));}
    else if(page==='invoices'){const kind=String(f.get('kind')); if(kind==='payment'){({error}=await supabase.from('payments').insert({invoice_id:String(f.get('invoiceId')),amount:Number(f.get('amount')||0),method:String(f.get('method')),received_by:user.id}));} else {const total=Number(f.get('total')||0); ({error}=await supabase.from('invoices').insert({patient_id:String(f.get('patientId')),invoice_number:`INV-${Date.now().toString().slice(-7)}`,subtotal:total,total,created_by:user.id}));}}
    else if(page==='team'){try{await createUser({data:{email:String(f.get('email')),password:String(f.get('password')),fullName:String(f.get('fullName')),phone:String(f.get('phone')),specialty:String(f.get('specialty')),role:String(f.get('role')) as 'doctor'}});}catch(e){error=e;}}
    else if(page==='settings'){({error}=await supabase.from('chairs').insert({name:String(f.get('name')),color:String(f.get('color'))}));}
    if(error){setMessage(error instanceof Error?error.message:String((error as AnyRow)?.["message"]??error));return;} done();}
  return <form className="form-stack" onSubmit={submit}>
    {page==='patients'&&<><label>اسم المريض<Input name="fullName" required/></label><div className="form-grid"><label>رقم الملف<Input name="fileNumber"/></label><label>الهاتف<Input name="phone"/></label></div><label>تاريخ الميلاد<Input name="birth" type="date"/></label><label>الحساسية<Textarea name="allergies"/></label><label>الأمراض المزمنة<Textarea name="chronic"/></label></>}
    {page==='appointments'&&<><PatientSelect data={data}/><label>الطبيب<select name="doctorId"><option value="">دون تحديد</option>{data?.profiles.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label><label>الكرسي<select name="chairId"><option value="">دون تحديد</option>{data?.chairs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>التاريخ والوقت<Input name="startsAt" type="datetime-local" required/></label><label>سبب الزيارة<Input name="reason" required/></label></>}
    {page==='clinical'&&<><PatientSelect data={data}/><label>نوع السجل<select name="kind"><option value="treatment">علاج</option><option value="prescription">وصفة</option><option value="dental">سجل سن</option></select></label><label>العلاج أو الدواء أو الحالة<Input name="title" required/></label><label>الأسنان أو الجرعة أو الإجراء<Input name="details"/></label><label>رقم السن (لسجل الأسنان)<Input name="toothNumber" type="number" min="11" max="85"/></label><label>التكلفة<Input name="cost" type="number" min="0"/></label></>}
    {page==='invoices'&&<><label>نوع العملية<select name="kind"><option value="invoice">فاتورة جديدة</option><option value="payment">تسجيل دفعة</option></select></label><PatientSelect data={data}/><label>الفاتورة (عند تسجيل دفعة)<select name="invoiceId"><option value="">اختر الفاتورة</option>{data?.invoices.map(i=><option key={i.id} value={i.id}>{i.invoice_number}</option>)}</select></label><label>إجمالي الفاتورة<Input name="total" type="number" min="0"/></label><label>مبلغ الدفعة<Input name="amount" type="number" min="1"/></label><label>طريقة الدفع<select name="method"><option value="cash">نقداً</option><option value="card">بطاقة</option><option value="transfer">تحويل</option></select></label></>}
    {page==='team'&&<><label>الاسم الكامل<Input name="fullName" required/></label><label>البريد<Input name="email" type="email" required/></label><label>كلمة مرور مؤقتة<Input name="password" type="password" minLength={8} required/></label><label>الهاتف<Input name="phone"/></label><label>التخصص<Input name="specialty"/></label><label>الدور<select name="role"><option value="doctor">طبيب</option><option value="nurse">ممرض</option><option value="receptionist">استقبال</option><option value="admin">مدير</option></select></label></>}
    {page==='settings'&&<><label>اسم الكرسي<Input name="name" required/></label><label>لون الكرسي<Input name="color" type="color" defaultValue="#287f7b"/></label></>}
    {message&&<div className="form-message">{message}</div>}<Button size="lg">حفظ</Button>
  </form>;
}
function PatientSelect({data}:{data:Awaited<ReturnType<typeof loadClinic>>|undefined}){return <label>المريض<select name="patientId" required><option value="">اختر المريض</option>{data?.patients.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>}