"use client";

import { useRef, useState } from "react";
import { FileJson, Sparkles, Upload } from "lucide-react";
import { useStudio } from "@/lib/store";

export function EmptyState({ description }: { description: string }) {
  const loadSample = useStudio((s) => s.loadSample);
  const importJson = useStudio((s) => s.importJson);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteValue, setPasteValue] = useState("");

  async function onJsonFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    if (!importJson(text)) {
      setPasteValue(text);
      setPasteOpen(true);
    }
  }

  return (
    <div className="rounded-3xl border border-dashed border-border bg-surface/60 p-8 text-center">
      <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-primary">
        <FileJson className="h-8 w-8" />
      </span>
      <h2 className="text-lg font-bold text-fg">لا يوجد مشروع بعد</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{description}</p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={loadSample}
          className="flex h-12 items-center gap-2 rounded-xl bg-primary px-5 font-semibold text-black transition hover:brightness-110"
        >
          <Sparkles className="h-5 w-5" />
          تحميل قصة نموذجية
        </button>
        <button
          type="button"
          onClick={() => jsonInputRef.current?.click()}
          className="flex h-12 items-center gap-2 rounded-xl border border-border px-5 font-medium text-fg transition hover:border-primary/50"
        >
          <Upload className="h-5 w-5" />
          استيراد ملف JSON
        </button>
        <button
          type="button"
          onClick={() => setPasteOpen((v) => !v)}
          className="flex h-12 items-center gap-2 rounded-xl border border-border px-5 font-medium text-fg transition hover:border-primary/50"
        >
          <FileJson className="h-5 w-5" />
          لصق نص JSON
        </button>
      </div>

      <input
        ref={jsonInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          void onJsonFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {pasteOpen && (
        <div className="mx-auto mt-5 max-w-2xl text-right">
          <textarea
            value={pasteValue}
            onChange={(e) => setPasteValue(e.target.value)}
            rows={6}
            dir="ltr"
            placeholder='{ "project_info": { ... }, "shots": [ ... ] }'
            className="w-full rounded-2xl border border-border bg-card p-3 text-sm text-fg outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => importJson(pasteValue)}
            className="mt-3 h-11 rounded-xl bg-primary px-5 font-semibold text-black transition hover:brightness-110"
          >
            استيراد
          </button>
        </div>
      )}
    </div>
  );
}
