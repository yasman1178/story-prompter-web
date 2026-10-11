import { NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth";
import { verifyCredentials } from "@/lib/session";

function pickString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request) {
  let payload: { username?: unknown; password?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const username = pickString(payload.username).trim();
  const password = pickString(payload.password);

  if (!username || !password) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!verifyCredentials(username, password)) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  try {
    await setSessionCookie(username);
  } catch (err) {
    console.error("Login session cookie error:", err);
    return NextResponse.json({ error: "session_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, username });
}
