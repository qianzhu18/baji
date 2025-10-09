import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), ".data");
const usersFile = path.join(dataDir, "users.json");
const sessionsFile = path.join(dataDir, "sessions.json");

export const SESSION_COOKIE = "session";

const DEFAULT_SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const parsedTtl = Number(process.env.ADMIN_SESSION_TTL_MS);
const sessionTtlMs = Number.isFinite(parsedTtl) && parsedTtl >= 60_000 ? parsedTtl : DEFAULT_SESSION_TTL_MS;

export type StoredUser = {
  id: string;
  email: string;
  salt: string;
  hash: string;
  createdAt: string;
};

export type SessionRecord = {
  uid: string;
  email: string;
  createdAt: number;
  expiresAt: number;
};

type SessionMap = Record<string, SessionRecord>;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function ensureDataDir() {
  await fs.mkdir(dataDir, { recursive: true }).catch(() => {});
}

async function readJSON<T>(file: string, fallback: T): Promise<T> {
  try {
    const txt = await fs.readFile(file, "utf-8");
    if (!txt) return fallback;
    return JSON.parse(txt) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    console.error(`[auth-store] Failed to read ${path.basename(file)}`, error);
    return fallback;
  }
}

async function writeJSON(file: string, data: unknown) {
  await ensureDataDir();
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf-8");
}

export function hashPassword(password: string, salt: string) {
  return crypto.createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

export async function listUsers(): Promise<StoredUser[]> {
  return readJSON(usersFile, [] as StoredUser[]);
}

export async function findUserByEmail(email: string) {
  const normalized = normalizeEmail(email);
  const users = await listUsers();
  return users.find((u) => u.email === normalized) ?? null;
}

export async function createUser(email: string, password: string) {
  const normalized = normalizeEmail(email);
  const users = await listUsers();
  if (users.some((u) => u.email === normalized)) {
    throw new Error("exists");
  }
  const salt = crypto.randomBytes(8).toString("hex");
  const hash = hashPassword(password, salt);
  const user: StoredUser = {
    id: `U${Date.now()}`,
    email: normalized,
    salt,
    hash,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await writeJSON(usersFile, users);
  return user;
}

export async function verifyCredentials(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const hash = hashPassword(password, user.salt);
  return hash === user.hash ? user : null;
}

async function pruneSessions(now = Date.now()) {
  const sessions = await readJSON(sessionsFile, {} as SessionMap);
  let changed = false;
  for (const [token, record] of Object.entries(sessions)) {
    if (!record.expiresAt || record.expiresAt <= now) {
      delete sessions[token];
      changed = true;
    }
  }
  if (changed) await writeJSON(sessionsFile, sessions);
  return sessions;
}

export async function createSession(user: Pick<StoredUser, "id" | "email">) {
  const sessions = await pruneSessions();
  const token = crypto.randomBytes(24).toString("hex");
  const now = Date.now();
  const record: SessionRecord = {
    uid: user.id,
    email: user.email,
    createdAt: now,
    expiresAt: now + sessionTtlMs,
  };
  sessions[token] = record;
  await writeJSON(sessionsFile, sessions);
  return { token, record };
}

export async function readSession(token: string) {
  if (!token) return null;
  const sessions = await readJSON(sessionsFile, {} as SessionMap);
  const record = sessions[token];
  if (!record) return null;
  if (!record.expiresAt || record.expiresAt <= Date.now()) {
    delete sessions[token];
    await writeJSON(sessionsFile, sessions);
    return null;
  }
  return record;
}

export async function deleteSession(token: string) {
  if (!token) return;
  const sessions = await readJSON(sessionsFile, {} as SessionMap);
  if (!sessions[token]) return;
  delete sessions[token];
  await writeJSON(sessionsFile, sessions);
}

export function getSessionTtlSeconds() {
  return Math.floor(sessionTtlMs / 1000);
}

export async function countUsers() {
  const users = await listUsers();
  return users.length;
}

export function validateEmail(email: string) {
  const normalized = normalizeEmail(email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(normalized);
}

export function validatePassword(password: string) {
  return password.length >= 8;
}

export function normalizeInviteCode(code: string) {
  return code.trim();
}

export function requireInviteCode() {
  return (process.env.ADMIN_INVITE_CODE || process.env.ADMIN_PASSWORD || "").trim();
}
