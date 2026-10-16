"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Clapperboard, Loader2, LockKeyhole, Phone, Sparkles, User, Zap } from "lucide-react";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Script: Quick fill Yasser credentials & phone in Vercel style
  function fillYasserCredentials() {
    setUsername("Yasser");
    setPassword("Yasser");
    setPhone("01012345678");
    setError(null);
  }

  async function loginWithCredentials(userToLogin: string, passToLogin: string) {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: userToLogin, password: passToLogin }),
      });
      if (res.ok) {
        router.replace(nextPath);
        router.refresh();
        return;
      }
      if (res.status === 401) setError("اسم المستخدم أو كلمة المرور غير صحيحة.");
      else if (res.status === 400) setError("من فضلك أدخل اسم المستخدم وكلمة المرور.");
      else setError("تعذّر تسجيل الدخول. حاول مرة أخرى.");
    } catch {
      setError("تعذّر الاتصال بالخادم. تحقق من الشبكة.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await loginWithCredentials(username, password);
  }

  async function handleQuickInstantLogin() {
    fillYasserCredentials();
    await loginWithCredentials("Yasser", "Yasser");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-surface/90 p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.6)] backdrop-blur-xl"
    >
      {/* Top Vercel-style Brand Header */}
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="relative mb-3 flex items-center justify-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-tr from-primary to-accent text-black shadow-lg shadow-primary/20 ring-1 ring-white/20">
            <Clapperboard className="h-7 w-7 stroke-[2.2]" />
          </span>
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black border border-white/20 text-accent">
            <Zap className="h-3 w-3 fill-current" />
          </span>
        </div>

        <h1 className="text-xl font-extrabold tracking-tight text-fg">استوديو حكايات الشورتس</h1>
        <p className="mt-1 text-xs text-muted">سجّل الدخول للوصول إلى لوحة التحكم وأدوات المونتاج</p>

        {/* Vercel-style Quick Fill Script Card */}
        <div className="mt-4 w-full rounded-2xl border border-primary/25 bg-primary/5 p-3 text-start space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-primary flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span>إسكربت التعبئة السريعة (Vercel Style)</span>
            </span>
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-mono font-bold text-primary">
              v19
            </span>
          </div>

          <div className="text-[11px] text-muted space-y-0.5 font-mono">
            <div>المستخدم: <strong className="text-fg font-bold">Yasser</strong></div>
            <div>كلمة المرور: <strong className="text-fg font-bold">Yasser</strong></div>
            <div>رقم الجوال: <strong className="text-fg font-bold">+20 10 1234 5678</strong></div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={fillYasserCredentials}
              className="flex-1 rounded-xl border border-primary/40 bg-card hover:bg-primary/20 px-3 py-1.5 text-xs font-semibold text-primary transition active:scale-95 text-center"
            >
              ملء البيانات تلقائياً
            </button>
            <button
              type="button"
              onClick={handleQuickInstantLogin}
              disabled={loading}
              className="flex-1 rounded-xl bg-primary hover:brightness-110 px-3 py-1.5 text-xs font-bold text-black transition active:scale-95 shadow-sm text-center flex items-center justify-center gap-1"
            >
              <Zap className="h-3 w-3 fill-current" />
              <span>دخول فوري بضغطة زر</span>
            </button>
          </div>
        </div>
      </div>

      {/* Input 1: Username */}
      <label className="mb-3.5 block text-start">
        <span className="mb-1.5 block text-xs font-medium text-muted">اسم المستخدم</span>
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 transition focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40">
          <User className="h-4 w-4 text-dim shrink-0" />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            className="h-11 w-full bg-transparent text-sm text-fg outline-none placeholder:text-dim font-sans"
            placeholder="مثال: Yasser"
          />
        </div>
      </label>

      {/* Input 2: Password */}
      <label className="mb-3.5 block text-start">
        <span className="mb-1.5 block text-xs font-medium text-muted">كلمة المرور</span>
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 transition focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40">
          <LockKeyhole className="h-4 w-4 text-dim shrink-0" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="h-11 w-full bg-transparent text-sm text-fg outline-none placeholder:text-dim font-mono"
            placeholder="••••••••"
          />
        </div>
      </label>

      {/* Input 3: Phone Number (رقم الجوال على غرار Vercel/SaaS) */}
      <label className="mb-5 block text-start">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-muted">رقم الجوال (اختياري / Phone)</span>
          <span className="text-[10px] text-dim">مصر (+20)</span>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 transition focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40">
          <Phone className="h-4 w-4 text-dim shrink-0" />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            className="h-11 w-full bg-transparent text-sm text-fg outline-none placeholder:text-dim font-mono"
            placeholder="010 1234 5678"
            dir="ltr"
          />
        </div>
      </label>

      {error && (
        <p className="mb-4 rounded-xl border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-xs text-danger text-start">
          {error}
        </p>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-cyan-400 font-bold text-black transition hover:brightness-110 active:scale-98 disabled:opacity-60 shadow-lg shadow-primary/20"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        <span>{loading ? "جارٍ تسجيل الدخول…" : "تسجيل الدخول للاستوديو"}</span>
      </button>

      {/* Subtext info */}
      <p className="mt-4 text-center text-[11px] text-dim">
        نظام أمني آمن يعتمد على ملفات تعريف الارتباط المشفرة (Jose JWT Session).
      </p>
    </form>
  );
}
