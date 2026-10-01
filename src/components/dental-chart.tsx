import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

export const conditions = [
  { id: "سليم", color: "#2f9e6f" }, { id: "تسوس", color: "#d9822b" }, { id: "حشوة", color: "#3b7dd8" },
  { id: "علاج عصب", color: "#8a4fbf" }, { id: "تاج", color: "#c9a227" }, { id: "كسر", color: "#d64545" },
  { id: "مفقود", color: "#6b7280" }, { id: "زرعة", color: "#0f766e" }, { id: "بحاجة خلع", color: "#9f1239" },
];
const colorOf = (c: string) => conditions.find((x) => x.id === c)?.color ?? "#287f7b";

const adult = { upper: [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28], lower: [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38] };
const child = { upper: [55,54,53,52,51,61,62,63,64,65], lower: [85,84,83,82,81,71,72,73,74,75] };

export function whatsappLink(phone: string | null | undefined, text: string) {
  if (!phone) return null;
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2); else if (d.startsWith("0")) d = "963" + d.slice(1);
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}

function DentalChartClassic({ patient, entries, canEdit }: { patient: AnyRow; entries: AnyRow[]; canEdit: boolean }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"adult" | "child">("adult");
  const [tooth, setTooth] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const mine = entries.filter((e) => e.patient_id === patient.id);
  const latest = (n: number) => mine.find((e) => e.tooth_number === n);
  const set = mode === "adult" ? adult : child;

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!tooth) return;
    const f = new FormData(e.currentTarget); const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    const condition = String(f.get("condition"));
    const { error } = await supabase.from("dental_chart_entries").insert({ patient_id: patient.id, tooth_number: tooth, condition, treatment: String(f.get("treatment")) || null, color: colorOf(condition), recorded_by: user.id });
    if (error) { setMsg(error.message); return; }
    setMsg("تم حفظ حالة السن"); e.currentTarget.reset(); qc.invalidateQueries({ queryKey: ["clinic"] });
  }

  const Tooth = ({ n }: { n: number }) => { const l = latest(n); return (
    <button type="button" className={`tooth ${tooth === n ? "tooth-active" : ""}`} onClick={() => { setTooth(n); setMsg(""); }} title={l?.condition ?? "لا يوجد سجل"}
      style={l ? { backgroundColor: colorOf(l.condition), color: "white", borderColor: colorOf(l.condition) } : undefined}>{n}</button>); };

  return <div className="dental-chart" dir="rtl">
    <div className="chart-tabs"><Button type="button" size="sm" variant={mode === "adult" ? "default" : "outline"} onClick={() => setMode("adult")}>أسنان دائمة</Button><Button type="button" size="sm" variant={mode === "child" ? "default" : "outline"} onClick={() => setMode("child")}>أسنان لبنية</Button></div>
    <div className="jaw" dir="ltr"><span className="jaw-label">الفك العلوي</span><div className="tooth-row">{set.upper.map((n) => <Tooth key={n} n={n} />)}</div><div className="tooth-row">{set.lower.map((n) => <Tooth key={n} n={n} />)}</div><span className="jaw-label">الفك السفلي</span></div>
    <div className="legend">{conditions.map((c) => <span key={c.id}><i style={{ backgroundColor: c.color }} />{c.id}</span>)}</div>
    {tooth && <div className="tooth-panel">
      <h3>السن {tooth}</h3>
      {mine.filter((e) => e.tooth_number === tooth).map((e) => <div className="record-row" key={e.id}><span className="chair-dot" style={{ backgroundColor: colorOf(e.condition) }} /><div><strong>{e.condition}</strong><span>{e.treatment ?? "دون إجراء"} · {new Date(e.created_at).toLocaleDateString("ar-SY")}</span></div></div>)}
      {!mine.some((e) => e.tooth_number === tooth) && <p className="muted">لا يوجد سجل لهذا السن.</p>}
      {canEdit && <form className="form-stack" onSubmit={save}><div className="form-grid"><label>الحالة<select name="condition">{conditions.map((c) => <option key={c.id}>{c.id}</option>)}</select></label><label>الإجراء أو الملاحظة<Input name="treatment" /></label></div>{msg && <div className="form-message">{msg}</div>}<Button>حفظ حالة السن</Button></form>}
    </div>}
  </div>;
}

