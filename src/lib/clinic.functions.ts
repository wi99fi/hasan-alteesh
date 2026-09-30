import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const roleSchema = z.enum(["super_admin", "admin", "doctor", "nurse", "receptionist"]);

export const ensureClinicProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ fullName: z.string().trim().min(2) }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id")
      .eq("id", context.userId)
      .maybeSingle();

    if (!profile) {
      await context.supabase.from("profiles").insert({ id: context.userId, full_name: data.fullName });
    }

    const { data: initialized, error } = await context.supabase.rpc("claim_initial_super_admin", { _full_name: data.fullName });
    if (error) throw error;
    return { initialized };
  });

export const createClinicUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    email: z.string().email(),
    password: z.string().min(8),
    fullName: z.string().trim().min(2),
    phone: z.string().optional(),
    specialty: z.string().optional(),
    role: roleSchema,
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" });
    const { data: adminAllowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!allowed && !adminAllowed) throw new Error("غير مصرح لك بإضافة مستخدمين");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error || !created.user) throw new Error(error?.message ?? "تعذر إنشاء المستخدم");
    await supabaseAdmin.from("profiles").insert({ id: created.user.id, full_name: data.fullName, phone: data.phone ?? null, specialty: data.specialty ?? null });
    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: data.role });
    return { id: created.user.id };
  });

const PROTECTED_MSG = "لا يمكن حذف أو تعديل حساب المدير العام";

export const updateClinicUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    id: z.string().uuid(),
    fullName: z.string().trim().min(2).max(120),
    phone: z.string().trim().max(30).optional(),
    specialty: z.string().trim().max(120).optional(),
    role: z.enum(["admin", "doctor", "nurse", "receptionist"]),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const [{ data: superAdmin }, { data: admin }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    ]);
    if (!superAdmin && !admin) throw new Error("غير مصرح لك بتعديل المستخدمين");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin.rpc("has_role", { _user_id: data.id, _role: "super_admin" });
    if (target) throw new Error(PROTECTED_MSG);
    const { error: profileError } = await supabaseAdmin.from("profiles").update({
      full_name: data.fullName,
      phone: data.phone || null,
      specialty: data.specialty || null,
      updated_at: new Date().toISOString(),
    }).eq("id", data.id);
    if (profileError) throw new Error(profileError.message);
    const { error: roleError } = await supabaseAdmin.from("user_roles").update({ role: data.role }).eq("user_id", data.id);
    if (roleError) throw new Error(roleError.message);
    return { ok: true };
  });

export const deleteClinicUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    if (data.id === context.userId) throw new Error("لا يمكنك حذف حسابك الحالي");
    const { data: superAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" });
    if (!superAdmin) throw new Error("حذف المستخدمين متاح للمدير العام فقط");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin.rpc("has_role", { _user_id: data.id, _role: "super_admin" });
    if (target) throw new Error(PROTECTED_MSG);
    const { error: roleError } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    if (roleError) throw new Error(roleError.message);
    const { error: profileError } = await supabaseAdmin.from("profiles").delete().eq("id", data.id);
    if (profileError) throw new Error(profileError.message);
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (authError) throw new Error(authError.message);
    return { ok: true };
  });