import {
  Shield,
  CheckCircle,
  HelpCircle,
  FileCheck,
  ShieldCheck,
  AlertCircle
} from "lucide-react";

export default function Page() {
  const checkList = [
    { id: 1, name: "Fonte Primária Oficial", desc: "Varredura de links externos. Posts sensíveis YMYL devem linkar diretamente para portais do governo (.gov.br), tribunais, ou fontes originais.", mandatory: "Obrigatório YMYL" },
    { id: 2, name: "Data e Atualização Recente", desc: "Confirmação de que o assunto refere-se a dados vigentes (ex. tarifas de 2026, calendário atualizado), evitando reaproveitar guias obsoletos.", mandatory: "Obrigatório Geral" },
    { id: 3, name: "Classificação de Risco (Safety)", desc: "Triagem para impedir termos de conteúdo adulto, aconselhamento financeiro direto ou promessas de ganhos rápidos.", mandatory: "Obrigatório Geral" },
    { id: 4, name: "Atribuição de Autoria Editorial", desc: "Existência de um autor físico cadastrado na publicação e imagem com direitos de uso comercial atrelados.", mandatory: "Obrigatório Geral" },
    { id: 5, name: "IA Disclosure (Divulgação)", desc: "Inclusão do texto padrão de transparência editorial informando a co-autoria da inteligência artificial e revisão final humana.", mandatory: "Obrigatório Geral" },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="admin-page-header">
        <p className="admin-page-header__eyebrow">Governança</p>
        <h1 className="admin-page-header__title">Auditorias & Conformidade</h1>
        <p className="admin-page-header__sub">
          Processo de auditoria automática aplicado na triagem antes da publicação de qualquer artigo.
        </p>
      </div>

      {/* Audit Checklist Panel */}
      <div className="saas-panel">
        <div className="saas-panel__title-bar">
          <h2 className="saas-panel__title">
            <ShieldCheck size={18} style={{ color: "var(--admin-accent-light)" }} />
            Checklist Editorial de IA (Validação)
          </h2>
        </div>

        <p style={{ color: "var(--admin-text-secondary)", fontSize: "0.9rem", marginBottom: "20px" }}>
          Antes de disparar a publicação no portal, a nossa API de auditoria verifica sistematicamente se o artigo atende a todos os critérios abaixo. Se algum ponto falhar nos tópicos obrigatórios, o score é penalizado e o post vai para rascunho.
        </p>

        <div className="saas-table-container">
          <table className="saas-table">
            <thead>
              <tr>
                <th style={{ width: "60px" }}>Regra</th>
                <th>Item do Checklist</th>
                <th>Descrição do Critério de Auditoria</th>
                <th>Nível de Rigor</th>
                <th>Validação</th>
              </tr>
            </thead>
            <tbody>
              {checkList.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 700, color: "var(--admin-accent-light)" }}>
                    #{item.id}
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--admin-text-primary)" }}>
                    {item.name}
                  </td>
                  <td style={{ color: "var(--admin-text-secondary)", fontSize: "0.85rem", lineHeight: "1.4" }}>
                    {item.desc}
                  </td>
                  <td>
                    <span className={item.mandatory.includes("YMYL") ? "saas-badge saas-badge--warning" : "saas-badge saas-badge--info"}>
                      {item.mandatory}
                    </span>
                  </td>
                  <td>
                    <span className="saas-badge saas-badge--success" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <CheckCircle size={12} /> Automático
                    </span>
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
