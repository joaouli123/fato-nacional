import {
  CalendarDays,
  Clock,
  LayoutGrid,
  Bookmark,
  CheckCircle,
  HelpCircle
} from "lucide-react";

export default function Page() {
  const WEEK_DAYS = [
    { day: "Segunda-feira", focus: "Finanças & YMYL", slot1: "Trends BR", slot2: "Guia de Impostos", slot3: "Explicador Bancário", slot4: "Finanças Pessoais", slot5: "Revisão Geral" },
    { day: "Terça-feira", focus: "Tecnologia & IA", slot1: "Trends BR", slot2: "Tutorial de Software", slot3: "Novidades de IA", slot4: "Review de Dispositivo", slot5: "Revisão Geral" },
    { day: "Quarta-feira", focus: "Esportes & Lazer", slot1: "Trends BR", slot2: "Guia de Campeonatos", slot3: "Serviço (Ingressos)", slot4: "Análise de Rodada", slot5: "Revisão Geral" },
    { day: "Quinta-feira", focus: "Finanças & YMYL", slot1: "Trends BR", slot2: "Guia de Empréstimos", slot3: "Explicador FGTS", slot4: "Benefícios Sociais", slot5: "Revisão Geral" },
    { day: "Sexta-feira", focus: "Entretenimento & Games", slot1: "Trends BR", slot2: "Lançamentos Semana", slot3: "Guia de Personagens", slot4: "Dicas de Jogos", slot5: "Revisão Geral" },
    { day: "Sábado", focus: "Mundo & Curiosidades", slot1: "Trends BR", slot2: "Fatos Históricos", slot3: "Explicador Ciência", slot4: "Notícia Internacional", slot5: "Evergreen Geral" },
    { day: "Domingo", focus: "Evergreen Geral", slot1: "Trends BR", slot2: "Resumo da Semana", slot3: "Guia Longo (Deep)", slot4: "Planejamento Semanal", slot5: "Evergreen Geral" },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="admin-page-header">
        <p className="admin-page-header__eyebrow">Agenda</p>
        <h1 className="admin-page-header__title">Calendário Editorial</h1>
        <p className="admin-page-header__sub">
          Distribuição semanal automatizada por nichos e intenções de busca.
        </p>
      </div>

      {/* Calendar Panel */}
      <div className="saas-panel">
        <div className="saas-panel__title-bar">
          <h2 className="saas-panel__title">
            <CalendarDays size={18} style={{ color: "var(--admin-accent-light)" }} />
            Slots de Categoria por Dia da Semana
          </h2>
        </div>

        <p style={{ color: "var(--admin-text-secondary)", fontSize: "0.9rem", marginBottom: "20px" }}>
          A tabela a seguir reflete a prioridade temática de cada dia da semana. Quando o redator de IA busca pautas na fila ou gera novos temas no piloto automático, ele prioriza a categoria do dia para manter um feed balanceado e otimizado.
        </p>

        <div className="saas-table-container">
          <table className="saas-table">
            <thead>
              <tr>
                <th>Dia da Semana</th>
                <th>Foco Temático</th>
                <th>08:05 Slot</th>
                <th>11:05 Slot</th>
                <th>14:05 Slot</th>
                <th>17:05 Slot</th>
                <th>20:05 Slot</th>
              </tr>
            </thead>
            <tbody>
              {WEEK_DAYS.map((d) => (
                <tr key={d.day}>
                  <td style={{ fontWeight: 700, color: "var(--admin-text-primary)" }}>
                    {d.day}
                  </td>
                  <td>
                    <span 
                      className={
                        d.focus.includes("Finanças") 
                          ? "saas-badge saas-badge--error" 
                          : d.focus.includes("Tecnologia") 
                          ? "saas-badge saas-badge--info" 
                          : d.focus.includes("Esportes")
                          ? "saas-badge saas-badge--success"
                          : "saas-badge saas-badge--neutral"
                      }
                    >
                      {d.focus}
                    </span>
                  </td>
                  <td style={{ color: "var(--admin-text-secondary)", fontSize: "0.85rem" }}>{d.slot1}</td>
                  <td style={{ color: "var(--admin-text-secondary)", fontSize: "0.85rem" }}>{d.slot2}</td>
                  <td style={{ color: "var(--admin-text-secondary)", fontSize: "0.85rem" }}>{d.slot3}</td>
                  <td style={{ color: "var(--admin-text-secondary)", fontSize: "0.85rem" }}>{d.slot4}</td>
                  <td style={{ color: "var(--admin-text-secondary)", fontSize: "0.85rem" }}>{d.slot5}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
