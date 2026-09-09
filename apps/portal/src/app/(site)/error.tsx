"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="error-page container">
      <span className="error-page__code">Ops</span>
      <h1 className="error-page__title">Algo deu errado</h1>
      <p className="error-page__msg">
        Tivemos um problema ao carregar esta página. Nossa equipe já foi avisada — tente novamente em
        instantes.
      </p>
      <div className="error-page__actions">
        <button type="button" onClick={reset} className="error-page__btn">
          Tentar de novo
        </button>
        <Link href="/" className="error-page__btn error-page__btn--ghost">
          Voltar à home
        </Link>
      </div>
    </section>
  );
}
