import Link from "next/link";
import { getArticles } from "@/lib/data/repository";
import { scoreArticle } from "@/lib/agents/score";
import {
  ShieldCheck,
  Award,
  BookOpen,
  ArrowUpRight,
  Search,
  Filter
} from "lucide-react";

export const dynamic = "force-dynamic";

function scoreColor(score: number, passes: boolean): string {
  if (passes) return "var(--admin-success)";
  if (score >= 70) return "var(--admin-warning)";
  return "var(--admin-error)";
}

export default async function QualidadePage({ searchParams }: { searchParams: Promise<{ busca?: string; status?: string; pagina?: string }> }) {
  const params = await searchParams;
  const busca = params.busca || "";
  const status = params.status || "";
  const page = Math.max(1, parseInt(params.pagina || "1", 10) || 1);

  // Fetch articles and score them com o contexto real do acervo: slugs válidos
  // para a malha interna e o recibo de revisão humana (quando presente e íntegro).
  const articles = await getArticles();
  const validInternalSlugs = new Set(articles.map((a) => a.slug));
  const scored = articles.map((a) =>
    scoreArticle(a, {
      validInternalSlugs,
      humanReview:
        a.reviewer && a.reviewedAt && a.reviewedContentHash && a.reviewedVersionMatches === true
          ? { reviewerId: a.reviewer.id, approvedAt: a.reviewedAt, contentHash: a.reviewedContentHash }
          : undefined,
    }),
  );

  // Apply filters on server side
  let filteredScored = scored;

  if (busca) {
    const q = busca.toLowerCase();
    filteredScored = filteredScored.filter(
      (a) => (a.headline && a.headline.toLowerCase().includes(q)) || (a.category && a.category.toLowerCase().includes(q))
    );
  }

  if (status) {
    const filterPasses = status === "publicavel";
    filteredScored = filteredScored.filter((a) => a.passes === filterPasses);
  }

  // Sort: worst score first (ascending)
  filteredScored.sort((a, b) => a.score - b.score);

  // Pagination calculations
  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(filteredScored.length / PAGE_SIZE));
  const pageScored = filteredScored.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Calculate statistics (based on entire dataset to reflect overall system state)
  const total = scored.length;
  const avg = total ? Math.round(scored.reduce((s, a) => s + a.score, 0) / total) : 0;
  const belowBar = scored.filter((a) => !a.passes).length;
  const ymylBelow = scored.filter((a) => a.sensitive && !a.passes).length;

  const getScoreBadgeClass = (score: number, passes: boolean) => {
    if (passes) return "saas-badge saas-badge--success";
    if (score >= 75) return "saas-badge saas-badge--warning";
    return "saas-badge saas-badge--error";
  };

  // Pagination helper URL generator
  const getQueryString = (p: number) => {
    const parts = [`pagina=${p}`];
    if (busca) parts.push(`busca=${encodeURIComponent(busca)}`);
    if (status) parts.push(`status=${encodeURIComponent(status)}`);
    return `/admin/qualidade?${parts.join("&")}`;
  };

  return (
    <div>
      {/* Page Header */}
      <div className="admin-page-header">
        <p className="admin-page-header__eyebrow">Qualidade Editorial</p>
        <h1 className="admin-page-header__title">Score de Qualidade Automático</h1>
        <p className="admin-page-header__sub">
          Auditoria determinística contínua de todo o acervo. A barra mínima de qualidade é de 85 pontos no geral, 
          elevada para 92 em tópicos sensíveis YMYL (Finanças, Saúde, Segurança).
        </p>
      </div>

      {/* KPI Cards Grid for Quality Metrics */}
      <div className="saas-grid">
        <div className="saas-card">
          <div className="saas-card__header">
            <span className="saas-card__title">Artigos Auditados</span>
            <div className="saas-card__icon-wrap">
              <BookOpen size={16} />
            </div>
          </div>
          <div className="saas-card__value">{total}</div>
          <div className="saas-card__footer">Total de posts na base</div>
        </div>

        <div className="saas-card">
          <div className="saas-card__header">
            <span className="saas-card__title">Média Geral</span>
            <div className="saas-card__icon-wrap">
              <Award size={16} />
            </div>
          </div>
          <div className="saas-card__value" style={{ color: scoreColor(avg, avg >= 85) }}>
            {avg} <span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--admin-text-muted)" }}>/100</span>
          </div>
          <div className="saas-card__footer">Alvo de publicação: &gt;85</div>
        </div>

        <div className="saas-card">
          <div className="saas-card__header">
            <span className="saas-card__title">Abaixo da Barra</span>
            <div className="saas-card__icon-wrap" style={{ borderColor: belowBar ? "rgba(239,68,68,0.2)" : "" }}>
              <Award size={16} style={{ color: belowBar ? "var(--admin-error)" : "var(--admin-success)" }} />
            </div>
          </div>
          <div className="saas-card__value" style={{ color: belowBar ? "var(--admin-error)" : "var(--admin-success)" }}>
            {belowBar}
          </div>
          <div className="saas-card__footer">Necessitam de revisão manual</div>
        </div>

        <div className="saas-card">
          <div className="saas-card__header">
            <span className="saas-card__title">Filtro YMYL &lt; 92</span>
            <div className="saas-card__icon-wrap" style={{ borderColor: ymylBelow ? "rgba(239,68,68,0.2)" : "" }}>
              <Award size={16} style={{ color: ymylBelow ? "var(--admin-error)" : "var(--admin-success)" }} />
            </div>
          </div>
          <div className="saas-card__value" style={{ color: ymylBelow ? "var(--admin-error)" : "var(--admin-success)" }}>
            {ymylBelow}
          </div>
          <div className="saas-card__footer">Sensíveis abaixo da nota mínima</div>
        </div>
      </div>

      {/* Table Filter Form */}
      <form method="GET" action="/admin/qualidade" className="saas-filter-form">
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", width: "100%", alignItems: "center" }}>
          <div style={{ position: "relative", flexGrow: 1, minWidth: "240px" }}>
            <input
              type="text"
              name="busca"
              placeholder="Buscar por título ou conteúdo..."
              defaultValue={busca}
              className="saas-input"
              style={{ width: "100%", paddingLeft: "32px" }}
            />
            <Search size={14} style={{ position: "absolute", left: "10px", top: "13px", color: "var(--admin-text-muted)" }} />
          </div>

          <select name="status" defaultValue={status} className="saas-select" style={{ minWidth: "160px" }}>
            <option value="">Todos os status</option>
            <option value="publicavel">Publicável</option>
            <option value="revisar">Revisar</option>
          </select>

          <button type="submit" className="admin-header__btn admin-header__btn--primary" style={{ padding: "8px 16px" }}>
            Filtrar
          </button>
          
          {(busca || status) && (
            <Link href="/admin/qualidade" className="saas-chip" style={{ display: "inline-flex", alignItems: "center", height: "38px" }}>
              Limpar
            </Link>
          )}
        </div>
      </form>

      {/* Audit Detail Table Section */}
      <div className="saas-panel">
        <div className="saas-panel__title-bar">
          <h2 className="saas-panel__title">
            <ShieldCheck size={18} style={{ color: "var(--admin-accent)" }} />
            Lista Geral de Auditorias ({filteredScored.length} listadas, exibindo {pageScored.length})
          </h2>
        </div>

        <div className="saas-table-container">
          <table className="saas-table">
            <colgroup>
              <col style={{ width: "10%" }} />
              <col style={{ width: "35%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "25%" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ width: "90px" }}>Score</th>
                <th>Artigo / Título</th>
                <th>Categoria</th>
                <th>Status Final</th>
                <th>Deficiências Identificadas</th>
              </tr>
            </thead>
            <tbody>
              {pageScored.map((a) => (
                <tr key={a.slug}>
                  <td>
                    <span 
                      className={getScoreBadgeClass(a.score, a.passes)}
                      style={{ fontSize: "0.85rem", padding: "6px 12px", minWidth: "60px", display: "inline-flex", justifyContent: "center" }}
                    >
                      {a.score} / 100
                    </span>
                  </td>
                  <td className="truncate-cell" style={{ fontWeight: 500 }} title={a.headline}>
                    <Link
                      href={`/artigos/${a.slug}`}
                      target="_blank"
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {a.headline} <ArrowUpRight size={12} style={{ color: "var(--admin-text-muted)" }} />
                    </Link>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      <span className="saas-badge saas-badge--neutral">{a.category}</span>
                      {a.sensitive && (
                        <span className="saas-badge saas-badge--error" style={{ fontSize: "0.7rem", padding: "2px 6px" }}>
                          YMYL
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, color: a.passes ? "var(--admin-success)" : "var(--admin-error)" }}>
                    {a.passes ? "✓ Publicável" : "✗ Revisar"}
                  </td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {a.missing.length ? (
                        a.missing.map((criteria, idx) => (
                          <span 
                            key={idx} 
                            className="saas-badge saas-badge--neutral" 
                            style={{ 
                              fontSize: "0.7rem", 
                              color: "var(--admin-text-secondary)",
                              backgroundColor: "rgba(0,0,0,0.02)",
                              border: "1px dashed var(--admin-border)"
                            }}
                          >
                            {criteria}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: "var(--admin-text-muted)", fontSize: "0.8rem" }}>—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {pageScored.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "var(--admin-text-secondary)", padding: "40px 0" }}>
                    Nenhuma auditoria corresponde aos filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        {totalPages > 1 ? (
          <div className="saas-filter-row" style={{ marginTop: "24px", justifyContent: "center", marginBottom: 0 }}>
            <div className="saas-filter-chips">
              {page > 1 ? (
                <Link className="saas-chip" href={getQueryString(page - 1)}>
                  ← Anterior
                </Link>
              ) : null}
              
              <span className="saas-chip saas-chip--static">
                Página {page} de {totalPages}
              </span>
              
              {page < totalPages ? (
                <Link className="saas-chip" href={getQueryString(page + 1)}>
                  Próxima →
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        <p className="saas-note">
          <strong>Regras de Score Determinístico:</strong> Esta análise não utiliza recursos de inteligência artificial generativa. 
          Ela audita a estrutura HTML e os metadados de cada post: profundidade do texto, presença de fontes e links oficiais externos.
        </p>
      </div>
    </div>
  );
}
