"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

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

type CostLogRow = {
  created_at: string;
  stage?: string | null;
  kind?: string | null;
  provider?: string | null;
  model?: string | null;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number | string;
};

export type CostRowGroup = {
  title: string;
  lastAt: string;
  tokens: number;
  usd: number;
  rows: CostLogRow[];
};

export function ExpandableCostRow({ group }: { group: CostRowGroup }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr 
        onClick={() => setExpanded(!expanded)} 
        style={{ cursor: "pointer", transition: "background-color 0.2s" }}
        className={expanded ? "cost-row-expanded" : ""}
      >
        <td className="truncate-cell" title={group.title}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 500, color: "var(--admin-text-primary)" }}>
            <span style={{ color: "var(--admin-text-muted)" }}>
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{group.title}</span>
          </div>
        </td>
        <td style={{ color: "var(--admin-text-secondary)", whiteSpace: "nowrap" }}>
          {fmtDateTime(group.lastAt)}
        </td>
        <td style={{ color: "var(--admin-text-secondary)" }}>
          {group.tokens.toLocaleString("pt-BR")} tokens
        </td>
        <td>
          <span className="saas-badge saas-badge--neutral">{group.rows.length} etapas</span>
        </td>
        <td style={{ textAlign: "right", fontWeight: 600, color: "var(--admin-text-primary)" }}>
          {usd(group.usd)}
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={5} style={{ padding: "0 20px 20px 20px", backgroundColor: "#fdfdfd", borderBottom: "1px solid var(--admin-border)" }}>
            <div className="saas-table-container" style={{ marginTop: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <table className="saas-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ backgroundColor: "#f1f5f9" }}>Executado em</th>
                    <th style={{ backgroundColor: "#f1f5f9" }}>Etapa da Automação</th>
                    <th style={{ backgroundColor: "#f1f5f9" }}>Provedor / Modelo Utilizado</th>
                    <th style={{ backgroundColor: "#f1f5f9" }}>Tokens Consumidos</th>
                    <th style={{ backgroundColor: "#f1f5f9", textAlign: "right" }}>Custo da Chamada</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((r, i) => (
                    <tr key={i} style={{ backgroundColor: "#ffffff" }}>
                      <td style={{ color: "var(--admin-text-secondary)", whiteSpace: "nowrap" }}>
                        {fmtDateTime(r.created_at)}
                      </td>
                      <td>
                        {getStageBadge(r.stage || (r.kind === "image" ? "imagem" : "texto"))}
                      </td>
                      <td>
                        <code style={{ fontSize: "0.85rem", color: "var(--admin-text-primary)" }}>
                          {r.provider} / {r.model}
                        </code>
                      </td>
                      <td style={{ color: "var(--admin-text-secondary)" }}>
                        {(r.input_tokens + r.output_tokens).toLocaleString("pt-BR")}
                      </td>
                      <td style={{ fontWeight: 600, color: "var(--admin-text-primary)", textAlign: "right" }}>
                        {usd(Number(r.cost_usd))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
