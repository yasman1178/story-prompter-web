"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Music2, ArrowLeft } from "lucide-react";
import { useStudio } from "@/lib/store";

export default function SfxPage() {
  const router = useRouter();
  const showFeedback = useStudio((s) => s.showFeedback);

  useEffect(() => {
    showFeedback("تم إلغاء تبويب المؤثرات الصوتية والاعتماد كلياً على الموسيقى المرفوعة ومكساج الصوت.");
    router.replace("/audio");
  }, [router, showFeedback]);

  return (
    <div className="rounded-3xl border border-border bg-card/60 p-8 text-center space-y-4 max-w-lg mx-auto my-12">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Music2 className="h-8 w-8" />
      </div>
      <h2 className="text-lg font-bold text-fg">تم إخفاء تبويب المؤثرات</h2>
      <p className="text-sm text-muted">
        تم تحديث إعدادات الاستوديو للاعتماد الكامل على الموسيقى المرفوعة ومكساج الصوت مباشرة. جارٍ تحويلك إلى تبويب الموسيقى…
      </p>
      <Link
        href="/audio"
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-black transition hover:brightness-110 shadow-lg"
      >
        <span>الذهاب إلى تبويب الموسيقى والصوت</span>
        <ArrowLeft className="h-4 w-4" />
      </Link>
    </div>
  );
}
