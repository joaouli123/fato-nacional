import { getPayload } from "payload";
import config from "@payload-config";
import { ReviewQueue, type ReviewItem } from "@/components/admin/review-queue";

export const dynamic = "force-dynamic";

// Fila de revisão humana: artigos sensíveis (YMYL) e rascunhos aguardando aprovação.
// A aprovação estampa o recibo de revisão com o usuário logado (hook oficial do CMS).
export default async function RevisaoPage() {
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

  const items: ReviewItem[] = res.docs.map((d) => {
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

  return (
    <div>
      <div className="admin-page-header">
        <p className="admin-page-header__eyebrow">Editorial</p>
        <h1 className="admin-page-header__title">Revisão humana</h1>
        <p className="admin-page-header__sub">
          Conteúdo sensível (finanças, saúde, direito, política, segurança) só vai ao ar com a sua aprovação.
          Leia no CMS, edite se necessário e aprove aqui — o recibo de revisão é estampado automaticamente.
        </p>
      </div>
      <ReviewQueue initialItems={items} />
    </div>
  );
}
