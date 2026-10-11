"use client";

import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { useStudio } from "@/lib/store";

export function FeedbackToast() {
  const feedback = useStudio((s) => s.feedback);
  const clearFeedback = useStudio((s) => s.clearFeedback);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => clearFeedback(), 3200);
    return () => clearTimeout(timer);
  }, [feedback, clearFeedback]);

  if (!feedback) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-fg shadow-2xl">
        <CheckCircle2 className="h-5 w-5 text-accent" />
        <span>{feedback}</span>
      </div>
    </div>
  );
}
