import { NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

let pool: Pool | null = null;
let tableReady = false;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  }
  return pool;
}

// Self-initializing: creates the subscribers table on first use (idempotent),
// so no separate migration is needed.
async function ensureTable(): Promise<void> {
  if (tableReady) return;
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      source TEXT NOT NULL DEFAULT 'site',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  tableReady = true;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { name?: string; email?: string };
    const name = String(body.name ?? "").trim().slice(0, 120);
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase()
      .slice(0, 200);

    if (!name || !EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, error: "Informe nome e um e-mail válido." }, { status: 400 });
    }

    await ensureTable();
    await getPool().query(
      `INSERT INTO newsletter_subscribers (name, email) VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name`,
      [name, email],
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Não foi possível concluir a inscrição." }, { status: 500 });
  }
}
