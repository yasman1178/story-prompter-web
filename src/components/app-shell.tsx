"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Clapperboard, Loader2, LogOut } from "lucide-react";
import { STUDIO_TABS } from "@/lib/nav";
import { useStudio } from "@/lib/store";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const projectTitle = useStudio((s) => s.project?.title ?? null);
  const totalShots = useStudio((s) => s.project?.totalShots ?? 0);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-bg text-fg w-full max-w-full overflow-x-hidden">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-nav/95 backdrop-blur-md w-full max-w-full">
        <div className="mx-auto flex h-14 sm:h-16 max-w-6xl items-center justify-between gap-3 px-3 sm:px-4 w-full min-w-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <span className="grid h-9 w-9 sm:h-10 sm:w-10 shrink-0 place-items-center rounded-xl bg-primary text-black shadow-md">
              <Clapperboard className="h-5 w-5" strokeWidth={2.4} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs sm:text-base font-bold text-fg">
                {projectTitle ?? "استوديو حكايات الشورتس"}
              </p>
              <p className="truncate text-[10px] sm:text-[11px] text-dim">
                {totalShots > 0 ? `${totalShots} مشهد · 9:16 عمودي` : "لا يوجد مشروع محمل"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={logout}
              disabled={loggingOut}
              className="flex min-h-[40px] sm:min-h-[44px] min-w-[40px] sm:min-w-[44px] items-center justify-center gap-1.5 rounded-xl border border-border px-2.5 sm:px-3 text-xs sm:text-sm text-muted transition hover:border-danger/50 hover:text-danger disabled:opacity-60"
              aria-label="تسجيل الخروج"
            >
              {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>

        {/* Desktop / Tablet Sub-navigation Tabs */}
        <nav className="hidden md:block border-t border-border/40">
          <div className="mx-auto max-w-6xl px-4 py-1.5">
            <ul className="flex gap-1.5 overflow-x-auto scrollbar-none">
              {STUDIO_TABS.map((tab) => {
                const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
                const Icon = tab.icon;
                return (
                  <li key={tab.href} className="shrink-0">
                    <Link
                      href={tab.href}
                      className={cn(
                        "flex h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-semibold transition whitespace-nowrap",
                        active
                          ? "bg-primary text-black shadow-sm"
                          : "text-muted hover:bg-surface hover:text-fg"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{tab.labelAr}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-6xl px-3 sm:px-4 py-4 sm:py-5 flex-1 pb-24 md:pb-8 min-w-0 overflow-x-hidden">
        {children}
      </main>

      {/* Mobile Fixed Bottom Tab Bar (Thumb Zone) */}
      <nav
        aria-label="التنقل الرئيسي للهاتف"
        className="fixed bottom-0 left-0 right-0 z-40 block md:hidden border-t border-border/80 bg-nav/95 backdrop-blur-xl safe-bottom shadow-[0_-10px_25px_rgba(0,0,0,0.5)] w-full max-w-full overflow-x-auto no-scrollbar"
      >
        <ul className="flex items-center h-[62px] px-1.5 w-max min-w-full justify-between gap-1">
          {STUDIO_TABS.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const Icon = tab.icon;
            return (
              <li key={tab.href} className="flex justify-center shrink-0 min-w-[58px]">
                <Link
                  href={tab.href}
                  className={cn(
                    "relative flex flex-col items-center justify-center min-h-[48px] w-full py-1 text-center transition-all min-w-0 px-1",
                    active ? "text-primary font-bold" : "text-muted hover:text-fg"
                  )}
                >
                  {active && (
                    <span className="absolute top-0 inset-x-2 h-0.5 rounded-full bg-primary shadow-[0_0_8px_#00e5ff]" />
                  )}
                  <Icon className={cn("h-4 w-4 transition-transform duration-200", active && "scale-110 stroke-[2.5]")} />
                  <span className="text-[9px] tracking-tight mt-0.5 truncate max-w-[62px] text-center">
                    {tab.labelAr.split(" ")[0]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
