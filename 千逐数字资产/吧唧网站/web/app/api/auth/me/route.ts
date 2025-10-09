import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE, readSession } from "@/lib/server/auth-store";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value ?? "";
  if (!token) {
    return NextResponse.json({ user: null });
  }
  const session = await readSession(token);
  if (!session) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({
    user: { id: session.uid, email: session.email },
    expiresAt: session.expiresAt,
  });
}

