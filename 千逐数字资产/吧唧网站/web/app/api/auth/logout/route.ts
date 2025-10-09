import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE, deleteSession } from "@/lib/server/auth-store";

const secureCookie = process.env.NODE_ENV === "production";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value ?? "";
  if (token) {
    await deleteSession(token);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    path: "/",
    maxAge: 0,
  });
  return res;
}

