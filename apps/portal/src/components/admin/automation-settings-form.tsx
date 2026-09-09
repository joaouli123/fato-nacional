"use client";

import { useState } from "react";
import { Save, Plus, Trash2, Power, Wallet, CalendarClock, Tags, ShieldCheck } from "lucide-react";
import type { AutomationSettings, ScheduleEntry, AutomationSlot } from "@/lib/automation/settings";

type Budget = {
  dailyBudgetUsd: number;
  monthlyBudgetUsd: number;
  spentTodayUsd: number;
  spentMonthUsd: number;
  blocked: boolean;
  reason: string | null;
};

const SLOT_LABEL: Record<AutomationSlot, string> = {
  news: "Notícia em alta",
  evergreen: "Evergreen / Guia",
  service: "Serviço prático",
  update: "Atualização de post",
};

const usd = (n: number) => `US$ ${n.toFixed(2)}`;
const brtHour = (utc: number) => `${String((utc + 21) % 24).padStart(2, "0")}:05`;

export function AutomationSettingsForm({
  initialSettings,
  initialBudget,
  postsToday,
  categories,
}: {
  initialSettings: AutomationSettings;
  initialBudget: Budget;
  postsToday: number;
  categories: Array<{ slug: string; name: string }>;
}) {
  const [s, setS] = useState<AutomationSettings>(initialSettings);
  const [budget, setBudget] = useState<Budget>(initialBudget);
  const [preferredText, setPreferredText] = useState(initialSettings.preferredTopics.join("\n"));
  const [blockedText, setBlockedText] = useState(initialSettings.blockedTopics.join("\n"));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const patch = (partial: Partial<AutomationSettings>) => setS((prev) => ({ ...prev, ...partial }));

  const patchScheduleRow = (index: number, partial: Partial<ScheduleEntry>) => {
    const schedule = s.schedule.map((row, i) => (i === index ? { ...row, ...partial } : row));
    patch({ schedule });
  };

  const addScheduleRow = () => {
    if (s.schedule.length >= 24) return;
    patch({ schedule: [...s.schedule, { hourUtc: 12, slot: "evergreen", count: 1, enabled: true }] });
  };

  const removeScheduleRow = (index: number) => {
    patch({ schedule: s.schedule.filter((_, i) => i !== index) });
  };

  const toggleCategory = (slug: string) => {
    const has = s.categoriesEnabled.includes(slug);
    patch({
      categoriesEnabled: has
        ? s.categoriesEnabled.filter((c) => c !== slug)
        : [...s.categoriesEnabled, slug],
    });
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const body: Partial<AutomationSettings> = {
        ...s,
        preferredTopics: preferredText.split("\n").map((v) => v.trim()).filter(Boolean),
        blockedTopics: blockedText.split("\n").map((v) => v.trim()).filter(Boolean),
      };
      const res = await fetch("/api/admin/automation-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setS(data.settings);
      setBudget(data.budget);
      setPreferredText(data.settings.preferredTopics.join("\n"));
      setBlockedText(data.settings.blockedTopics.join("\n"));
      setMessage({ ok: true, text: "Configurações salvas. O cron aplica na próxima hora cheia." });
    } catch (e) {
      setMessage({ ok: false, text: `Falha ao salvar: ${(e as Error).message}` });
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "90px",
    padding: "6px 8px",
    border: "1px solid var(--admin-border)",
    borderRadius: "8px",
    background: "transparent",
    color: "var(--admin-text-primary)",
  };

  return (
    <div className="saas-panel" style={{ marginBottom: "24px" }}>
      <div className="saas-panel__title-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="saas-panel__title">
          <Power size={18} style={{ color: "var(--admin-accent-light)" }} />
          Automação Editorial
        </h2>
        <button className="saas-btn saas-btn--primary" onClick={save} disabled={saving}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "10px", border: "none", cursor: "pointer", background: "var(--admin-accent)", color: "#fff", fontWeight: 600 }}>
          <Save size={15} /> {saving ? "Salvando…" : "Salvar configurações"}
        </button>
      </div>

      {message ? (
        <p style={{ margin: "0 0 16px", fontSize: "0.9rem", color: message.ok ? "var(--admin-success)" : "var(--admin-error)" }}>
          {message.text}
        </p>
      ) : null}

      {/* Master + limites do dia */}
      <div className="saas-grid" style={{ marginBottom: "20px" }}>
        <div className="saas-card">
          <div className="saas-card__header">
            <span className="saas-card__title">Publicação automática</span>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px", cursor: "pointer" }}>
            <input type="checkbox" checked={s.enabled} onChange={(e) => patch({ enabled: e.target.checked })} />
            <span style={{ fontWeight: 600, color: s.enabled ? "var(--admin-success)" : "var(--admin-error)" }}>
              {s.enabled ? "Ligada" : "Desligada"}
            </span>
          </label>
          <div className="saas-card__footer">Desligada, o cron não gera nada.</div>
        </div>

        <div className="saas-card">
          <div className="saas-card__header">
            <span className="saas-card__title">Teto de posts por dia</span>
          </div>
          <input type="number" min={1} max={20} value={s.maxPostsPerDay} style={{ ...inputStyle, marginTop: "8px" }}
            onChange={(e) => patch({ maxPostsPerDay: parseInt(e.target.value || "5", 10) })} />
          <div className="saas-card__footer">{postsToday} criados hoje.</div>
        </div>

        <div className="saas-card">
          <div className="saas-card__header">
            <span className="saas-card__title"><ShieldCheck size={14} style={{ verticalAlign: "-2px" }} /> Revisão humana</span>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px", cursor: "pointer" }}>
            <input type="checkbox" checked={s.requireHumanReviewAll} onChange={(e) => patch({ requireHumanReviewAll: e.target.checked })} />
            <span style={{ fontSize: "0.9rem" }}>Exigir para TODOS os posts</span>
          </label>
          <div className="saas-card__footer">YMYL sempre exige, independentemente desta opção.</div>
        </div>
      </div>

      {/* Grade horária */}
      <h3 style={{ display: "flex", alignItems: "center", gap: "8px", margin: "20px 0 10px", fontSize: "1rem", color: "var(--admin-text-primary)" }}>
        <CalendarClock size={16} /> Grade horária (UTC · horário de Brasília)
      </h3>
      <div className="saas-table-container">
        <table className="saas-table">
          <thead>
            <tr>
              <th>Ativo</th>
              <th>Hora UTC</th>
              <th>Brasília</th>
              <th>Tipo de conteúdo</th>
              <th>Posts</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {s.schedule.map((row, i) => (
              <tr key={i} style={{ opacity: row.enabled ? 1 : 0.45 }}>
                <td>
                  <input type="checkbox" checked={row.enabled} onChange={(e) => patchScheduleRow(i, { enabled: e.target.checked })} />
                </td>
                <td>
                  <input type="number" min={0} max={23} value={row.hourUtc} style={inputStyle}
                    onChange={(e) => patchScheduleRow(i, { hourUtc: parseInt(e.target.value || "0", 10) })} />
                </td>
                <td style={{ color: "var(--admin-text-secondary)" }}>{brtHour(row.hourUtc)}</td>
                <td>
                  <select value={row.slot} style={{ ...inputStyle, width: "190px" }}
                    onChange={(e) => patchScheduleRow(i, { slot: e.target.value as AutomationSlot })}>
                    {(Object.keys(SLOT_LABEL) as AutomationSlot[]).map((slot) => (
                      <option key={slot} value={slot}>{SLOT_LABEL[slot]}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input type="number" min={1} max={3} value={row.count} style={inputStyle}
                    onChange={(e) => patchScheduleRow(i, { count: parseInt(e.target.value || "1", 10) })} />
                </td>
                <td>
                  <button onClick={() => removeScheduleRow(i)} title="Remover horário"
                    style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--admin-error)" }}>
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={addScheduleRow}
        style={{ marginTop: "10px", display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "8px", border: "1px dashed var(--admin-border)", background: "transparent", color: "var(--admin-text-secondary)", cursor: "pointer" }}>
        <Plus size={14} /> Adicionar horário
      </button>

      {/* Editorias */}
      <h3 style={{ display: "flex", alignItems: "center", gap: "8px", margin: "24px 0 10px", fontSize: "1rem", color: "var(--admin-text-primary)" }}>
        <Tags size={16} /> Editorias habilitadas
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {categories.map((c) => {
          const active = s.categoriesEnabled.includes(c.slug);
          return (
            <label key={c.slug}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "999px", cursor: "pointer", border: `1px solid ${active ? "var(--admin-accent)" : "var(--admin-border)"}`, background: active ? "var(--admin-accent-bg, rgba(59,130,246,0.08))" : "transparent", color: active ? "var(--admin-accent)" : "var(--admin-text-secondary)", fontSize: "0.88rem", fontWeight: active ? 600 : 400 }}>
              <input type="checkbox" checked={active} onChange={() => toggleCategory(c.slug)} style={{ display: "none" }} />
              {c.name}
            </label>
          );
        })}
      </div>

      {/* Assuntos */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "24px" }}>
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: "1rem", color: "var(--admin-text-primary)" }}>Assuntos prioritários</h3>
          <p style={{ margin: "0 0 8px", fontSize: "0.82rem", color: "var(--admin-text-muted)" }}>Um por linha. O editor de pauta prioriza quando houver demanda real.</p>
          <textarea value={preferredText} onChange={(e) => setPreferredText(e.target.value)} rows={5}
            placeholder={"ex.: declaração imposto de renda 2027\npix parcelado"}
            style={{ width: "100%", padding: "10px", border: "1px solid var(--admin-border)", borderRadius: "10px", background: "transparent", color: "var(--admin-text-primary)", fontSize: "0.88rem", resize: "vertical" }} />
        </div>
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: "1rem", color: "var(--admin-text-primary)" }}>Assuntos proibidos</h3>
          <p style={{ margin: "0 0 8px", fontSize: "0.82rem", color: "var(--admin-text-muted)" }}>Um por linha. Pautas contendo estes termos são rejeitadas.</p>
          <textarea value={blockedText} onChange={(e) => setBlockedText(e.target.value)} rows={5}
            placeholder={"ex.: apostas esportivas\ncriptomoeda meme"}
            style={{ width: "100%", padding: "10px", border: "1px solid var(--admin-border)", borderRadius: "10px", background: "transparent", color: "var(--admin-text-primary)", fontSize: "0.88rem", resize: "vertical" }} />
        </div>
      </div>

      {/* Orçamento */}
      <h3 style={{ display: "flex", alignItems: "center", gap: "8px", margin: "24px 0 10px", fontSize: "1rem", color: "var(--admin-text-primary)" }}>
        <Wallet size={16} /> Limites de gasto (IA)
      </h3>
      {budget.blocked ? (
        <p style={{ margin: "0 0 10px", fontSize: "0.9rem", color: "var(--admin-error)", fontWeight: 600 }}>
          ⛔ Automação bloqueada por orçamento: {budget.reason}
        </p>
      ) : null}
      <div className="saas-grid">
        <div className="saas-card">
          <div className="saas-card__header"><span className="saas-card__title">Teto diário (US$)</span></div>
          <input type="number" min={0} step={0.5} value={s.dailyBudgetUsd} style={{ ...inputStyle, marginTop: "8px", width: "120px" }}
            onChange={(e) => patch({ dailyBudgetUsd: parseFloat(e.target.value || "0") })} />
          <div className="saas-card__footer">Gasto hoje: <strong>{usd(budget.spentTodayUsd)}</strong> · 0 = sem limite</div>
        </div>
        <div className="saas-card">
          <div className="saas-card__header"><span className="saas-card__title">Teto mensal (US$)</span></div>
          <input type="number" min={0} step={1} value={s.monthlyBudgetUsd} style={{ ...inputStyle, marginTop: "8px", width: "120px" }}
            onChange={(e) => patch({ monthlyBudgetUsd: parseFloat(e.target.value || "0") })} />
          <div className="saas-card__footer">Gasto no mês: <strong>{usd(budget.spentMonthUsd)}</strong> · 0 = sem limite</div>
        </div>
        <div className="saas-card">
          <div className="saas-card__header"><span className="saas-card__title">Última alteração</span></div>
          <div className="saas-card__value" style={{ fontSize: "0.95rem", paddingTop: "8px" }}>
            {s.updatedAt ? new Date(s.updatedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—"}
          </div>
          <div className="saas-card__footer">{s.updatedBy ? `por ${s.updatedBy}` : "configuração padrão"}</div>
        </div>
      </div>
    </div>
  );
}
