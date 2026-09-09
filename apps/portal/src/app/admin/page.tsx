import Link from "next/link";
import { getArticles } from "@/lib/data/repository";
import { scoreArticle } from "@/lib/agents/score";
import { getCostData } from "@/lib/cost/generation-log";
import {
  FileText,
  Calendar,
  TrendingUp,
  Award,
  DollarSign,
  Coins,
  Activity,
  Cpu,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  ExternalLink,
  Search,
  Filter
} from "lucide-react";

export const dynamic = "force-dynamic";

const usd = (n: number) => `US$ ${n.toFixed(2)}`;
const BRT = "America/Sao_Paulo";
const dayKey = (d: string | Date) => new Date(d).toLocaleDateString("sv-SE", { timeZone: BRT });
const dayLabel = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

// Reusable Vertical Column Chart with Grid lines and Tooltips
function ColumnChart({ data, format, color }: { data: Array<{ label: string; value: number }>; format?: (v: number) => string; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const height = 150;
  return (
    <div className="saas-chart-container" style={{ padding: "10px 0" }}>
      <div style={{ display: "flex", height: `${height}px`, alignItems: "end", gap: "10px", position: "relative" }}>
        {/* Background Grid Lines */}
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", pointerEvents: "none" }}>
          <div style={{ borderTop: "1px dashed rgba(0,0,0,0.06)", width: "100%", height: 0 }}></div>
          <div style={{ borderTop: "1px dashed rgba(0,0,0,0.06)", width: "100%", height: 0 }}></div>
          <div style={{ borderTop: "1px dashed rgba(0,0,0,0.06)", width: "100%", height: 0 }}></div>
          <div style={{ borderTop: "1px dashed rgba(0,0,0,0.06)", width: "100%", height: 0 }}></div>
        </div>

        {/* Columns */}
        {data.map((d) => {
          const pct = (d.value / max) * 100;
          return (
            <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "end", position: "relative", zIndex: 1 }} className="saas-chart-bar-group">
              {/* Tooltip on hover */}
              <div 
                style={{ 
                  position: "absolute", 
                  bottom: `calc(${pct}% + 8px)`,
                  backgroundColor: "var(--admin-sidebar-bg)",
                  color: "#ffffff",
                  fontSize: "0.72rem",
                  padding: "6px 10px",
                  borderRadius: "4px",
                  pointerEvents: "none",
                  whiteSpace: "nowrap",
                  zIndex: 10,
                  boxShadow: "0 4px 6px rgba(0,0,0,0.15)"
                }}
                className="saas-chart-tooltip"
              >
                {d.label}: {format ? format(d.value) : d.value}
              </div>

              <div 
                style={{ 
                  width: "100%", 
                  height: `${Math.max(4, pct)}%`, 
                  background: color || "linear-gradient(180deg, var(--admin-accent-light), var(--admin-accent))",
                  borderRadius: "4px 4px 0 0",
                  transition: "all 0.3s ease",
                  cursor: "pointer"
                }}
                className="saas-chart-bar"
              />
            </div>
          );
        })}
      </div>
      
      {/* Labels */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", borderTop: "1px solid var(--admin-border)", paddingTop: "8px" }}>
        {data.filter((_, idx) => idx % Math.max(1, Math.ceil(data.length / 6)) === 0).map((d) => (
          <span key={d.label} style={{ fontSize: "0.72rem", color: "var(--admin-text-secondary)", fontWeight: 500 }}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ periodo?: string; inicio?: string; fim?: string }> }) {
  const params = await searchParams;
  const periodo = params.periodo || "30";
  const inicio = params.inicio || "";
  const fim = params.fim || "";

  // Data fetching
  const [articles, costAll] = await Promise.all([getArticles(), getCostData()]);

  // Date filtering logic
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date(now);

  if (periodo === "hoje") {
    startDate.setHours(0, 0, 0, 0);
  } else if (periodo === "7") {
    startDate.setDate(now.getDate() - 7);
  } else if (periodo === "30") {
    startDate.setDate(now.getDate() - 30);
  } else if (periodo === "personalizado" && inicio && fim) {
    startDate = new Date(inicio + "T00:00:00");
    endDate = new Date(fim + "T23:59:59");
  } else {
    // Default fallback to 30 days
    startDate.setDate(now.getDate() - 30);
  }

  // Filter data within chosen range
  const articlesFiltered = articles.filter(
    (a) => new Date(a.publishedAt) >= startDate && new Date(a.publishedAt) <= endDate
  );
  
  const costRowsFiltered = costAll.rows.filter(
    (r) => new Date(r.created_at) >= startDate && new Date(r.created_at) <= endDate
  );

  // Recalculate KPIs (com slugs válidos + recibo de revisão para nota justa)
  const allSlugs = new Set(articles.map((a) => a.slug));
  const scoredFiltered = articlesFiltered.map((a) => ({
    a,
    score: scoreArticle(a, {
      validInternalSlugs: allSlugs,
      humanReview:
        a.reviewer && a.reviewedAt && a.reviewedContentHash && a.reviewedVersionMatches === true
          ? { reviewerId: a.reviewer.id, approvedAt: a.reviewedAt, contentHash: a.reviewedContentHash }
          : undefined,
    }).score,
  }));
  const avgScore = scoredFiltered.length
    ? Math.round(scoredFiltered.reduce((s, x) => s + x.score, 0) / scoredFiltered.length)
    : 0;
  
  const todayKey = dayKey(new Date());
  const postsToday = articles.filter((a) => dayKey(a.publishedAt) === todayKey).length;
  
  const totalCost = costRowsFiltered.reduce((s, r) => s + Number(r.cost_usd), 0);
  const totalTokens = costRowsFiltered.reduce((s, r) => s + r.input_tokens + r.output_tokens, 0);
  const costToday = costAll.byDay.find((d) => d.day === todayKey)?.usd ?? 0;

  // Chart data calculations
  // 1. Posts por dia (based on the selected period width)
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  const maxChartPoints = diffDays > 30 ? 15 : diffDays; // limit chart density for very long ranges

  const postsPerDay: Array<{ label: string; value: number }> = [];
  for (let i = maxChartPoints - 1; i >= 0; i -= 1) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    postsPerDay.push({
      label: dayLabel(key),
      value: articles.filter((a) => dayKey(a.publishedAt) === key).length,
    });
  }

  // 2. Cost per day in selected range
  const costPerDayMap = new Map<string, number>();
  for (const r of costRowsFiltered) {
    const key = dayKey(r.created_at);
    costPerDayMap.set(key, (costPerDayMap.get(key) || 0) + Number(r.cost_usd));
  }

  const costPerDay: Array<{ label: string; value: number }> = [];
  for (let i = maxChartPoints - 1; i >= 0; i -= 1) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    costPerDay.push({
      label: dayLabel(key),
      value: costPerDayMap.get(key) || 0,
    });
  }

  // 3. Distribution of scores in the selected period
  const buckets = [
    { label: "95–100", value: scoredFiltered.filter((x) => x.score >= 95).length },
    { label: "90–94", value: scoredFiltered.filter((x) => x.score >= 90 && x.score < 95).length },
    { label: "85–89", value: scoredFiltered.filter((x) => x.score >= 85 && x.score < 90).length },
    { label: "< 85", value: scoredFiltered.filter((x) => x.score < 85).length },
  ];

  // Recent publications
  const recent = scoredFiltered
    .sort((x, y) => new Date(y.a.publishedAt).getTime() - new Date(x.a.publishedAt).getTime())
    .slice(0, 8);

  const getScoreBadgeClass = (score: number) => {
    if (score >= 92) return "saas-badge saas-badge--success";
    if (score >= 85) return "saas-badge saas-badge--warning";
    return "saas-badge saas-badge--error";
  };

  return (
    <div>
      {/* Page Header */}
      <div className="admin-page-header">
        <p className="admin-page-header__eyebrow">Painel Editorial</p>
        <h1 className="admin-page-header__title">Dashboard Operacional</h1>
        <p className="admin-page-header__sub">
          Visão geral do portal e da automação (5 posts/dia: 08:05, 11:05, 14:05, 17:05 e 20:05 — Horário de Brasília).
        </p>
      </div>

      {/* Date Filter Bar */}
      <div className="saas-filter-row" style={{ marginBottom: "28px" }}>
        <div className="saas-filter-chips">
          <Link href="/admin?periodo=hoje" className={`saas-chip ${periodo === "hoje" ? "saas-chip--active" : ""}`}>Hoje</Link>
          <Link href="/admin?periodo=7" className={`saas-chip ${periodo === "7" ? "saas-chip--active" : ""}`}>7 dias</Link>
          <Link href="/admin?periodo=30" className={`saas-chip ${periodo === "30" ? "saas-chip--active" : ""}`}>30 dias</Link>
          <Link href="/admin?periodo=personalizado" className={`saas-chip ${periodo === "personalizado" ? "saas-chip--active" : ""}`}>Personalizado</Link>
        </div>

        {periodo === "personalizado" && (
          <form method="GET" action="/admin" className="saas-filter-form" style={{ display: "flex", gap: "8px", alignItems: "center", padding: "8px 12px", marginBottom: 0 }}>
            <input type="hidden" name="periodo" value="personalizado" />
            <input type="date" name="inicio" defaultValue={inicio} className="saas-input" required />
            <span style={{ color: "var(--admin-text-secondary)", fontSize: "0.85rem" }}>até</span>
            <input type="date" name="fim" defaultValue={fim} className="saas-input" required />
            <button type="submit" className="admin-header__btn admin-header__btn--primary" style={{ padding: "8px 12px" }}>Aplicar</button>
          </form>
        )}
      </div>

      {/* SaaS KPI Grid */}
      <div className="saas-grid">
        {/* Card 1: Total Posts */}
        <div className="saas-card">
          <div className="saas-card__header">
            <span className="saas-card__title">Posts no Período</span>
            <div className="saas-card__icon-wrap">
              <FileText size={16} />
            </div>
          </div>
          <div className="saas-card__value">{articlesFiltered.length}</div>
          <div className="saas-card__footer">Total geral: {articles.length} posts</div>
        </div>

        {/* Card 2: Posts Hoje */}
        <div className="saas-card">
          <div className="saas-card__header">
            <span className="saas-card__title">Hoje</span>
            <div className="saas-card__icon-wrap">
              <Calendar size={16} />
            </div>
          </div>
          <div className="saas-card__value">{postsToday}</div>
          <div className="saas-card__footer">Disparos nas últimas 24h</div>
        </div>

        {/* Card 3: Nota Média */}
        <div className="saas-card">
          <div className="saas-card__header">
            <span className="saas-card__title">Nota Média</span>
            <div className="saas-card__icon-wrap">
              <Award size={16} />
            </div>
          </div>
          <div className="saas-card__value">{avgScore}</div>
          <div className="saas-card__footer">Auditados no período</div>
        </div>

        {/* Card 4: Custo IA no Período */}
        <div className="saas-card">
          <div className="saas-card__header">
            <span className="saas-card__title">Custo no Período</span>
            <div className="saas-card__icon-wrap">
              <Coins size={16} />
            </div>
          </div>
          <div className="saas-card__value" style={{ color: "var(--admin-accent)" }}>{usd(totalCost)}</div>
          <div className="saas-card__footer">Gasto de API na janela</div>
        </div>

        {/* Card 5: Custo IA Hoje */}
        <div className="saas-card">
          <div className="saas-card__header">
            <span className="saas-card__title">Gasto Hoje</span>
            <div className="saas-card__icon-wrap">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="saas-card__value">{usd(costToday)}</div>
          <div className="saas-card__footer">Estimado do dia atual</div>
        </div>

        {/* Card 6: Tokens no Período */}
        <div className="saas-card">
          <div className="saas-card__header">
            <span className="saas-card__title">Tokens Consumidos</span>
            <div className="saas-card__icon-wrap">
              <Cpu size={16} />
            </div>
          </div>
          <div className="saas-card__value" style={{ fontSize: "1.45rem", paddingTop: "5px" }}>
            {totalTokens.toLocaleString("pt-BR")}
          </div>
          <div className="saas-card__footer">Total de contexto na janela</div>
        </div>
      </div>

      {/* Visual Data Panels - Replaced with premium vertical column charts */}
      <div className="saas-chart-grid">
        <div className="saas-panel">
          <div className="saas-panel__title-bar">
            <h2 className="saas-panel__title">
              <TrendingUp size={18} style={{ color: "var(--admin-accent)" }} />
              Posts Publicados por Dia
            </h2>
          </div>
          <ColumnChart data={postsPerDay} />
        </div>

        <div className="saas-panel">
          <div className="saas-panel__title-bar">
            <h2 className="saas-panel__title">
              <Coins size={18} style={{ color: "var(--admin-accent)" }} />
              Custos Diários de IA (US$)
            </h2>
          </div>
          {costRowsFiltered.length ? (
            <ColumnChart data={costPerDay} format={usd} color="linear-gradient(180deg, #38bdf8, #0284c7)" />
          ) : (
            <p style={{ color: "var(--admin-text-secondary)", fontSize: "0.9rem", padding: "40px 0", textAlign: "center" }}>Sem registros ainda.</p>
          )}
        </div>

        <div className="saas-panel">
          <div className="saas-panel__title-bar">
            <h2 className="saas-panel__title">
              <ShieldCheck size={18} style={{ color: "var(--admin-accent)" }} />
              Distribuição de Notas no Período
            </h2>
          </div>
          <ColumnChart data={buckets} color="linear-gradient(180deg, #34d399, #059669)" />
        </div>
      </div>

      {/* Recent Publications Table Section */}
      <div className="saas-panel">
        <div className="saas-panel__title-bar">
          <h2 className="saas-panel__title">
            <Clock size={18} style={{ color: "var(--admin-accent)" }} />
            Publicações Automáticas no Período
          </h2>
        </div>
        
        <div className="saas-table-container">
          <table className="saas-table">
            <colgroup>
              <col style={{ width: "20%" }} />
              <col style={{ width: "45%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Data de Publicação</th>
                <th>Postagem / Manchete</th>
                <th>Categoria</th>
                <th>Score Editorial</th>
                <th style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(({ a, score }) => (
                <tr key={a.slug}>
                  <td style={{ color: "var(--admin-text-secondary)", whiteSpace: "nowrap" }}>
                    {new Date(a.publishedAt).toLocaleString("pt-BR", {
                      timeZone: BRT,
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="truncate-cell" title={a.headline}>
                    <div style={{ fontWeight: 600, color: "var(--admin-text-primary)" }}>{a.headline}</div>
                  </td>
                  <td>
                    <span className="saas-badge saas-badge--neutral">{a.category}</span>
                  </td>
                  <td>
                    <span className={getScoreBadgeClass(score)}>{score} / 100</span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link
                      href={`/artigos/${a.slug}`}
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
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "var(--admin-text-secondary)", padding: "20px 0" }}>
                    Nenhum post publicado nesta janela de datas.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <p className="saas-note">
          <strong>Nota de Qualidade Editorial:</strong> A pontuação é baseada no portão automático de qualidade 
          (mínimo de 92 para Finanças/YMYL e 85 para as demais categorias). Posts que ficam abaixo dessa linha de corte 
          nunca são autorizados ou publicados pela automação.
        </p>
      </div>
    </div>
  );
}
