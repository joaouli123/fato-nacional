import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { authenticatePayload } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fila de revisão humana do /admin.
// GET  → lista artigos aguardando revisão (status human_review ou rascunhos sensíveis).
// POST → { id } aprova e publica; o hook oficial estampa o recibo com o usuário logado.
// Auth: SOMENTE sessão Payload com papel admin/reviewer (o recibo exige um humano real —
// tokens de automação não podem aprovar).

const REVIEWER_ROLES = new Set(["admin", "reviewer"]);

async function sessionUser(request: Request) {
  try {
    const { user } = await authenticatePayload(request.headers);
    const role = (user as { role?: string } | null)?.role || "";
    if (user && REVIEWER_ROLES.has(role)) return user;
  } catch {
    // sem sessão
  }
  return null;
}

export async function GET(request: Request) {
  const user = await sessionUser(request);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const payload = await getPayload({ config });
  const res = await payload.find({
    collection: "articles",
    where: {
      or: [
        { status: { equals: "human_review" } },
        { and: [{ _status: { equals: "draft" } }, { riskLevel: { equals: "high" } }] },
      ],
    },
    sort: "-updatedAt",
    limit: 50,
    depth: 1,
    draft: true,
    overrideAccess: true,
  });

  const items = res.docs.map((d) => {
    const doc = d as {
      id: number | string; headline?: string; slug?: string; updatedAt?: string;
      riskLevel?: string; status?: string;
      primaryCategory?: { name?: string; slug?: string } | number | null;
    };
    const category = typeof doc.primaryCategory === "object" && doc.primaryCategory
      ? doc.primaryCategory.name || doc.primaryCategory.slug || ""
      : "";
    return {
      id: doc.id,
      headline: doc.headline || doc.slug || String(doc.id),
      slug: doc.slug || "",
      category,
      riskLevel: doc.riskLevel || "low",
      status: doc.status || "",
      updatedAt: doc.updatedAt || null,
    };
  });

  return NextResponse.json({ ok: true, items }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await sessionUser(request);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { id?: number | string } | null;
  if (!body?.id) return NextResponse.json({ ok: false, error: "id obrigatório" }, { status: 400 });

  const payload = await getPayload({ config });
  try {
    const updated = await payload.update({
      collection: "articles",
      id: body.id,
      data: {
        status: "published",
        _status: "published",
        editorialUpdatedAt: new Date().toISOString(),
      },
      user: { ...user, collection: "users" },
      overrideAccess: true,
    });
    return NextResponse.json({
      ok: true,
      id: updated.id,
      slug: (updated as { slug?: string }).slug,
      reviewer: user.email,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message.slice(0, 300) }, { status: 400 });
  }
}
