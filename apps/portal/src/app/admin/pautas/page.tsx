import Link from "next/link";
import { editorialBacklog } from "@/lib/data/editorial-backlog";
import { getArticles } from "@/lib/data/repository";
import { fetchTrendingBR } from "@/lib/agents/trends";
import {
  Clock,
  ShieldAlert,
  ListTodo,
  Search,
  Filter,
  TrendingUp
} from "lucide-react";

export const dynamic = "force-dynamic";

const GRADE = [
  { hora: "08:05", slot: "Notícia em alta", fonte: "Google Trends BR + manchetes", desc: "GPT escolhe o tema do dia e apura em tempo real na web." },
  { hora: "11:05", slot: "Evergreen / Guia", fonte: "Fila curada de pautas", desc: "Consome a fila abaixo. Se zerada, gera temas novos correlacionados." },
  { hora: "14:05", slot: "Evergreen / Guia", fonte: "Fila curada de pautas", desc: "Consome a fila abaixo. Se zerada, gera temas novos correlacionados." },
  { hora: "17:05", slot: "Serviço Prático", fonte: "Passo a passo ou Tutorial", desc: "Guias práticos: como consultar, sacar, calcular ou resolver." },
  { hora: "20:05", slot: "Atualização de Post", fonte: "Reapuração de posts antigos", desc: "Postagem com mais de 20 dias é revisada e atualizada com dados atuais." },
];

