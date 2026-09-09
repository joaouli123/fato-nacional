"use client";

import { useState } from "react";
import { Send } from "lucide-react";

type Status = "idle" | "loading" | "ok" | "error";

export function NewsletterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setStatus("ok");
        setMessage("Pronto! Inscrição confirmada. 🎉");
        setName("");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Não foi possível inscrever. Tente novamente.");
      }
    } catch {
      setStatus("error");
      setMessage("Erro de conexão. Tente novamente.");
    }
  }

  return (
    <form className="newsletter-form" onSubmit={onSubmit}>
      <input
        type="text"
        name="name"
        placeholder="Seu nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        aria-label="Seu nome"
      />
      <input
        type="email"
        name="email"
        placeholder="Seu melhor e-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        aria-label="Seu e-mail"
      />
      <button type="submit" disabled={status === "loading"}>
        {status === "loading" ? (
          "Enviando..."
        ) : (
          <>
            <Send size={14} /> Inscrever
          </>
        )}
      </button>
      {message ? (
        <p className={`newsletter-msg ${status === "ok" ? "is-ok" : "is-error"}`} role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
