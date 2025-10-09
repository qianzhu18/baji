import { NextResponse } from "next/server";

// Quota/cooldown disabled for demo
const DAILY_QUOTA = Number.POSITIVE_INFINITY;
const COOLDOWN_SEC = 0;

export async function GET() {
  // Always return zeros while disabled
  const used = 0;

  return NextResponse.json({
    total: DAILY_QUOTA,
    used,
    remaining: DAILY_QUOTA,
    nextAllowedAt: 0,
    cooldownMs: 0,
    cooldownSec: COOLDOWN_SEC,
  });
}
