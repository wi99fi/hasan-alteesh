import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Baby, Clock, HeartPulse, Mail, MapPin, MessageCircle, Phone, ShieldCheck, Smile, Sparkles, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/* نمط «هوية الشعار»: أزرق سماوي + كحلي + أزرق جليدي فاتح، بحدود عريضة كرسوم الشعار */
const CSS = `
.bp,.bp-scope{--n:#0b4768;--s:#66adcd;--c:#d9ecf6;--t:#f1f8fc;--ink:#062a40;--mut:#35566b}
.bp{color:var(--ink);background:#fff;color-scheme:light;min-height:100vh;overflow-x:hidden}
.bp *{box-sizing:border-box}
.bp h1,.bp h2,.bp h3{font-family:var(--font-display,inherit);color:var(--n);margin:0}
.bp a:focus-visible,.bp button:focus-visible{outline:3px solid var(--n);outline-offset:3px}
.bp-nav{position:sticky;top:0;z-index:40;background:var(--c);border-bottom:3px solid var(--n);display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 5vw}
.bp-nav img{height:58px;width:auto;display:block}
.bp-links{display:flex;gap:4px;flex-wrap:wrap}
.bp-links a{color:var(--n);font-weight:800;padding:8px 14px;border-radius:999px;text-decoration:none}
.bp-links a:hover{background:var(--s);color:var(--ink)}
.bp-btn{display:inline-flex;align-items:center;gap:8px;font-weight:800;font-size:15px;border:2.5px solid var(--n);border-radius:14px;padding:12px 20px;text-decoration:none;box-shadow:4px 4px 0 var(--n);transition:transform .12s,box-shadow .12s;cursor:pointer;font-family:inherit}
.bp-btn:hover{transform:translate(2px,2px);box-shadow:2px 2px 0 var(--n)}
.bp-btn.pri{background:var(--n);color:var(--c)}
.bp-btn.sec{background:var(--s);color:var(--ink)}
.bp-btn.ghost{background:#fff;color:var(--n)}
.bp-btn svg{width:18px;height:18px}
.bp-hero{background:var(--s);border-bottom:3px solid var(--n);overflow:hidden}
.bp-hero-in{display:grid;grid-template-columns:1.05fr 1fr;gap:40px;align-items:center;padding:56px 5vw;max-width:1200px;margin:0 auto}
.bp-pill{display:inline-block;background:var(--c);border:2.5px solid var(--n);border-radius:999px;padding:6px 16px;font-weight:800;color:var(--n);font-size:14px}
.bp-hero h1{font-size:clamp(34px,6vw,60px);line-height:1.2;margin:14px 0}
.bp-hero p{font-size:17px;line-height:1.95;color:var(--ink);margin:0 0 24px}
.bp-row{display:flex;gap:12px;flex-wrap:wrap}
.bp-chips{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}
.bp-chip{display:inline-flex;align-items:center;gap:8px;background:#fff;border:2.5px solid var(--n);border-radius:12px;padding:8px 12px;font-size:14px;font-weight:700;color:var(--ink)}
.bp-chip svg{width:16px;height:16px;color:var(--n);flex:none}
.bp-frame{border:3px solid var(--n);border-radius:28px;box-shadow:8px 8px 0 var(--n);background:#fff;overflow:hidden;transform:rotate(-1.5deg)}
.bp-frame img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}
.bp-sec{padding:64px 5vw;max-width:1200px;margin:0 auto}
.bp-sec h2{font-size:clamp(26px,4vw,38px)}
.bp-sec h2::after{content:"";display:block;width:70px;height:6px;border-radius:99px;background:var(--s);margin:10px 0 26px}
.bp-band{background:var(--c);border-block:3px solid var(--n)}
.bp-tint{background:var(--t);border-block:3px solid var(--n)}
.bp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px}
.bp-card{background:#fff;border:2.5px solid var(--n);border-radius:20px;padding:20px;box-shadow:5px 5px 0 var(--n);display:flex;gap:14px;align-items:center;font-weight:800;color:var(--n);line-height:1.7}
.bp-card.col{flex-direction:column;align-items:flex-start;font-weight:600;color:var(--ink)}
.bp-card.col strong{color:var(--n);display:flex;align-items:center;gap:8px;font-weight:800}
.bp-ico{flex:none;width:48px;height:48px;border-radius:14px;background:var(--c);border:2.5px solid var(--n);display:grid;place-items:center}
.bp-ico svg{width:24px;height:24px;color:var(--n)}
.bp-cases{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:22px}
.bp-case{background:#fff;border:2.5px solid var(--n);border-radius:22px;overflow:hidden;box-shadow:5px 5px 0 var(--n);cursor:zoom-in;padding:0;text-align:start;font:inherit;color:var(--ink)}
.bp-ba{display:grid;grid-template-columns:1fr 1fr;border-bottom:2.5px solid var(--n)}
.bp-ba figure{position:relative;margin:0}
.bp-ba figure+figure{border-inline-start:2.5px solid var(--n)}
.bp-ba img{width:100%;aspect-ratio:1/1;object-fit:cover;display:block}
.bp-tag{position:absolute;top:8px;inset-inline-start:8px;background:var(--c);border:2px solid var(--n);border-radius:999px;padding:2px 12px;font-size:12px;font-weight:800;color:var(--n)}
.bp-tag.after{background:var(--s);color:var(--ink)}
.bp-case-b{padding:14px 18px 18px}
.bp-case-b h3{font-size:18px}
.bp-case-b p{margin:6px 0 0;color:var(--mut);font-size:14px;line-height:1.8}
.bp-note{font-size:12.5px;color:var(--mut);margin-top:20px}
.bp-book{display:grid;grid-template-columns:1fr 1.1fr;gap:32px;align-items:start}
.bp-book .pub-card{background:#fff;border:2.5px solid var(--n);border-radius:20px;box-shadow:6px 6px 0 var(--n);padding:24px;max-width:none!important}
.bp-foot{background:var(--n);color:var(--c);padding:28px 5vw;text-align:center;border-top:3px solid var(--s);font-size:14px}
.bp-foot button{background:none;border:0;color:#cfe9f5;text-decoration:underline;cursor:pointer;font:inherit;margin-inline-start:10px}
.bp-wa{position:fixed;inset-block-end:18px;inset-inline-end:18px;z-index:50;width:56px;height:56px;border-radius:50%;background:var(--n);color:var(--c);border:3px solid var(--c);box-shadow:0 0 0 3px var(--n);display:grid;place-items:center}
.bp-wa svg{width:26px;height:26px}
.bp-lb{position:fixed;inset:0;z-index:100;background:rgba(6,42,64,.9);display:grid;place-items:center;padding:16px;overflow:auto;cursor:zoom-out}
.bp-lb-in{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(320px,90vw),1fr));gap:12px;max-width:1000px;width:100%}
.bp-lb img{width:100%;max-height:70vh;object-fit:contain;border-radius:12px;background:#fff}
@media(max-width:820px){.bp-links{display:none}.bp-hero-in,.bp-book{grid-template-columns:1fr}.bp-hero-in{padding:36px 5vw}.bp-frame{transform:none}.bp-sec{padding:44px 5vw}}
@media(prefers-reduced-motion:reduce){.bp-btn{transition:none}}
`;

