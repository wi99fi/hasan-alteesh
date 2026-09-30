import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logo from "@/assets/alteesh-clinic-logo.png";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "تسجيل الدخول — Alteesh Clinic" },
    { name: "description", content: "تسجيل الدخول الآمن إلى نظام إدارة Alteesh Clinic." },
    { property: "og:title", content: "تسجيل الدخول — Alteesh Clinic" },
    { property: "og:description", content: "تسجيل الدخول الآمن إلى نظام إدارة Alteesh Clinic." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const fullName = String(form.get("fullName") ?? "");
    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      setMessage(error ? error.message : "أرسلنا رابط استعادة كلمة المرور إلى بريدك."); setBusy(false); return;
    }
    const result = mode === "signup"
      ? await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin } })
      : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) setMessage(result.error.message);
    else if (mode === "signup" && !result.data.session) setMessage("تحقق من بريدك لتأكيد الحساب، ثم سجّل الدخول.");
    else await navigate({ to: "/dashboard" });
    setBusy(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: "/dashboard", replace: true }); });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/dashboard", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function googleLogin() {
    setBusy(true); setMessage("");
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/auth` });
    if (result.error) setMessage(result.error.message); else if (!result.redirected) await navigate({ to: "/dashboard" });
    setBusy(false);
  }

  return <main className="auth-page" dir="rtl">
    <section className="auth-brand"><img src={logo} alt="شعار Alteesh Clinic" /><p>نظام متكامل لإدارة عيادتك</p></section>
    <section className="auth-panel">
      <div className="auth-card">
        <span className="eyebrow">مرحباً بك</span>
        <h1>{mode === "login" ? "تسجيل الدخول" : mode === "signup" ? "إنشاء الحساب الأول" : "استعادة كلمة المرور"}</h1>
        <p>{mode === "forgot" ? "أدخل بريدك وسنرسل لك رابطاً آمناً." : "أدخل بياناتك للوصول إلى مساحة العمل."}</p>
        <form onSubmit={submit} className="form-stack">
          {mode === "signup" && <label>الاسم الكامل<Input name="fullName" required placeholder="مثال: د. أحمد التيش" /></label>}
          <label>البريد الإلكتروني<Input name="email" type="email" required placeholder="name@clinic.com" dir="ltr" /></label>
          {mode !== "forgot" && <label>كلمة المرور<div className="password-field"><Input name="password" type={showPassword ? "text" : "password"} required minLength={8} dir="ltr" /><Button type="button" variant="ghost" size="icon" aria-label="إظهار كلمة المرور" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff /> : <Eye />}</Button></div></label>}
          {message && <div className="form-message">{message}</div>}
          <Button size="lg" disabled={busy}>{busy && <LoaderCircle className="animate-spin" />}{mode === "login" ? "دخول" : mode === "signup" ? "إنشاء الحساب" : "إرسال الرابط"}</Button>
        </form>
        {mode !== "forgot" && <><div className="divider"><span>أو</span></div><Button variant="outline" size="lg" className="w-full" onClick={googleLogin}>G&nbsp;&nbsp; المتابعة باستخدام Google</Button></>}
        <div className="auth-links">
          {mode === "login" && <><button onClick={() => setMode("forgot")}>نسيت كلمة المرور؟</button><button onClick={() => setMode("signup")}>إنشاء حساب</button></>}
          {mode !== "login" && <button onClick={() => setMode("login")}>العودة إلى تسجيل الدخول</button>}
        </div>
      </div>
    </section>
  </main>;
}