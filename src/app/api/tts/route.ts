import { Communicate } from "edge-tts-universal";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_CHARS = 4000;

interface WordBoundary {
  offset: number;
  duration: number;
  text: string;
}

export async function POST(request: Request) {
  let body: { text?: unknown; voice?: unknown; rate?: unknown; pitch?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const voice = typeof body.voice === "string" && body.voice ? body.voice : "ar-EG-SalmaNeural";
  const rate = typeof body.rate === "string" && body.rate ? body.rate : undefined;
  const pitch = typeof body.pitch === "string" && body.pitch ? body.pitch : undefined;

  if (!text) return Response.json({ error: "empty_text" }, { status: 400 });
  if (text.length > MAX_CHARS) return Response.json({ error: "text_too_long" }, { status: 413 });

  try {
    const communicate = new Communicate(text, { voice, rate, pitch, connectionTimeout: 15000 });
    const buffers: Buffer[] = [];
    const boundaries: WordBoundary[] = [];

    for await (const chunk of communicate.stream()) {
      if (chunk.type === "audio" && chunk.data) {
        buffers.push(Buffer.from(chunk.data));
      } else if (chunk.type === "WordBoundary" && chunk.text) {
        boundaries.push({
          offset: chunk.offset ?? 0,
          duration: chunk.duration ?? 0,
          text: chunk.text,
        });
      }
    }

    if (buffers.length === 0) {
      return Response.json({ error: "no_audio" }, { status: 502 });
    }

    return Response.json({
      mime: "audio/mpeg",
      audio: Buffer.concat(buffers).toString("base64"),
      boundaries,
    });
  } catch {
    return Response.json({ error: "synthesis_failed" }, { status: 502 });
  }
}