export function BrandStyles() { return <style dangerouslySetInnerHTML={{ __html: CSS }} />; }

type CaseItem = { id: string; title: string; description: string | null; before_url: string; after_url: string };

/** قسم عرض الحالات (قبل/بعد). لا يظهر شيء إن لم توجد حالات. */
export function Cases({ classic = false, onCount }: { classic?: boolean; onCount?: (n: number) => void }) {
  const [items, setItems] = useState<CaseItem[]>([]);
  const [open, setOpen] = useState<CaseItem | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).rpc("get_public_clinic_cases");
      if (alive && Array.isArray(data)) { setItems(data as CaseItem[]); onCount?.(data.length); }
    })().catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [open]);
  if (!items.length) return null;
  const body = <>
    <h2>حالات من عيادتنا</h2>
    <div className="bp-cases">
      {items.map((it) => <button key={it.id} type="button" className="bp-case" onClick={() => setOpen(it)} aria-label={`عرض حالة ${it.title}`}>
        <div className="bp-ba">
          <figure><img src={it.before_url} alt={`${it.title} - قبل`} loading="lazy" /><span className="bp-tag">قبل</span></figure>
          <figure><img src={it.after_url} alt={`${it.title} - بعد`} loading="lazy" /><span className="bp-tag after">بعد</span></figure>
        </div>
        <div className="bp-case-b"><h3>{it.title}</h3>{it.description && <p>{it.description}</p>}</div>
      </button>)}
    </div>
    <p className="bp-note">تُنشر الصور بموافقة أصحابها، وتختلف النتائج من حالة لأخرى حسب وضع كل مريض.</p>
    {open && <div className="bp-lb" role="dialog" aria-modal="true" aria-label={open.title} onClick={() => setOpen(null)}>
      <div className="bp-lb-in"><img src={open.before_url} alt={`${open.title} - قبل`} /><img src={open.after_url} alt={`${open.title} - بعد`} /></div>
    </div>}
  </>;
  return classic ? <div className="bp-scope"><section className="pub-sec" id="cases">{body}</section></div> : <div className="bp-band"><section className="bp-sec" id="cases">{body}</section></div>;
}

