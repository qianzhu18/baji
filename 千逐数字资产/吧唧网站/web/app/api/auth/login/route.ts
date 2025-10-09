import { NextRequest, NextResponse } from "next/server";

import {
  SESSION_COOKIE,
  createSession,
  getSessionTtlSeconds,
  validateEmail,
  verifyCredentials,
} from "@/lib/server/auth-store";

const secureCookie = process.env.NODE_ENV === "production";

export async function POST(req: NextRequest) {
  const payload = (await req.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;
  const email = payload?.email?.trim() ?? "";
  const password = payload?.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "missing" }, { status: 400 });
  }
  if (!validateEmail(email)) {
    return NextResponse.json({ error: "email" }, { status: 400 });
  }

  const user = await verifyCredentials(email, password);
  if (!user) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }

  const { token, record } = await createSession(user);
  const ttlSeconds = getSessionTtlSeconds();

  const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email }, expiresAt: record.expiresAt });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    path: "/",
    maxAge: ttlSeconds,
  });
  return res;
}

