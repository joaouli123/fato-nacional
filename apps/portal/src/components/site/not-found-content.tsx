import Link from "next/link";

export function NotFoundContent({
  code = "404",
  title = "Página não encontrada",
  message = "O conteúdo que você procura saiu do ar ou nunca existiu. Que tal voltar à página inicial?",
}: {
  code?: string;
  title?: string;
  message?: string;
}) {
  return (
    <section className="error-page container">
      <span className="error-page__code">{code}</span>
      <h1 className="error-page__title">{title}</h1>
      <p className="error-page__msg">{message}</p>
      <div className="error-page__actions">
        <Link href="/" className="error-page__btn">
          Voltar à home
        </Link>
        <Link href="/busca" className="error-page__btn error-page__btn--ghost">
          Buscar matérias
        </Link>
      </div>
      <div className="error-page__links">
        <span>Editorias:</span>
        <Link href="/categoria/brasil">Brasil</Link>
        <Link href="/categoria/tecnologia-e-ia">Tecnologia</Link>
        <Link href="/categoria/mundo">Mundo</Link>
        <Link href="/categoria/financas">Finanças</Link>
      </div>
    </section>
  );
}
