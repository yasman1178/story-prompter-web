"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2, Circle, Clock, Film, Mic, Music2, Sparkles, Upload } from "lucide-react";
import { useStudio } from "@/lib/store";
import { cn } from "@/lib/utils";

export interface WorkflowStep {
  id: string;
  href: string;
  labelAr: string;
  shortDescAr: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "completed" | "in_progress" | "pending";
  badgeText: string;
}

export function WorkflowStepper() {
  const pathname = usePathname();
  const project = useStudio((s) => s.project);

  const totalShots = project?.shots.length || 0;
  const shotsWithAudio = project?.shots.filter((s) => Boolean(s.customAudioId)).length || 0;
  const hasBgmOrSfx = Boolean(
    project?.isBgmEnabled ||
    project?.customAudioBedId ||
    project?.shots.some((s) => Boolean(s.assignedSfxId))
  );

  const steps: WorkflowStep[] = [
    {
      id: "script",
      href: "/project",
      labelAr: "1. سيناريو المشاهد",
      shortDescAr: totalShots > 0 ? `${totalShots} مشهد محمل` : "حمّل أو الصق JSON",
      icon: Sparkles,
      status: totalShots > 0 ? "completed" : "pending",
      badgeText: totalShots > 0 ? "مكتمل ✓" : "مطلوب",
    },
    {
      id: "voice",
      href: "/record",
      labelAr: "2. صوت الراوي",
      shortDescAr:
        totalShots === 0
          ? "في انتظار المشاهد"
          : shotsWithAudio === totalShots
          ? `جميع المشاهد (${shotsWithAudio}/${totalShots})`
          : `${shotsWithAudio} من ${totalShots} جاهز`,
      icon: Mic,
      status:
        totalShots > 0 && shotsWithAudio === totalShots
          ? "completed"
          : shotsWithAudio > 0
          ? "in_progress"
          : "pending",
      badgeText:
        totalShots > 0 && shotsWithAudio === totalShots
          ? "مكتمل ✓"
          : shotsWithAudio > 0
          ? `${shotsWithAudio}/${totalShots}`
          : "0%",
    },
    {
      id: "audio",
      href: "/audio",
      labelAr: "3. موسيقى ومؤثرات",
      shortDescAr: hasBgmOrSfx ? "مدمجة وخافضة للصوت" : "اختيار تراك أو رفع",
      icon: Music2,
      status: hasBgmOrSfx ? "completed" : "pending",
      badgeText: hasBgmOrSfx ? "جاهز ✓" : "اختياري",
    },
    {
      id: "preview",
      href: "/video",
      labelAr: "4. معاينة الاستوديو",
      shortDescAr: "شاشة الكانفس والتايم لاين",
      icon: Film,
      status: totalShots > 0 ? "completed" : "pending",
      badgeText: totalShots > 0 ? "الرئيسية" : "مغلق",
    },
    {
      id: "export",
      href: "/video",
      labelAr: "5. تصدير الفيديو",
      shortDescAr: "رندر MP4 بمزامنة صارمة",
      icon: Upload,
      status: totalShots > 0 && shotsWithAudio > 0 ? "completed" : "pending",
      badgeText: totalShots > 0 && shotsWithAudio > 0 ? "جاهز للرندر" : "يحتاج صوت",
    },
  ];

  return (
    <nav
      aria-label="شريط خطوات العمل المتكامل"
      className="sticky top-14 sm:top-16 z-20 w-full border-b border-border bg-nav/95 backdrop-blur-md py-2 px-3 sm:px-4"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none pb-0.5">
          {steps.map((step, idx) => {
            const isActive = pathname === step.href && (step.id !== "export" || pathname === "/video");
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex items-center shrink-0">
                <Link
                  href={step.href}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs transition border whitespace-nowrap min-h-[44px]",
                    isActive
                      ? "bg-primary/15 border-primary text-primary font-bold shadow-sm"
                      : "bg-card/70 border-border/70 text-fg hover:border-primary/40 hover:bg-surface"
                  )}
                >
                  <span
                    className={cn(
                      "grid h-6 w-6 place-items-center rounded-lg text-xs shrink-0 font-mono",
                      step.status === "completed"
                        ? "bg-accent/20 text-accent font-bold"
                        : step.status === "in_progress"
                        ? "bg-gold/20 text-gold font-bold"
                        : "bg-surface text-dim"
                    )}
                  >
                    {step.status === "completed" ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : step.status === "in_progress" ? (
                      <Clock className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Circle className="h-3 w-3" />
                    )}
                  </span>

                  <div className="flex flex-col text-right">
                    <span className="font-semibold text-[11px] sm:text-xs leading-tight flex items-center gap-1">
                      <Icon className="h-3 w-3 shrink-0 opacity-80" />
                      <span>{step.labelAr}</span>
                    </span>
                    <span className="text-[10px] text-muted leading-tight truncate max-w-[120px] sm:max-w-[140px]">
                      {step.shortDescAr}
                    </span>
                  </div>

                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-md font-mono shrink-0 mr-1 hidden sm:inline-block",
                      step.status === "completed"
                        ? "bg-accent/15 text-accent"
                        : step.status === "in_progress"
                        ? "bg-gold/15 text-gold"
                        : "bg-surface text-dim"
                    )}
                  >
                    {step.badgeText}
                  </span>
                </Link>

                {idx < steps.length - 1 && (
                  <span className="text-dim/60 px-1 text-xs select-none">←</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
