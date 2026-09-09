import Link from "next/link";
import { getArticles } from "@/lib/data/repository";
import {
  Search,
  Plus,
  ExternalLink,
  BookOpen,
  Filter
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ busca?: string; categoria?: string; inicio?: string; fim?: string; pagina?: string }> }) {
  const params = await searchParams;
  const busca = params.busca || "";
  const categoria = params.categoria || "";
  const inicio = params.inicio || "";
  const fim = params.fim || "";
  const page = Math.max(1, parseInt(params.pagina || "1", 10) || 1);

  // Fetch all articles
  const articles = await getArticles();

  // Apply filters on server side
  let filtered = articles;
  
  if (busca) {
    const q = busca.toLowerCase();
    filtered = filtered.filter(
      (a) => (a.headline && a.headline.toLowerCase().includes(q)) || (a.description && a.description.toLowerCase().includes(q))
    );
  }
  
  if (categoria) {
    filtered = filtered.filter((a) => a.category === categoria);
  }
  
  if (inicio) {
    filtered = filtered.filter((a) => new Date(a.publishedAt) >= new Date(inicio + "T00:00:00"));
  }
  
  if (fim) {
    filtered = filtered.filter((a) => new Date(a.publishedAt) <= new Date(fim + "T23:59:59"));
  }

  // Pagination calculations
  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageArticles = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Categories list for select dropdown filter
  const categories = Array.from(new Set(articles.map((a) => a.category).filter(Boolean)));

  // Pagination helper URL generator
  const getQueryString = (p: number) => {
    const parts = [`pagina=${p}`];
    if (busca) parts.push(`busca=${encodeURIComponent(busca)}`);
    if (categoria) parts.push(`categoria=${encodeURIComponent(categoria)}`);
    if (inicio) parts.push(`inicio=${inicio}`);
    if (fim) parts.push(`fim=${fim}`);
    return `/admin/artigos?${parts.join("&")}`;
  };

  return (
    <div>
      {/* Page Header */}
      <div className="admin-page-header">
        <p className="admin-page-header__eyebrow">Conteúdo</p>
        <h1 className="admin-page-header__title">Acervo de Artigos ({filtered.length})</h1>
        <p className="admin-page-header__sub">
          Gerenciamento e listagem geral de todas as matérias publicadas no portal.
        </p>
      </div>

      {/* Table Filter Form */}
      <form method="GET" action="/admin/artigos" className="saas-filter-form">
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

          <select name="categoria" defaultValue={categoria} className="saas-select" style={{ minWidth: "160px" }}>
            <option value="">Todas as categorias</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <input type="date" name="inicio" defaultValue={inicio} className="saas-input" />
          <span style={{ color: "var(--admin-text-secondary)", fontSize: "0.85rem" }}>até</span>
          <input type="date" name="fim" defaultValue={fim} className="saas-input" />

          <button type="submit" className="admin-header__btn admin-header__btn--primary" style={{ padding: "8px 16px" }}>
            Filtrar
          </button>
          
          {(busca || categoria || inicio || fim) && (
            <Link href="/admin/artigos" className="saas-chip" style={{ display: "inline-flex", alignItems: "center", height: "38px" }}>
              Limpar
            </Link>
          )}
        </div>
      </form>

      {/* Main Panel */}
      <div className="saas-panel">
        <div className="saas-panel__title-bar">
          <h2 className="saas-panel__title">
            <BookOpen size={18} style={{ color: "var(--admin-accent)" }} />
            Artigos Publicados ({pageArticles.length} exibidos)
          </h2>
          
          <Link href="/cms/collections/articles" target="_blank" className="admin-header__btn admin-header__btn--primary">
            <Plus size={14} /> Novo Artigo (CMS)
          </Link>
        </div>

        <div className="saas-table-container">
          <table className="saas-table">
            <colgroup>
              <col style={{ width: "45%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "30%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Título / Headline</th>
                <th>Categoria</th>
                <th>Slug de URL</th>
                <th style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageArticles.map((article) => (
                <tr key={article.slug}>
                  <td className="truncate-cell" title={article.headline + "\n" + article.description}>
                    <div style={{ fontWeight: 600, color: "var(--admin-text-primary)", marginBottom: "4px" }}>
                      {article.headline}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--admin-text-secondary)", lineHeight: "1.4" }}>
                      {article.description}
                    </div>
                  </td>
                  <td>
                    <span className="saas-badge saas-badge--neutral">{article.category}</span>
                  </td>
                  <td>
                    <code style={{ fontSize: "0.8rem", color: "var(--admin-text-secondary)" }}>
                      /{article.slug}
                    </code>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link
                      href={`/artigos/${article.slug}`}
                      target="_blank"
                      className="admin-header__btn"
                      style={{ padding: "8px" }}
                      title="Ver no Site"
                    >
                      <ExternalLink size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
              {pageArticles.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "var(--admin-text-secondary)", padding: "40px 0" }}>
                    Nenhum artigo corresponde aos filtros aplicados.
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
      </div>
    </div>
  );
}
