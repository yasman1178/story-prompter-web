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
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border bg-nav/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-black">
            <Clapperboard className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-fg">
              {projectTitle ?? "استوديو حكايات الشورتس"}
            </p>
            <p className="truncate text-xs text-dim">
              {totalShots > 0 ? `${totalShots} مشهد · عمودي 9:16` : "لا يوجد مشروع بعد"}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm text-muted transition hover:border-danger/50 hover:text-danger disabled:opacity-60"
          >
            {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            <span className="hidden sm:inline">خروج</span>
          </button>
        </div>

        <nav className="mx-auto max-w-6xl px-2 pb-2">
          <ul className="scrollbar-none flex gap-1 overflow-x-auto">
            {STUDIO_TABS.map((tab) => {
              const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
              const Icon = tab.icon;
              return (
                <li key={tab.href} className="shrink-0">
                  <Link
                    href={tab.href}
                    className={cn(
                      "flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium transition",
                      active
                        ? "bg-primary/15 text-primary"
                        : "text-muted hover:bg-surface hover:text-fg"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.labelAr}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