/* ================= نمط الشعار: مخطط أسنان على شكل فكّين ================= */
const NAVY = "#0b4768", SKY = "#66adcd", ICE = "#d9ecf6", INK = "#062a40";
type Pt = { n: number; x: number; y: number; rot: number; w: number; h: number };

/** يوزّع الأسنان على قوس حدوة حصان: العلوي ∩ والسفلي ∪ */
function archPoints(nums: number[], upper: boolean, W: number, H: number, child: boolean): Pt[] {
  const n = nums.length, cx = W / 2, rx = W / 2 - 24, A = H - 48, mid = (n - 1) / 2;
  return nums.map((num, i) => {
    const th = Math.PI * (1 - i / (n - 1));
    const x = cx + rx * Math.cos(th);
    const y = upper ? H - 24 - A * Math.sin(th) : 24 + A * Math.sin(th);
    const rot = (Math.atan2(upper ? A * Math.cos(th) : -A * Math.cos(th), rx * Math.sin(th)) * 180) / Math.PI;
    const d = Math.abs(i - mid) / mid;
    const [w, h] = child ? [24, 24] : d < 0.25 ? [18, 26] : d < 0.55 ? [22, 25] : d < 0.8 ? [24, 25] : [27, 28];
    return { n: num, x, y, rot, w, h };
  });
}

