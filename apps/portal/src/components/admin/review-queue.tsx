"use client";

import { useState } from "react";
import { CheckCircle, ExternalLink, RefreshCw, ShieldAlert } from "lucide-react";

export type ReviewItem = {
  id: number | string;
  headline: string;
  slug: string;
  category: string;
  riskLevel: string;
  status: string;
  updatedAt: string | null;
};

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

export function ReviewQueue({ initialItems }: { initialItems: ReviewItem[] }) {
  const [items, setItems] = useState<ReviewItem[]>(initialItems);
  const [busy, setBusy] = useState<string | number | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const refresh = async () => {
    setBusy("refresh");
    try {
      const res = await fetch("/api/admin/review-queue");
      const data = await res.json();
      if (data.ok) setItems(data.items);
    } finally {
      setBusy(null);
    }
  };

  const approve = async (item: ReviewItem) => {
    if (!window.confirm(`Confirmar que você REVISOU "${item.headline}" e aprova a publicação?\n\nO recibo de revisão será estampado com o seu usuário (nome, data e hash do conteúdo).`)) return;
    setBusy(item.id);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/review-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setMessage({ ok: true, text: `"${item.headline}" publicado com recibo de revisão (${data.reviewer}).` });
    } catch (e) {
      setMessage({ ok: false, text: `Falha ao aprovar: ${(e as Error).message}` });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="saas-panel">
      <div className="saas-panel__title-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="saas-panel__title">
          <ShieldAlert size={18} style={{ color: "var(--admin-accent-light)" }} />
          Aguardando revisão humana ({items.length})
        </h2>
        <button onClick={refresh} disabled={busy === "refresh"}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--admin-border)", background: "transparent", color: "var(--admin-text-secondary)", cursor: "pointer" }}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {message ? (
        <p style={{ margin: "0 0 14px", fontSize: "0.9rem", color: message.ok ? "var(--admin-success)" : "var(--admin-error)" }}>
          {message.text}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p style={{ margin: 0, color: "var(--admin-text-secondary)" }}>
          Nenhum artigo aguardando revisão. Conteúdo sensível gerado pela automação aparece aqui automaticamente.
        </p>
      ) : (
        <div className="saas-table-container">
          <table className="saas-table">
            <thead>
              <tr>
                <th>Artigo</th>
                <th>Editoria</th>
                <th>Risco</th>
                <th>Atualizado</th>
                <th style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600, color: "var(--admin-text-primary)", maxWidth: "420px" }}>{item.headline}</td>
                  <td style={{ color: "var(--admin-text-secondary)" }}>{item.category || "—"}</td>
                  <td>
                    <span className={`saas-badge ${item.riskLevel === "high" ? "saas-badge--error" : "saas-badge--neutral"}`}>
                      {item.riskLevel === "high" ? "alto" : item.riskLevel}
                    </span>
                  </td>
                  <td style={{ color: "var(--admin-text-secondary)", whiteSpace: "nowrap" }}>{fmtDate(item.updatedAt)}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <a href={`/cms/collections/articles/${item.id}`} target="_blank" rel="noopener noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginRight: "10px", color: "var(--admin-accent)", fontSize: "0.85rem" }}>
                      <ExternalLink size={13} /> Ler e editar
                    </a>
                    <button onClick={() => approve(item)} disabled={busy === item.id}
                      style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "8px", border: "none", background: "var(--admin-success, #10b981)", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}>
                      <CheckCircle size={14} /> {busy === item.id ? "Publicando…" : "Aprovar e publicar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ margin: "14px 0 0", fontSize: "0.78rem", color: "var(--admin-text-muted)" }}>
        Ao aprovar, o sistema estampa o recibo de revisão humana (seu usuário + data + hash exato do conteúdo).
        Se o conteúdo for editado depois, o recibo é invalidado automaticamente até nova aprovação.
        Use &quot;Ler e editar&quot; para revisar o texto completo no CMS antes de aprovar.
      </p>
    </div>
  );
}
