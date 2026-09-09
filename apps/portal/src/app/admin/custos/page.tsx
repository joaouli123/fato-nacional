import Link from "next/link";
import { getCostData, type CostRow } from "@/lib/cost/generation-log";
import {
  Coins,
  Cpu,
  Brain,
  Layers,
  Search,
  Filter
} from "lucide-react";
import { ExpandableCostRow } from "@/components/admin/expandable-cost-row";

export const dynamic = "force-dynamic";

const usd = (n: number) => `US$ ${n.toFixed(n > 0 && n < 0.01 ? 4 : 2)}`;
const BRT = "America/Sao_Paulo";
const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("pt-BR", {
    timeZone: BRT,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });

type Group = {
  key: string;
  title: string;
  slug: string | null;
  lastAt: string;
  usd: number;
  tokens: number;
  rows: CostRow[];
};

const PAGE_SIZE = 20;

export default async function CustosPage({ searchParams }: { searchParams: Promise<{ busca?: string; provedor?: string; inicio?: string; fim?: string; pagina?: string }> }) {
  const params = await searchParams;
  const busca = params.busca || "";
  const provedor = params.provedor || "";
  const inicio = params.inicio || "";
  const fim = params.fim || "";
  const page = Math.max(1, parseInt(params.pagina || "1", 10) || 1);

  // Fetch all cost records
  const data = await getCostData();

  // Apply filters on the raw rows
  let filteredRows = data.rows;
  
  if (busca) {
    const q = busca.toLowerCase();
    filteredRows = filteredRows.filter(
      (r) => (r.title && r.title.toLowerCase().includes(q)) || (r.slug && r.slug.toLowerCase().includes(q))
    );
  }
  
  if (provedor) {
    filteredRows = filteredRows.filter((r) => r.provider && r.provider.toLowerCase() === provedor.toLowerCase());
  }
  
  if (inicio) {
    filteredRows = filteredRows.filter((r) => new Date(r.created_at) >= new Date(inicio + "T00:00:00"));
  }
  
  if (fim) {
    filteredRows = filteredRows.filter((r) => new Date(r.created_at) <= new Date(fim + "T23:59:59"));
  }

  // Recalculate totals for the filtered subset
  const totalUsdFiltered = filteredRows.reduce((sum, r) => sum + Number(r.cost_usd), 0);
  const totalTokensFiltered = filteredRows.reduce((sum, r) => sum + r.input_tokens + r.output_tokens, 0);
  const totalCallsFiltered = filteredRows.length;

  // Provider breakdown calculations on filtered data
  const providersMap = new Map<string, { count: number; usd: number }>();
  for (const r of filteredRows) {
    const p = r.provider || "Outros";
    let entry = providersMap.get(p);
    if (!entry) {
      entry = { count: 0, usd: 0 };
      providersMap.set(p, entry);
    }
    entry.count += 1;
    entry.usd += Number(r.cost_usd);
  }
  const byProviderFiltered = [...providersMap.entries()].map(([provider, entry]) => ({
    provider,
    count: entry.count,
    usd: entry.usd,
  })).sort((a, b) => b.usd - a.usd);

  // Group filtered rows by post (slug)
  const map = new Map<string, Group>();
  for (const r of filteredRows) {
    const key = r.slug || "(outros)";
    let g = map.get(key);
    if (!g) {
      g = { key, title: r.title || r.slug || "Outros", slug: r.slug, lastAt: r.created_at, usd: 0, tokens: 0, rows: [] };
      map.set(key, g);
    }
    g.usd += Number(r.cost_usd);
    g.tokens += r.input_tokens + r.output_tokens;
    g.rows.push(r);
    if (new Date(r.created_at) > new Date(g.lastAt)) g.lastAt = r.created_at;
  }
  
  const groups = [...map.values()].sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
  const totalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  const pageGroups = groups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Pagination helper URL generator
  const getQueryString = (p: number) => {
    const parts = [`pagina=${p}`];
    if (busca) parts.push(`busca=${encodeURIComponent(busca)}`);
    if (provedor) parts.push(`provedor=${encodeURIComponent(provedor)}`);
    if (inicio) parts.push(`inicio=${inicio}`);
    if (fim) parts.push(`fim=${fim}`);
    return `/admin/custos?${parts.join("&")}`;
  };

  const getStageBadge = (stage: string) => {
    switch (stage?.toLowerCase()) {
      case "research":
      case "pesquisa":
        return <span className="saas-badge saas-badge--info">pesquisa</span>;
      case "writing":
      case "escrita":
        return <span className="saas-badge saas-badge--neutral">escrita</span>;
      case "fact_check":
      case "fact-check":
        return <span className="saas-badge saas-badge--success">factcheck</span>;
      case "editing":
      case "lapidação":
      case "editor":
        return <span className="saas-badge saas-badge--warning">lapidação</span>;
      case "seo":
        return <span className="saas-badge saas-badge--success">SEO</span>;
      default:
        return <span className="saas-badge saas-badge--neutral">{stage || "geral"}</span>;
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="admin-page-header">
        <p className="admin-page-header__eyebrow">Operação</p>
        <h1 className="admin-page-header__title">Custos e Geração de IA</h1>
        <p className="admin-page-header__sub">
          Detalhamento financeiro das etapas automáticas: pauta, pesquisa, escrita, revisão de fatos, lapidação e validação de SEO.
        </p>
      </div>

      {/* Filter and Search Form */}
      <form method="GET" action="/admin/custos" className="saas-filter-form">
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", width: "100%", alignItems: "center" }}>
          <div style={{ position: "relative", flexGrow: 1, minWidth: "200px" }}>
            <input
              type="text"
              name="busca"
              placeholder="Buscar título de pauta ou slug..."
              defaultValue={busca}
              className="saas-input"
              style={{ width: "100%", paddingLeft: "32px" }}
            />
            <Search size={14} style={{ position: "absolute", left: "10px", top: "13px", color: "var(--admin-text-muted)" }} />
          </div>

          <select name="provedor" defaultValue={provedor} className="saas-select" style={{ minWidth: "160px" }}>
            <option value="">Todos os provedores</option>
            <option value="OpenAI">OpenAI</option>
            <option value="Anthropic">Anthropic</option>
            <option value="OpenCode Zen">OpenCode Zen</option>
          </select>

          <input type="date" name="inicio" defaultValue={inicio} className="saas-input" />
          <span style={{ color: "var(--admin-text-secondary)", fontSize: "0.85rem" }}>até</span>
          <input type="date" name="fim" defaultValue={fim} className="saas-input" />

          <button type="submit" className="admin-header__btn admin-header__btn--primary" style={{ padding: "8px 16px" }}>
            Filtrar
          </button>
          
          {(busca || provedor || inicio || fim) && (
            <Link href="/admin/custos" className="saas-chip" style={{ display: "inline-flex", alignItems: "center", height: "38px" }}>
              Limpar
            </Link>
          )}
        </div>
      </form>

      {/* SaaS KPI Grid for Costs */}
      <div className="saas-grid">
        <div className="saas-card">
          <div className="saas-card__header">
            <span className="saas-card__title">Total no Período</span>
            <div className="saas-card__icon-wrap">
              <Coins size={16} />
            </div>
          </div>
          <div className="saas-card__value" style={{ color: "var(--admin-accent)" }}>
            {usd(totalUsdFiltered)}
          </div>
          <div className="saas-card__footer">Total geral: {usd(data.totalUsd)}</div>
        </div>

        <div className="saas-card">
          <div className="saas-card__header">
            <span className="saas-card__title">Chamadas de IA</span>
            <div className="saas-card__icon-wrap">
              <Layers size={16} />
            </div>
          </div>
          <div className="saas-card__value">{totalCallsFiltered}</div>
          <div className="saas-card__footer">Geral: {data.count} requisições</div>
        </div>

        <div className="saas-card">
          <div className="saas-card__header">
            <span className="saas-card__title">Tokens Consumidos</span>
            <div className="saas-card__icon-wrap">
              <Cpu size={16} />
            </div>
          </div>
          <div className="saas-card__value" style={{ fontSize: "1.45rem", paddingTop: "5px" }}>
            {totalTokensFiltered.toLocaleString("pt-BR")}
          </div>
          <div className="saas-card__footer">Geral: {data.tokens.toLocaleString("pt-BR")}</div>
        </div>

        {/* Dynamic Provider Cards based on filtered data */}
        {byProviderFiltered.slice(0, 3).map((p, idx) => (
          <div className="saas-card" key={p.provider}>
            <div className="saas-card__header">
              <span className="saas-card__title">
                {p.provider} · {p.count} reqs
              </span>
              <div className="saas-card__icon-wrap">
                <Brain size={14} />
              </div>
            </div>
            <div className="saas-card__value" style={{ fontSize: "1.35rem" }}>
              {usd(p.usd)}
            </div>
            <div className="saas-card__footer">
              Provedor #{idx + 1} filtrado
            </div>
          </div>
        ))}
      </div>

      {/* Main cost groups panel */}
      <div className="saas-panel">
        <div className="saas-panel__title-bar">
          <h2 className="saas-panel__title">
            <Coins size={18} style={{ color: "var(--admin-accent)" }} />
            Relatório de Custos por Postagem ({groups.length})
          </h2>
          <span style={{ fontSize: "0.8rem", color: "var(--admin-text-muted)" }}>
            Clique na postagem para expandir a auditoria de etapas
          </span>
        </div>

        <div className="saas-table-container">
          <table className="saas-table">
            <colgroup>
              <col style={{ width: "40%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "15%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Postagem / Título</th>
                <th>Última Geração</th>
                <th>Tokens</th>
                <th>Etapas</th>
                <th style={{ textAlign: "right" }}>Custo Estimado</th>
              </tr>
            </thead>
            <tbody>
              {pageGroups.map((g) => (
                <ExpandableCostRow key={g.key} group={g} />
              ))}
              {groups.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "var(--admin-text-secondary)", padding: "40px 0" }}>
                    Nenhum post correspondente aos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {groups.length === 0 ? (
          <p style={{ color: "var(--admin-text-secondary)", textAlign: "center", padding: "40px 0" }}>
            Nenhum post correspondente aos filtros.
          </p>
        ) : null}

        {/* Pagination Section */}
        {totalPages > 1 ? (
          <div className="saas-filter-row" style={{ marginTop: "24px", justifyContent: "center" }}>
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
          Os custos listados acima são calculados com base nos preços de tabela pública fornecidos pelas APIs da OpenAI, 
          Anthropic e OpenCode Zen. Fotos são obtidas a partir de bancos gratuitos (Pexels, Pixabay, Openverse), sem custo.
        </p>
      </div>
    </div>
  );
}