function DentalChartBrand({ patient, entries, canEdit }: { patient: AnyRow; entries: AnyRow[]; canEdit: boolean }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"adult" | "child">("adult");
  const [tooth, setTooth] = useState<number | null>(null);
  const [cond, setCond] = useState("سليم");
  const [treat, setTreat] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const mine = entries.filter((e) => e.patient_id === patient.id);
  const latest = (n: number) => mine.find((e) => e.tooth_number === n);
  const set = mode === "adult" ? adult : child;
  const W = 340, H = 190;
  const counts = conditions.map((c) => ({ ...c, count: [...adult.upper, ...adult.lower, ...child.upper, ...child.lower].filter((n) => latest(n)?.condition === c.id).length })).filter((c) => c.count > 0);

  useEffect(() => { if (tooth) panel.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [tooth]);

  function pick(n: number) { setTooth(n); setCond(latest(n)?.condition ?? "سليم"); setTreat(""); setMsg(""); }
  async function save(e: FormEvent) {
    e.preventDefault(); if (!tooth || busy) return;
    setBusy(true); setMsg("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); setMsg("انتهت الجلسة، سجّل الدخول من جديد"); return; }
    const { error } = await supabase.from("dental_chart_entries").insert({ patient_id: patient.id, tooth_number: tooth, condition: cond, treatment: treat.trim() || null, color: colorOf(cond), recorded_by: user.id });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setMsg("تم الحفظ ✓"); setTreat(""); qc.invalidateQueries({ queryKey: ["clinic"] });
  }

  const Arch = ({ nums, upper }: { nums: number[]; upper: boolean }) => <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 400, display: "block", margin: "0 auto" }} role="group" aria-label={upper ? "الفك العلوي" : "الفك السفلي"}>
    <text x={W / 2} y={H / 2 + 4} textAnchor="middle" fontSize="13" fontWeight="800" fill={NAVY}>{upper ? "الفك العلوي" : "الفك السفلي"}</text>
    {archPoints(nums, upper, W, H, mode === "child").map((p) => {
      const l = latest(p.n); const missing = l?.condition === "مفقود"; const fill = missing ? "#e5e7eb" : l ? colorOf(l.condition) : "#fff"; const sel = tooth === p.n;
      return <g key={p.n} transform={`translate(${p.x} ${p.y})`} role="button" tabIndex={0} aria-label={`السن ${p.n}${l ? " " + l.condition : ""}`} style={{ cursor: "pointer", outline: "none" }}
        onClick={() => pick(p.n)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(p.n); } }}>
        <g transform={`rotate(${p.rot})`}>
          {sel && <rect x={-p.w / 2 - 4} y={-p.h / 2 - 4} width={p.w + 8} height={p.h + 8} rx={11} fill="none" stroke={SKY} strokeWidth={4} />}
          <rect x={-p.w / 2} y={-p.h / 2} width={p.w} height={p.h} rx={7} fill={fill} stroke={NAVY} strokeWidth={2} strokeDasharray={missing ? "3 3" : undefined} />
        </g>
        <text textAnchor="middle" dy="3.5" fontSize="10.5" fontWeight="800" fill={l && !missing ? "#fff" : INK} style={{ pointerEvents: "none" }}>{p.n}</text>
      </g>;
    })}
  </svg>;

  const pill = (active: boolean, color = NAVY) => ({ border: `2px solid ${color}`, background: active ? color : "#fff", color: active ? "#fff" : INK, borderRadius: 999, padding: "6px 14px", fontWeight: 800, fontSize: 13, cursor: "pointer" } as const);
  const history = tooth ? mine.filter((e) => e.tooth_number === tooth) : [];

  return <div dir="rtl" style={{ display: "grid", gap: 14 }}>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <button type="button" style={pill(mode === "adult")} onClick={() => { setMode("adult"); setTooth(null); }}>أسنان البالغين</button>
      <button type="button" style={pill(mode === "child")} onClick={() => { setMode("child"); setTooth(null); }}>أسنان الأطفال</button>
    </div>
    <div style={{ background: "#fff", border: `2.5px solid ${NAVY}`, borderRadius: 22, boxShadow: `5px 5px 0 ${NAVY}`, padding: 14, display: "grid", gap: 6 }}>
      <Arch nums={set.upper} upper />
      <Arch nums={set.lower} upper={false} />
    </div>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} aria-label="مفتاح الألوان">
      {conditions.map((c) => { const k = counts.find((x) => x.id === c.id)?.count ?? 0; return <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: ICE, border: `1.5px solid ${NAVY}`, borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700, color: INK }}><i style={{ width: 10, height: 10, borderRadius: 99, background: c.color, display: "inline-block" }} />{c.id}{k > 0 ? ` (${k})` : ""}</span>; })}
    </div>
    {tooth && <div ref={panel} style={{ background: "#fff", border: `2.5px solid ${NAVY}`, borderRadius: 22, boxShadow: `5px 5px 0 ${NAVY}`, padding: 16, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontSize: 18, color: NAVY }}>السن {tooth}</strong>
        <button type="button" onClick={() => setTooth(null)} aria-label="إغلاق" style={{ border: 0, background: "none", fontSize: 20, cursor: "pointer", color: NAVY }}>✕</button>
      </div>
      {history.length ? <div style={{ display: "grid", gap: 8 }}>{history.map((e) => <div key={e.id} style={{ display: "flex", gap: 10, alignItems: "center", background: "#f1f8fc", border: "1.5px solid #b9d6e6", borderRadius: 12, padding: "8px 12px" }}>
        <i style={{ width: 12, height: 12, borderRadius: 99, background: colorOf(e.condition), flex: "none" }} />
        <div style={{ flex: 1 }}><strong>{e.condition}</strong>{e.treatment ? <span> — {e.treatment}</span> : null}</div>
        <small style={{ color: "#35566b" }}>{new Date(e.created_at).toLocaleDateString("ar-SY")}</small></div>)}</div>
        : <p style={{ margin: 0, color: "#35566b" }}>لا يوجد سجل لهذا السن بعد.</p>}
      {canEdit && <form onSubmit={save} style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{conditions.map((c) => <button key={c.id} type="button" aria-pressed={cond === c.id} onClick={() => setCond(c.id)} style={pill(cond === c.id, c.color)}>{c.id}</button>)}</div>
        <label style={{ display: "grid", gap: 4, fontWeight: 700, color: INK }}>الإجراء (اختياري)<Input value={treat} onChange={(e) => setTreat(e.target.value)} maxLength={200} /></label>
        {msg && <div role="status" style={{ fontWeight: 700, color: msg.includes("✓") ? "#1f6b57" : "#a14d45" }}>{msg}</div>}
        <Button type="submit" disabled={busy}>{busy ? "جارٍ الحفظ..." : `حفظ حالة السن ${tooth}`}</Button>
      </form>}
    </div>}
  </div>;
}

/** يعرض نمط الشعار عند تفعيله من زر تبديل النمط، وإلا المخطط الكلاسيكي */
export function DentalChart(props: { patient: AnyRow; entries: AnyRow[]; canEdit: boolean }) {
  const brand = typeof document !== "undefined" && document.documentElement.dataset["theme"] === "brand";
  return brand ? <DentalChartBrand {...props} /> : <DentalChartClassic {...props} />;
}
