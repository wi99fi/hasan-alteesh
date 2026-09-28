import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "تعيين كلمة مرور جديدة — عيادة التيش" }, { name: "description", content: "تعيين كلمة مرور جديدة لحساب عيادة التيش." },
    { property: "og:title", content: "تعيين كلمة مرور جديدة — عيادة التيش" }, { property: "og:description", content: "استعادة الوصول الآمن إلى حسابك." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ]}), component: ResetPassword,
});
function ResetPassword() {
  const navigate = useNavigate(); const [message, setMessage] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const password = String(new FormData(e.currentTarget).get("password") ?? ""); const { error } = await supabase.auth.updateUser({ password }); if (error) setMessage(error.message); else await navigate({ to: "/dashboard" }); }
  return <main className="center-page" dir="rtl"><form className="auth-card form-stack" onSubmit={submit}><span className="eyebrow">حسابك</span><h1>كلمة مرور جديدة</h1><p>اختر كلمة مرور لا تقل عن ٨ أحرف.</p><label>كلمة المرور<Input name="password" type="password" minLength={8} required /></label>{message && <div className="form-message">{message}</div>}<Button size="lg">حفظ ومتابعة</Button></form></main>;
}