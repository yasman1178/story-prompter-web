export interface TtsBoundary {
  offset: number;
  duration: number;
  text: string;
}

export interface TtsResult {
  blob: Blob;
  boundaries: TtsBoundary[];
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function synthesizeSpeech(
  text: string,
  voice: string,
  options?: { rate?: string; pitch?: string },
  timeoutMs = 25000
): Promise<TtsResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        voice,
        rate: options?.rate,
        pitch: options?.pitch,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`tts_http_${res.status}`);
    const data = (await res.json()) as { audio: string; mime: string; boundaries?: TtsBoundary[] };
    const bytes = base64ToBytes(data.audio);
    return {
      blob: new Blob([bytes], { type: data.mime || "audio/mpeg" }),
      boundaries: data.boundaries ?? [],
    };
  } finally {
    clearTimeout(timer);
  }
}

export function speakWithBrowser(text: string, lang = "ar-EG"): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Runs an array of items through an async task with controlled concurrency (e.g. 3-4 parallel workers).
 * Significantly speeds up bulk Edge-TTS generation while maintaining progress tracking.
 */
export async function runConcurrentPool<T, R>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
  onProgress?: (completed: number, total: number, item: T) => void
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let completed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      const item = items[idx];
      results[idx] = await task(item, idx);
      completed++;
      onProgress?.(completed, items.length, item);
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);
  return results;
}
