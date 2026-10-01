import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, MapPin, Phone, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getPublicClinic } from "@/lib/public-clinic.functions";
import logo from "@/assets/alteesh-clinic-logo.png";
import hero from "@/assets/clinic-public-hero.jpg";
import { BrandHome, BrandStyles, Cases } from "@/components/public-brand";

export const Route = createFileRoute("/")({
  loader: () => getPublicClinic().catch(() => null),
  head: () => ({ meta: [
    { title: "Alteesh Clinic — رعاية أسنان بثقة" },
    { name: "description", content: "Alteesh Clinic لطب الأسنان: خدماتنا، ساعات العمل، وطرق التواصل وحجز المواعيد." },
    { property: "og:title", content: "Alteesh Clinic — رعاية أسنان بثقة" },
    { property: "og:description", content: "Alteesh Clinic لطب الأسنان: خدماتنا، ساعات العمل، وطرق التواصل." },
    { property: "og:type", content: "website" }, { property: "og:image", content: "https://alteesh.lovable.app/og-image.png" }, { property: "og:image:width", content: "1200" }, { property: "og:image:height", content: "630" }, { name: "twitter:card", content: "summary_large_image" }, { name: "twitter:image", content: "https://alteesh.lovable.app/og-image.png" },
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

type GalleryItem = { id: string; image_url: string; caption: string | null };

function Gallery({ brand = false }: { brand?: boolean }) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [open, setOpen] = useState<GalleryItem | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from("clinic_gallery").select("id,image_url,caption").order("sort_order", { ascending: true }).order("created_at", { ascending: false }).limit(24);
      if (alive && Array.isArray(data)) setItems(data as GalleryItem[]);
    })().catch(() => {});
    return () => { alive = false; };
  }, []);
  if (!items.length) return null;
  return <section className={brand ? "bp-sec" : "pub-sec"} id="gallery">
    <h2>معرض الصور</h2>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
      {items.map((it) => <button key={it.id} type="button" onClick={() => setOpen(it)} aria-label={it.caption || "عرض الصورة"} style={{ padding: 0, border: 0, background: "none", cursor: "zoom-in", textAlign: "inherit" }}>
        <img src={it.image_url} alt={it.caption || "صورة من العيادة"} loading="lazy" style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 12, display: "block", border: brand ? "2.5px solid #0b4768" : undefined }} />
        {it.caption && <small style={{ display: "block", marginTop: 6, color: "var(--muted-foreground)" }}>{it.caption}</small>}
      </button>)}
    </div>
    {open && <div role="dialog" aria-modal="true" onClick={() => setOpen(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", display: "grid", placeItems: "center", zIndex: 100, padding: 16, cursor: "zoom-out" }}>
      <figure style={{ margin: 0, textAlign: "center" }}>
        <img src={open.image_url} alt={open.caption || "صورة من العيادة"} style={{ maxWidth: "92vw", maxHeight: "82vh", objectFit: "contain", borderRadius: 8 }} />
        {open.caption && <figcaption style={{ color: "#fff", marginTop: 10 }}>{open.caption}</figcaption>}
      </figure>
    </div>}
  </section>;
}

function PublicHome() {
  const c = Route.useLoaderData() as Record<string, unknown> | null;
  const name = "Alteesh Clinic";
  const services = lines(c?.["public_services"]);
  const hours = lines(c?.["opening_hours"]);
  const phone = c?.["phone"] ? String(c["phone"]) : "";
  const wa = phone.replace(/\D/g, "").replace(/^0/, "963");
  const description = String(c?.["public_description"] ?? "") || "رعاية متكاملة لصحة أسنانكم بأحدث التقنيات وفريق طبي متخصص في بيئة مريحة وآمنة.";
  const shownServices = services.length ? services : ["فحص وتنظيف الأسنان", "حشوات تجميلية", "علاج العصب", "تركيبات وتيجان", "زراعة الأسنان", "طب أسنان الأطفال"];
  const shownHours = hours.length ? hours : ["السبت – الخميس: 9 صباحاً – 8 مساءً"];
  // النمط الافتراضي يحدده المدير من الإعدادات؛ والزائر يستطيع التبديل مؤقتاً أو عبر ?style=
  const adminStyle = (c as Record<string, unknown> | null)?.["public_style"] === "classic" ? "classic" : "brand";
  const [mode, setMode] = useState<"brand" | "classic">(adminStyle);
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("style");
      if (q === "classic" || q === "brand") setMode(q);
    } catch { /* تجاهل */ }
  }, []);
  function choose(m: "brand" | "classic") { setMode(m); window.scrollTo({ top: 0 }); }
  if (mode === "brand") return <BrandHome name={name} logoSrc={c?.["logo_url"] ? String(c["logo_url"]) : logo} heroSrc={c?.["hero_image_url"] ? String(c["hero_image_url"]) : hero}
    description={description} services={shownServices} hours={shownHours} phone={phone} wa={wa} email={c?.["email"] ? String(c["email"]) : ""} address={c?.["address"] ? String(c["address"]) : ""}
    booking={<BookingForm services={services} />} gallery={<Gallery brand />} onSwitch={() => choose("classic")} />;
  return <main className="pub" dir="rtl">
    <nav className="pub-nav">
      <Link to="/auth" aria-label={name} style={{ display: "inline-flex", cursor: "pointer" }}><img src={c?.["logo_url"] ? String(c["logo_url"]) : logo} alt={`شعار ${name}`} /></Link>
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
    <BrandStyles />
    <Cases classic />
    <Gallery />
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
    <footer className="pub-foot">© {new Date().getFullYear()} {name} <button type="button" onClick={() => choose("brand")} style={{ marginInlineStart: 10, textDecoration: "underline", background: "none", border: 0, cursor: "pointer", color: "inherit", font: "inherit" }}>عرض نمط الشعار</button></footer>
  </main>;
}
