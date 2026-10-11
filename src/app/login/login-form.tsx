"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Clapperboard, Loader2, LockKeyhole, User } from "lucide-react";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
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

  return (
    <form
      onSubmit={onSubmit}
      className="relative z-10 w-full max-w-sm rounded-3xl border border-border bg-surface/80 p-7 shadow-2xl backdrop-blur"
    >
      <div className="mb-7 flex flex-col items-center text-center">
        <span className="glow-primary mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-primary text-black">
          <Clapperboard className="h-8 w-8" strokeWidth={2.2} />
        </span>
        <h1 className="text-xl font-bold text-fg">استوديو حكايات الشورتس</h1>
        <p className="mt-1 text-sm text-muted">سجّل الدخول للوصول إلى الاستوديو</p>
      </div>

      <label className="mb-4 block">
        <span className="mb-1.5 block text-sm font-medium text-muted">اسم المستخدم</span>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 focus-within:border-primary">
          <User className="h-4 w-4 text-dim" />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            className="h-11 w-full bg-transparent text-fg outline-none placeholder:text-dim"
            placeholder="username"
          />
        </div>
      </label>

      <label className="mb-5 block">
        <span className="mb-1.5 block text-sm font-medium text-muted">كلمة المرور</span>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 focus-within:border-primary">
          <LockKeyhole className="h-4 w-4 text-dim" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="h-11 w-full bg-transparent text-fg outline-none placeholder:text-dim"
            placeholder="••••••••"
          />
        </div>
      </label>

      {error && (
        <p className="mb-4 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        {loading ? "جارٍ الدخول…" : "دخول"}
      </button>
    </form>
  );
}
