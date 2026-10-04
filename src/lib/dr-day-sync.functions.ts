import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ENDPOINT = "https://dr-day.lovable.app/api/public/clinic-sync";
const TZ = "Asia/Damascus";

function parts(iso: string) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  const p = Object.fromEntries(f.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { date: `${p["year"]}-${p["month"]}-${p["day"]}`, time: `${p["hour"] === "24" ? "00" : p["hour"]}:${p["minute"]}` };
}

/**
 * Sends appointments to Dr-Day. With no filter, sends all (up to 1000).
 * patientId filter is used after a payment so the related appointment's revenue updates.
 */
export const syncDrDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ ids: z.array(z.string().uuid()).max(1000).optional(), patientId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const token = process.env["DR_DAY_SYNC_TOKEN"];
    if (!token) return { ok: false, error: "مفتاح المزامنة غير مضبوط" };
    const sb = context.supabase;
    let q = sb.from("appointments").select("id, starts_at, ends_at, notes, reason, status, patient_id, doctor_id").order("starts_at", { ascending: false }).limit(1000);
    if (data.ids?.length) q = q.in("id", data.ids);
    if (data.patientId) q = q.eq("patient_id", data.patientId);
    const { data: appts, error } = await q;
    if (error) return { ok: false, error: error.message };
    if (!appts?.length) return { ok: true, upserted: 0, removed: 0 };

    const patientIds = [...new Set(appts.map((a) => a.patient_id))];
    const [{ data: invoices }, { data: shares }, { data: clinic }] = await Promise.all([
      sb.from("invoices").select("id, patient_id, doctor_id, issued_at, payments(amount)").in("patient_id", patientIds),
      sb.from("doctor_shares").select("doctor_id, percent"),
      sb.rpc("get_public_clinic_settings"),
    ]);
    const clinicName = clinic?.[0]?.clinic_name || "Alteesh Clinic";
    const shareMap = new Map((shares ?? []).map((s) => [s.doctor_id, Number(s.percent)]));
    const used = new Set<string>();

    // Oldest first so each invoice's revenue is attached to one appointment only.
    const sorted = [...appts].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    const payload = sorted.map((a) => {
      const { date, time } = parts(a.starts_at);
      let revenue = 0;
      for (const inv of invoices ?? []) {
        if (used.has(inv.id) || inv.patient_id !== a.patient_id) continue;
        if (inv.doctor_id && a.doctor_id && inv.doctor_id !== a.doctor_id) continue;
        if (parts(inv.issued_at).date !== date) continue;
        used.add(inv.id);
        revenue += ((inv.payments as { amount: number }[] | null) ?? []).reduce((s, p) => s + Number(p.amount), 0);
      }
      const pct = a.doctor_id && shareMap.has(a.doctor_id) ? shareMap.get(a.doctor_id)! : 100;
      return {
        id: a.id,
        date,
        startTime: time,
        durationMinutes: Math.max(0, Math.round((new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) / 60000)),
        clinicName,
        note: [a.reason, a.notes].filter(Boolean).join(" — "),
        revenue,
        sharePercent: pct,
        type: pct >= 100 ? "ownClinic" : "percentageClinic",
        deleted: a.status === "cancelled",
      };
    });

    try {
      const res = await fetch(ENDPOINT, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ appointments: payload }) });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; upserted?: number; removed?: number; error?: string };
      if (!res.ok) return { ok: false, error: body.error ?? `فشل الطلب (${res.status})` };
      return { ok: body.ok ?? true, upserted: body.upserted ?? 0, removed: body.removed ?? 0 };
    } catch (e) {
      console.error("dr-day sync", e);
      return { ok: false, error: "تعذر الاتصال بتطبيق منظّم يوم الطبيب" };
    }
  });
