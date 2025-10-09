import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), ".data");
const leadsFile = path.join(dataDir, "leads.json");

async function ensureData() {
  try { await fs.mkdir(dataDir, { recursive: true }); } catch {}
  try { await fs.access(leadsFile); } catch { await fs.writeFile(leadsFile, "[]", "utf-8"); }
}

export async function POST(req: NextRequest) {
  await ensureData();
  const body = await req.json().catch(() => ({}));
  const leadId = `L${Date.now()}`;
  const now = new Date().toISOString();
  const entry = { leadId, createdAt: now, ...body };
  try {
    const raw = await fs.readFile(leadsFile, "utf-8");
    const list = JSON.parse(raw || "[]");
    list.unshift(entry);
    await fs.writeFile(leadsFile, JSON.stringify(list, null, 2), "utf-8");
  } catch {}
  return NextResponse.json({ leadId, ok: true });
}
