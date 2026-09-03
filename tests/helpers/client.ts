import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

export const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3200";

/** Direct DB access for test fixtures/assertions — bypasses the app's `server-only` guard. */
export const db = new PrismaClient();

export interface Session {
  cookie: string;
  userId: string;
  role: string;
}

// Test files run sequentially in this project (see vitest.config.ts
// fileParallelism: false), so a simple on-disk cache is enough to share
// logged-in sessions across files without needing a globalSetup process.
// This also keeps the suite well under the login endpoint's rate limit,
// which is a real security control (see src/lib/rate-limit.ts) we don't
// want to weaken just to make tests pass.
const CACHE_PATH = path.join(__dirname, "..", ".cache", "sessions.json");

function readCache(): Record<string, Session> {
  if (!existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, Session>) {
  mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

/** Logs in as a seeded demo user (cached on disk across test files) and returns a session cookie. */
export async function loginAs(email: string, password = "demo123"): Promise<Session> {
  const cache = readCache();
  if (cache[email]) return cache[email];

  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`login failed for ${email}: ${res.status} ${await res.text()}`);
  }
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) throw new Error(`login for ${email} did not set a cookie`);
  const cookie = setCookie.split(";")[0];
  const data = await res.json();
  const session: Session = { cookie, userId: data.user.id, role: data.user.role };

  cache[email] = session;
  writeCache(cache);
  return session;
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  cookie?: string;
}

/** Thin fetch wrapper returning both status and parsed JSON body for API assertions. */
export async function api(path: string, opts: ApiOptions = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.cookie ? { Cookie: opts.cookie } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    redirect: "manual",
  });
  const text = await res.text();
  let json: unknown = undefined;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    // non-JSON response (e.g. HTML page) — leave json undefined
  }
  return { status: res.status, json, text, headers: res.headers };
}
