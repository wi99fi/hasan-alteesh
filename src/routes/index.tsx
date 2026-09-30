import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, MapPin, Phone, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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

function PublicHome() {
  const c = Route.useLoaderData() as Record<string, unknown> | null;
  const name = String(c?.["clinic_name"] ?? "Alteesh Clinic");
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
          {wa && <Button asChild size="lg"><a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"><MessageCircle />احجز عبر واتساب</a></Button>}
          {phone && <Button asChild size="lg" variant="outline"><a href={`tel:${phone}`}><Phone />اتصل بنا</a></Button>}
        </div>
      </div>
      <img src={c?.["hero_image_url"] ? String(c["hero_image_url"]) : hero} alt="عيادة الأسنان" />
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