export default async function PautasPage({ searchParams }: { searchParams: Promise<{ busca?: string; status?: string; categoria?: string; pagina?: string }> }) {
  const params = await searchParams;
  const busca = params.busca || "";
  const status = params.status || "";
  const categoria = params.categoria || "";
  const page = Math.max(1, parseInt(params.pagina || "1", 10) || 1);

  // Fetch published articles + assuntos em alta agora (Google Trends BR + G1)
  const [articlesList, trending] = await Promise.all([getArticles(), fetchTrendingBR()]);
  const existing = new Set(articlesList.map((a) => a.slug));
  
  // Map backlog rows with their publication status
  const fila = editorialBacklog.map((b) => ({ ...b, publicado: existing.has(b.slug) }));
  
  // Filter backlog rows on server side
  let filteredFila = fila;
  
  if (busca) {
    const q = busca.toLowerCase();
    filteredFila = filteredFila.filter(
      (b) => (b.title && b.title.toLowerCase().includes(q)) || (b.primaryKeyword && b.primaryKeyword.toLowerCase().includes(q))
    );
  }
  
  if (status) {
    const filterPublished = status === "publicado";
    filteredFila = filteredFila.filter((b) => b.publicado === filterPublished);
  }
  
  if (categoria) {
    filteredFila = filteredFila.filter((b) => b.category === categoria);
  }

  // Pagination calculations
  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(filteredFila.length / PAGE_SIZE));
  const pageFila = filteredFila.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Extract categories for filter
  const categories = Array.from(new Set(fila.map((b) => b.category).filter(Boolean)));

  // Pagination helper URL generator
  const getQueryString = (p: number) => {
    const parts = [`pagina=${p}`];
    if (busca) parts.push(`busca=${encodeURIComponent(busca)}`);
    if (status) parts.push(`status=${encodeURIComponent(status)}`);
    if (categoria) parts.push(`categoria=${encodeURIComponent(categoria)}`);
    return `/admin/pautas?${parts.join("&")}`;
  };

  return (
    <div>
      {/* Page Header */}
      <div className="admin-page-header">
        <p className="admin-page-header__eyebrow">Planejamento</p>
        <h1 className="admin-page-header__title">Pautas & Calendário Editorial</h1>
        <p className="admin-page-header__sub">
          Gerencie e acompanhe a grade automática de publicações diárias do portal. A inteligência artificial 
          consome o backlog em horários definidos, aplicando rigorosos critérios de aprovação de qualidade.
        </p>
      </div>

      {/* Em alta agora (Google Trends BR + manchetes G1) */}
      <div className="saas-panel" style={{ marginBottom: "28px" }}>
        <div className="saas-panel__title-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="saas-panel__title">
            <TrendingUp size={18} style={{ color: "var(--admin-accent-light)" }} />
            Em alta agora no Brasil
          </h2>
          <Link href="/admin/configuracoes" style={{ fontSize: "0.82rem", color: "var(--admin-accent)" }}>
            Direcionar pauta em Configurações →
          </Link>
        </div>
        {trending.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {trending.slice(0, 24).map((t, i) => (
              <span key={i} className="saas-badge saas-badge--neutral" title={t.source}
                style={{ padding: "6px 12px", fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "0.68rem", opacity: 0.7 }}>{t.source === "google-trends" ? "🔥" : "📰"}</span>
                {t.title}
              </span>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: "var(--admin-text-secondary)", fontSize: "0.9rem" }}>
            Fontes de trending indisponíveis no momento (Google Trends / G1).
          </p>
        )}
        <p style={{ margin: "12px 0 0", fontSize: "0.78rem", color: "var(--admin-text-muted)" }}>
          O slot de notícia escolhe automaticamente entre estes temas; para priorizar ou proibir assuntos, use as
          Configurações da automação.
        </p>
      </div>

      {/* Grid of Automation Timeline Slots */}
      <h2 className="admin-sidebar__eyebrow" style={{ fontSize: "0.85rem", marginBottom: "16px" }}>
        Grade Horária de Publicações (Brasília) — padrão; personalize em Configurações
      </h2>
      <div className="saas-grid" style={{ marginBottom: "36px" }}>
        {GRADE.map((g) => (
          <div className="saas-card" key={g.hora}>
            <div className="saas-card__header">
              <span className="saas-card__title" style={{ fontSize: "1.1rem", color: "var(--admin-text-primary)" }}>
                {g.hora}
              </span>
              <div className="saas-card__icon-wrap" style={{ backgroundColor: "var(--admin-accent-glow)" }}>
                <Clock size={16} style={{ color: "var(--admin-accent)" }} />
              </div>
            </div>
            
            <div style={{ marginTop: "4px" }}>
              <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--admin-accent)" }}>
                {g.slot}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--admin-text-secondary)", marginTop: "2px" }}>
                Fonte: <strong>{g.fonte}</strong>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", marginTop: "8px", lineHeight: "1.4" }}>
                {g.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Search Form */}
      <form method="GET" action="/admin/pautas" className="saas-filter-form">
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", width: "100%", alignItems: "center" }}>
          <div style={{ position: "relative", flexGrow: 1, minWidth: "240px" }}>
            <input
              type="text"
              name="busca"
              placeholder="Buscar por tema ou palavra-chave..."
              defaultValue={busca}
              className="saas-input"
              style={{ width: "100%", paddingLeft: "32px" }}
            />
            <Search size={14} style={{ position: "absolute", left: "10px", top: "13px", color: "var(--admin-text-muted)" }} />
          </div>

          <select name="status" defaultValue={status} className="saas-select" style={{ minWidth: "160px" }}>
            <option value="">Todos os status</option>
            <option value="publicado">Publicado</option>
            <option value="fila">Na Fila</option>
          </select>

          <select name="categoria" defaultValue={categoria} className="saas-select" style={{ minWidth: "160px" }}>
            <option value="">Todas as categorias</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <button type="submit" className="admin-header__btn admin-header__btn--primary" style={{ padding: "8px 16px" }}>
            Filtrar
          </button>
          
          {(busca || status || categoria) && (
            <Link href="/admin/pautas" className="saas-chip" style={{ display: "inline-flex", alignItems: "center", height: "38px" }}>
              Limpar
            </Link>
          )}
        </div>
      </form>

      {/* Backlog Section */}
      <div className="saas-panel">
        <div className="saas-panel__title-bar">
          <h2 className="saas-panel__title">
            <ListTodo size={18} style={{ color: "var(--admin-accent)" }} />
            Fila Curada de Pautas ({filteredFila.filter(b => !b.publicado).length} pendentes / {filteredFila.length} listadas, exibindo {pageFila.length})
          </h2>
        </div>

        <p className="admin-sub" style={{ color: "var(--admin-text-secondary)", marginBottom: "20px", fontSize: "0.9rem" }}>
          Pautas adicionadas manualmente para guiar a produção da automação. Quando esta fila estiver vazia, o sistema 
          cria pautas originais de forma autônoma.
        </p>

        <div className="saas-table-container">
          <table className="saas-table">
            <colgroup>
              <col style={{ width: "12%" }} />
              <col style={{ width: "38%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "8%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Status</th>
                <th>Tema / Pauta</th>
                <th>Categoria</th>
                <th>Tipo de Post</th>
                <th>Palavra-Chave Foco</th>
                <th>Filtro YMYL</th>
              </tr>
            </thead>
            <tbody>
              {pageFila.map((b) => (
                <tr key={b.slug}>
                  <td>
                    <span className={b.publicado ? "saas-badge saas-badge--success" : "saas-badge saas-badge--warning"}>
                      {b.publicado ? "Publicado" : "Na Fila"}
                    </span>
                  </td>
                  <td className="truncate-cell" style={{ fontWeight: 500 }} title={b.title}>
                    {b.title}
                  </td>
                  <td>
                    <span className="saas-badge saas-badge--neutral">{b.category}</span>
                  </td>
                  <td style={{ color: "var(--admin-text-secondary)" }}>
                    {b.type}
                  </td>
                  <td>
                    <code style={{ fontSize: "0.85rem", color: "var(--admin-text-primary)" }}>{b.primaryKeyword}</code>
                  </td>
                  <td>
                    {b.ymyl ? (
                      <span className="saas-badge saas-badge--error" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <ShieldAlert size={12} /> Sim (Barra 92)
                      </span>
                    ) : (
                      <span className="saas-badge saas-badge--neutral">Não</span>
                    )}
                  </td>
                </tr>
              ))}
              {pageFila.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--admin-text-secondary)", padding: "40px 0" }}>
                    Nenhuma pauta corresponde aos filtros selecionados.
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
          Para adicionar pautas novas à fila de produção curada, você pode atualizar o arquivo de backlog em 
          <code>src/lib/data/editorial-backlog.ts</code>. Notícias quentes de última hora nunca utilizam a fila de backlog.
        </p>
      </div>
    </div>
  );
}
