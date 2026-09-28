import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AnyRow = Record<string, any>;

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

export function DentalChart({ patient, entries, canEdit }: { patient: AnyRow; entries: AnyRow[]; canEdit: boolean }) {
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
