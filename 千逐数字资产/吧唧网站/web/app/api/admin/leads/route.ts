import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

import { SESSION_COOKIE, readSession } from "@/lib/server/auth-store";

const dataDir = path.join(process.cwd(), ".data");
const leadsFile = path.join(dataDir, "leads.json");

async function readJSON(file: string) {
  try {
    const txt = await fs.readFile(file, "utf-8");
    return JSON.parse(txt || "null");
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value ?? "";
  const session = await readSession(token);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const leads = (await readJSON(leadsFile)) || [];
  return NextResponse.json({ items: leads });
}
