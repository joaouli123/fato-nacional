import {
  Settings,
  Database,
  Cpu,
  Shield,
  Activity,
  HardDrive,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { getAutomationSettings } from "@/lib/automation/settings";
import { getBudgetStatus, countArticlesCreatedToday } from "@/lib/automation/budget";
import { getCategories } from "@/lib/data/repository";
import { AutomationSettingsForm } from "@/components/admin/automation-settings-form";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [settings, categories, postsToday] = await Promise.all([
    getAutomationSettings(),
    getCategories(),
    countArticlesCreatedToday(),
  ]);
  const budget = await getBudgetStatus(settings);
  const isOpenAIActive = !!process.env.OPENAI_API_KEY;
  const isAnthropicActive = !!process.env.ANTHROPIC_API_KEY;
  const isZenActive = !!process.env.ZEN_API_KEY;
  const databaseType = process.env.DATABASE_URL ? "PostgreSQL (Prisma)" : "Drizzle Local (fallback)";

  const sysConfigs = [
    { key: "DATABASE_URL", name: "Banco de Dados Principal", value: databaseType, status: true },
    { key: "OPENAI_API_KEY", name: "OpenAI GPT API", value: isOpenAIActive ? "Configurada (Ativa)" : "Não configurada", status: isOpenAIActive },
    { key: "ANTHROPIC_API_KEY", name: "Anthropic Claude API", value: isAnthropicActive ? "Configurada (Ativa)" : "Não configurada", status: isAnthropicActive },
    { key: "ZEN_API_KEY", name: "OpenCode Zen API (Backup)", value: isZenActive ? "Configurada (Ativa)" : "Não configurada", status: isZenActive },
    { key: "REDIS_URL", name: "Fila de Cache & Queue (BullMQ)", value: process.env.REDIS_URL ? "Conectado" : "Mock de Memória", status: !!process.env.REDIS_URL },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="admin-page-header">
        <p className="admin-page-header__eyebrow">Sistema</p>
        <h1 className="admin-page-header__title">Configurações</h1>
        <p className="admin-page-header__sub">
          Controle total da automação editorial: grade, editorias, assuntos, limites de gasto e revisão.
        </p>
      </div>

      {/* Automação editorial (configurável) */}
      <AutomationSettingsForm
        initialSettings={settings}
        initialBudget={budget}
        postsToday={postsToday}
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
      />

      {/* Settings Grid */}
      <div className="saas-grid">
        <div className="saas-card">
          <div className="saas-card__header">
            <span className="saas-card__title">Provedor Ativo</span>
            <div className="saas-card__icon-wrap">
              <Cpu size={16} />
            </div>
          </div>
          <div className="saas-card__value" style={{ fontSize: "1.3rem", paddingTop: "4px" }}>
            {isOpenAIActive ? "OpenAI GPT" : "Mock Fallback"}
          </div>
          <div className="saas-card__footer">Definido dinamicamente por chave</div>
        </div>

        <div className="saas-card">
          <div className="saas-card__header">
            <span className="saas-card__title">Cache / Fila</span>
            <div className="saas-card__icon-wrap">
              <Activity size={16} />
            </div>
          </div>
          <div className="saas-card__value" style={{ fontSize: "1.3rem", paddingTop: "4px" }}>
            {process.env.REDIS_URL ? "Redis Ativo" : "Em Memória"}
          </div>
          <div className="saas-card__footer">Fila de agendamento BullMQ</div>
        </div>

        <div className="saas-card">
          <div className="saas-card__header">
            <span className="saas-card__title">Modo da Instância</span>
            <div className="saas-card__icon-wrap">
              <HardDrive size={16} />
            </div>
          </div>
          <div className="saas-card__value" style={{ fontSize: "1.3rem", paddingTop: "4px" }}>
            {process.env.NODE_ENV === "production" ? "Produção" : "Desenvolvimento"}
          </div>
          <div className="saas-card__footer">Status do ambiente NodeJS</div>
        </div>
      </div>

      {/* Connection Table Panel */}
      <div className="saas-panel">
        <div className="saas-panel__title-bar">
          <h2 className="saas-panel__title">
            <Settings size={18} style={{ color: "var(--admin-accent-light)" }} />
            Variáveis e Status de Integrações
          </h2>
        </div>

        <p style={{ color: "var(--admin-text-secondary)", fontSize: "0.9rem", marginBottom: "20px" }}>
          Configurações sensíveis e seguras obtidas do orquestrador do Railway. Alterações devem ser feitas no painel do Railway para persistirem entre deploys automáticos.
        </p>

        <div className="saas-table-container">
          <table className="saas-table">
            <thead>
              <tr>
                <th>Nome da Variável</th>
                <th>Finalidade / Integração</th>
                <th>Valor Resolvido</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {sysConfigs.map((cfg) => (
                <tr key={cfg.key}>
                  <td style={{ fontWeight: 700, color: "var(--admin-text-primary)" }}>
                    <code>{cfg.key}</code>
                  </td>
                  <td style={{ color: "var(--admin-text-secondary)" }}>
                    {cfg.name}
                  </td>
                  <td>
                    <span style={{ fontSize: "0.85rem", color: "var(--admin-text-secondary)" }}>
                      {cfg.value}
                    </span>
                  </td>
                  <td>
                    {cfg.status ? (
                      <span className="saas-badge saas-badge--success" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <CheckCircle size={12} /> Conectado
                      </span>
                    ) : (
                      <span className="saas-badge saas-badge--error" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <AlertTriangle size={12} /> Ausente
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
