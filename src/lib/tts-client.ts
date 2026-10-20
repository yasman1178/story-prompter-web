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
