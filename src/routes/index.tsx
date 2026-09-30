import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, MapPin, Phone, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getPublicClinic } from "@/lib/public-clinic.functions";
import logo from "@/assets/alteesh-clinic-logo.png";
import hero from "@/assets/clinic-public-hero.jpg";

export const Route = createFileRoute("/")({
  loader: () => getPublicClinic().catch(() => null),
  head: () => ({ meta: [
    { title: "Alteesh Clinic — رعاية أسنان بثقة" },
    { name: "description", content: "Alteesh Clinic لطب الأسنان: خدماتنا، ساعات العمل، وطرق التواصل وحجز المواعيد." },
    { property: "og:title", content: "Alteesh Clinic — رعاية أسنان بثقة" },
    { property: "og:description", content: "Alteesh Clinic لطب الأسنان: خدماتنا، ساعات العمل، وطرق التواصل." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  errorComponent: () => <div className="pub-sec">تعذر تحميل الصفحة</div>,
  notFoundComponent: () => <div className="pub-sec">غير موجود</div>,
  component: PublicHome,
});

function lines(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  return String(v ?? "").split(/\n|،|,/).map((s) => s.trim()).filter(Boolean);
}

function BookingForm({ services }: { services: string[] }) {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError("");
    const f = new FormData(e.currentTarget);
    if (String(f.get("website") ?? "")) { setState("done"); return; } // حقل مخفي لصدّ الروبوتات
    const name = String(f.get("fullName") ?? "").trim(); const phone = String(f.get("phone") ?? "").trim();
    if (name.length < 2) { setError("اكتب اسمك الكامل"); return; }
    if (phone.replace(/\D/g, "").length < 6) { setError("اكتب رقم هاتف صحيحاً"); return; }
    setState("sending");
    const reason = [String(f.get("service") ?? ""), String(f.get("reason") ?? "").trim()].filter(Boolean).join(" — ").slice(0, 500);
    const { error: err } = await supabase.from("booking_requests" as never).insert({
      full_name: name.slice(0, 120), phone: phone.slice(0, 30), preferred_date: String(f.get("date") ?? "") || null,
      preferred_time: String(f.get("period") ?? "") || null, reason: reason || null,
    } as never);
    if (err) { setState("idle"); setError(err.message.includes("row-level") || err.message.includes("relation") ? "تعذر إرسال الطلب حالياً، يرجى الاتصال بالعيادة." : err.message); return; }
    setState("done");
  }
  if (state === "done") return <div className="pub-card"><strong>وصلنا طلبك</strong><div>سنتصل بك قريباً على رقمك لتأكيد الموعد. شكراً لثقتك بنا.</div></div>;
  return <form className="pub-card" onSubmit={submit} style={{ display: "grid", gap: 12, maxWidth: 560 }}>
    <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0 }} />
    <label>الاسم الكامل<Input name="fullName" required maxLength={120} /></label>
    <label>رقم الهاتف<Input name="phone" type="tel" required maxLength={30} dir="ltr" /></label>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      <label>التاريخ المناسب<Input name="date" type="date" min={today} /></label>
      <label>الفترة<select name="period" defaultValue=""><option value="">لا تفضيل</option><option value="صباحاً">صباحاً</option><option value="بعد الظهر">بعد الظهر</option><option value="مساءً">مساءً</option></select></label>
    </div>
    <label>الخدمة المطلوبة<select name="service" defaultValue=""><option value="">اختر الخدمة (اختياري)</option>{services.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
    <label>ملاحظات (اختياري)<Textarea name="reason" maxLength={400} /></label>
    {error && <div className="form-message">{error}</div>}
    <Button size="lg" disabled={state === "sending"}>{state === "sending" ? "جارٍ الإرسال..." : "أرسل طلب الموعد"}</Button>
    <small style={{ color: "var(--muted-foreground)" }}>الطلب لا يعني تأكيد الموعد؛ ستتصل بك العيادة للتأكيد.</small>
  </form>;
}

function PublicHome() {
  const c = Route.useLoaderData() as Record<string, unknown> | null;
  const name = "Alteesh Clinic";
  const services = lines(c?.["public_services"]);
  const hours = lines(c?.["opening_hours"]);
  const phone = c?.["phone"] ? String(c["phone"]) : "";
  const wa = phone.replace(/\D/g, "").replace(/^0/, "963");
  return <main className="pub" dir="rtl">
    <nav className="pub-nav">
      <img src={c?.["logo_url"] ? String(c["logo_url"]) : logo} alt={`شعار ${name}`} />
      <Button asChild variant="outline"><Link to="/auth">دخول الموظفين</Link></Button>
    </nav>
    <section className="pub-hero">
      <div>
        <span className="eyebrow">مرحباً بكم</span>
        <h1>{name}</h1>
        <p>{String(c?.["public_description"] ?? "") || "رعاية متكاملة لصحة أسنانكم بأحدث التقنيات وفريق طبي متخصص في بيئة مريحة وآمنة."}</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button asChild size="lg"><a href="#book">اطلب موعداً</a></Button>
          {wa && <Button asChild size="lg" variant="outline"><a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"><MessageCircle />احجز عبر واتساب</a></Button>}
          {phone && <Button asChild size="lg" variant="outline"><a href={`tel:${phone}`}><Phone />اتصل بنا</a></Button>}
        </div>
      </div>
      <img src={c?.["hero_image_url"] ? String(c["hero_image_url"]) : hero} alt="عيادة الأسنان" />
    </section>
    <section className="pub-sec" id="book">
      <h2>اطلب موعداً</h2>
      <BookingForm services={services} />
    </section>
    <section className="pub-sec">
      <h2>خدماتنا</h2>
      <div className="pub-grid">{(services.length ? services : ["فحص وتنظيف الأسنان", "حشوات تجميلية", "علاج العصب", "تركيبات وتيجان", "زراعة الأسنان", "طب أسنان الأطفال"]).map((s) => <div key={s} className="pub-card"><strong>{s}</strong></div>)}</div>
    </section>
    <section className="pub-sec">
      <h2>زورونا</h2>
      <div className="pub-grid">
        <div className="pub-card"><Clock /> <strong>ساعات العمل</strong>{(hours.length ? hours : ["السبت – الخميس: 9 صباحاً – 8 مساءً"]).map((h) => <div key={h}>{h}</div>)}</div>
        {!!c?.["address"] && <div className="pub-card"><MapPin /> <strong>العنوان</strong><div>{String(c["address"])}</div></div>}
        {(phone || !!c?.["email"]) && <div className="pub-card"><Mail /> <strong>التواصل</strong>{phone && <div dir="ltr">{phone}</div>}{!!c?.["email"] && <div dir="ltr">{String(c["email"])}</div>}</div>}
      </div>
    </section>
    <footer className="pub-foot">© {new Date().getFullYear()} {name}</footer>
  </main>;
}
