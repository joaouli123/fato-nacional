import { taskModel } from "@/lib/agents/model-router";
import { providerHealth } from "@/lib/agents/provider";
import {
  Cpu,
  Server,
  Zap,
  Bot,
  Terminal,
  Activity,
  Layers,
  Settings,
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";

export const dynamic = "force-dynamic";

const PAPEIS: Array<{ task: keyof typeof taskModel; nome: string; papel: string }> = [
  { task: "research", nome: "Pesquisador de Contexto", papel: "Busca informações atualizadas em tempo real na web e consulta fontes governamentais/oficiais antes de redigir." },
  { task: "writing", nome: "Redator Principal", papel: "Gera a estrutura e redação do post: títulos otimizados para SEO, hierarquia H2/H3, tabelas de dados e FAQ." },
  { task: "fact_check", nome: "Checador de Fatos", papel: "Realiza cross-reference entre as afirmações e números gerados contra as fontes oficiais retornadas pela pesquisa." },
  { task: "editing", nome: "Lapidador Editorial", papel: "Reescreve trechos formais, remove marcas linguísticas de IA e garante fluidez humana no tom de voz." },
  { task: "seo", nome: "Validador de SEO Técnico", papel: "Verifica regras on-page: limite de caracteres em títulos/metas, palavras-chave em subtítulos e densidade de links." },
  { task: "audit", nome: "Auditor Geral", papel: "Mapeamento final do score de qualidade e autorizações de publicação." },
  { task: "triage", nome: "Orquestrador de Triagem", papel: "Classificações prévias de gravidade, risco e tópicos sensíveis." },
];

export default function AgentesPage() {
  const health = providerHealth();

  const getStatusModule = (providerName: string, isOk: boolean, warningText?: string) => {
    return (
      <div className="saas-card" style={{ borderColor: isOk ? "rgba(16,185,129,0.15)" : warningText ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)" }}>
        <div className="saas-card__header">
          <span className="saas-card__title">{providerName}</span>
          <div className="saas-card__icon-wrap" style={{ backgroundColor: isOk ? "var(--admin-success-bg)" : warningText ? "var(--admin-warning-bg)" : "var(--admin-error-bg)" }}>
            <Server size={16} style={{ color: isOk ? "var(--admin-success)" : warningText ? "var(--admin-warning)" : "var(--admin-error)" }} />
          </div>
        </div>
        
        <div className="saas-card__value" style={{ fontSize: "1.25rem", marginTop: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
          {isOk ? (
            <>
              <span className="admin-header__status-dot" style={{ backgroundColor: "var(--admin-success)", boxShadow: "0 0 8px var(--admin-success)" }}></span>
              <span style={{ color: "var(--admin-text-primary)" }}>Online</span>
            </>
          ) : warningText ? (
            <>
              <span className="admin-header__status-dot" style={{ backgroundColor: "var(--admin-warning)", boxShadow: "0 0 8px var(--admin-warning)" }}></span>
              <span style={{ color: "var(--admin-warning)", fontSize: "1.1rem" }}>{warningText}</span>
            </>
          ) : (
            <>
              <span className="admin-header__status-dot" style={{ backgroundColor: "var(--admin-error)", boxShadow: "0 0 8px var(--admin-error)" }}></span>
              <span style={{ color: "var(--admin-error)" }}>Sem Chave</span>
            </>
          )}
        </div>
        
        <div className="saas-card__footer">
          {isOk ? "Instância operacional ativa" : warningText ? "Modelo degradado operacional" : "Requer configuração de chave API"}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Page Header */}
      <div className="admin-page-header">
        <p className="admin-page-header__eyebrow">Operação</p>
        <h1 className="admin-page-header__title">Agentes de IA & Status de Conexão</h1>
        <p className="admin-page-header__sub">
          Monitore o estado operacional dos modelos de linguagem da automação. O sistema possui roteamento inteligente 
          e degrade automático para chaves de backup caso ocorram limites de cota ou instabilidades.
        </p>
      </div>

      {/* Provider Connections Grid */}
      <h2 className="admin-sidebar__eyebrow" style={{ fontSize: "0.85rem", marginBottom: "16px" }}>
        Status dos Provedores e APIS
      </h2>
      <div className="saas-grid" style={{ marginBottom: "36px" }}>
        {getStatusModule("OpenAI Official (GPT-5.5)", health.openaiOfficial)}
        {getStatusModule("Anthropic (Claude 4.8)", health.anthropic, health.anthropic ? undefined : "Usa OpenAI")}
        {getStatusModule("OpenCode Zen (Reserva)", health.zen)}
      </div>

      {/* Agent Model Fleet Table */}
      <div className="saas-panel">
        <div className="saas-panel__title-bar">
          <h2 className="saas-panel__title">
            <Bot size={18} style={{ color: "var(--admin-accent-light)" }} />
            Orquestração de Papéis & Modelos Ativos
          </h2>
          <span style={{ fontSize: "0.8rem", color: "var(--admin-text-muted)" }}>
            Configuração em execução pelo modelo de roteamento dinâmico
          </span>
        </div>

        <div className="saas-table-container">
          <table className="saas-table">
            <thead>
              <tr>
                <th>Nome do Agente</th>
                <th>Modelo LLM Vinculado</th>
                <th>Responsabilidade na Automação</th>
              </tr>
            </thead>
            <tbody>
              {PAPEIS.map((p) => (
                <tr key={p.task}>
                  <td style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                    <Bot size={14} style={{ color: "var(--admin-accent-light)" }} />
                    <span>{p.nome}</span>
                  </td>
                  <td>
                    <code 
                      style={{ 
                        fontSize: "0.85rem", 
                        padding: "4px 8px", 
                        borderRadius: "4px", 
                        backgroundColor: "rgba(0,0,0,0.02)", 
                        border: "1px solid var(--admin-border)", 
                        color: "var(--admin-accent-solid)" 
                      }}
                    >
                      {taskModel[p.task]}
                    </code>
                  </td>
                  <td style={{ color: "var(--admin-text-secondary)" }}>
                    {p.papel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="saas-note">
          <strong>Configuração Sem Deploy:</strong> Os modelos utilizados em cada etapa são parametrizados dinamicamente 
          por variáveis de ambiente configuradas no painel do Railway (e.g. <code>AI_MODEL_WRITING</code>, 
          <code>AI_MODEL_EDITING</code>). Atualizações ocorrem instantaneamente nas execuções das próximas pautas 
          sem requerer builds.
        </p>
      </div>
    </div>
  );
}
