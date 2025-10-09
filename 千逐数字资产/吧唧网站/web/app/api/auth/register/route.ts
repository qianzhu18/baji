import { NextRequest, NextResponse } from "next/server";

import {
  countUsers,
  createUser,
  normalizeInviteCode,
  requireInviteCode,
  validateEmail,
  validatePassword,
} from "@/lib/server/auth-store";

export async function POST(req: NextRequest) {
  const payload = (await req.json().catch(() => null)) as
    | { email?: string; password?: string; inviteCode?: string }
    | null;
  const email = payload?.email?.trim() ?? "";
  const password = payload?.password ?? "";
  const inviteCode = payload?.inviteCode ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "missing" }, { status: 400 });
  }
  if (!validateEmail(email)) {
    return NextResponse.json({ error: "email" }, { status: 400 });
  }
  if (!validatePassword(password)) {
    return NextResponse.json({ error: "password" }, { status: 400 });
  }

  const totalUsers = await countUsers();
  const secret = requireInviteCode();
  if (secret) {
    if (!inviteCode || normalizeInviteCode(inviteCode) !== secret) {
      return NextResponse.json({ error: "invite" }, { status: 403 });
    }
  } else if (totalUsers > 0) {
    return NextResponse.json({ error: "closed" }, { status: 403 });
  }

  try {
    const user = await createUser(email, password);
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "exists") {
      return NextResponse.json({ error: "exists" }, { status: 409 });
    }
    console.error("[auth] register failed", error);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }
}