const ICONS = [Sparkles, Stethoscope, Smile, ShieldCheck, Baby, HeartPulse];

type BrandProps = {
  name: string; logoSrc: string; heroSrc: string; description: string;
  services: string[]; hours: string[]; phone: string; wa: string; email: string; address: string;
  booking: ReactNode; gallery: ReactNode; onSwitch: () => void;
};

export function BrandHome(p: BrandProps) {
  const [hasCases, setHasCases] = useState(false);
  const maps = p.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}` : "";
  return <main className="bp" dir="rtl">
    <BrandStyles />
    <nav className="bp-nav">
      <Link to="/auth" aria-label={p.name} style={{ display: "inline-flex" }}><img src={p.logoSrc} alt={`شعار ${p.name}`} /></Link>
      <div className="bp-links"><a href="#services">خدماتنا</a>{hasCases && <a href="#cases">الحالات</a>}<a href="#book">احجز</a><a href="#visit">زورونا</a></div>
      <a className="bp-btn pri" href="#book">اطلب موعداً</a>
    </nav>
    <header className="bp-hero"><div className="bp-hero-in">
      <div>
        <span className="bp-pill">مرحباً بكم</span>
        <h1>{p.name}</h1>
        <p>{p.description}</p>
        <div className="bp-row">
          {p.wa && <a className="bp-btn ghost" href={`https://wa.me/${p.wa}`} target="_blank" rel="noreferrer"><MessageCircle />احجز عبر واتساب</a>}
          {p.phone && <a className="bp-btn sec" href={`tel:${p.phone}`}><Phone />اتصل بنا</a>}
        </div>
        <div className="bp-chips">
          {p.hours[0] && <span className="bp-chip"><Clock />{p.hours[0]}</span>}
          {p.address && <span className="bp-chip"><MapPin />{p.address}</span>}
        </div>
      </div>
      <div className="bp-frame"><img src={p.heroSrc} alt="عيادة الأسنان" /></div>
    </div></header>
    <section className="bp-sec" id="services">
      <h2>خدماتنا</h2>
      <div className="bp-grid">{p.services.map((s, i) => { const Icon = ICONS[i % ICONS.length]!; return <div key={s} className="bp-card"><span className="bp-ico"><Icon /></span>{s}</div>; })}</div>
    </section>
    <Cases onCount={(n) => setHasCases(n > 0)} />
    {p.gallery}
    <div className="bp-tint"><section className="bp-sec" id="book">
      <h2>اطلب موعداً</h2>
      <div className="bp-book">
        <div className="bp-card col"><strong>خطوتان فقط</strong>املأ النموذج وسنتصل بك لتأكيد الموعد المناسب.{p.wa && <a className="bp-btn sec" href={`https://wa.me/${p.wa}`} target="_blank" rel="noreferrer"><MessageCircle />أو راسلنا على واتساب</a>}</div>
        {p.booking}
      </div>
    </section></div>
    <section className="bp-sec" id="visit">
      <h2>زورونا</h2>
      <div className="bp-grid">
        <div className="bp-card col"><strong><Clock />ساعات العمل</strong>{p.hours.map((h) => <div key={h}>{h}</div>)}</div>
        {p.address && <div className="bp-card col"><strong><MapPin />العنوان</strong><div>{p.address}</div><a className="bp-btn ghost" href={maps} target="_blank" rel="noreferrer">افتح في الخرائط</a></div>}
        {(p.phone || p.email) && <div className="bp-card col"><strong><Mail />التواصل</strong>{p.phone && <div dir="ltr"><a href={`tel:${p.phone}`}>{p.phone}</a></div>}{p.email && <div dir="ltr"><a href={`mailto:${p.email}`}>{p.email}</a></div>}</div>}
      </div>
    </section>
    <footer className="bp-foot">© {new Date().getFullYear()} {p.name}<button type="button" onClick={p.onSwitch}>عرض النمط الكلاسيكي</button></footer>
    {p.wa && <a className="bp-wa" href={`https://wa.me/${p.wa}`} target="_blank" rel="noreferrer" aria-label="واتساب"><MessageCircle /></a>}
  </main>;
}
