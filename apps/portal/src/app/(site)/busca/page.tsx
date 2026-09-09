import type { Metadata } from "next";
import { ArticleCard } from "@/components/site/article-card";
import { getArticles } from "@/lib/data/repository";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Busca",
  alternates: { canonical: absoluteUrl("/busca") },
  description: "Busque matérias no Fato Nacional por palavra-chave.",
  robots: { index: false, follow: true },
};

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();
  const all = await getArticles();
  const results = query
    ? all.filter((article) =>
        [article.headline, article.description, article.summary, article.category, ...(article.tags || []), ...(article.content || [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : [];

  return (
    <main className="section">
      <div className="container">
        <p className="eyebrow">Busca</p>
        <h1>{query ? `Resultados para “${q}”` : "Buscar no Fato Nacional"}</h1>
        <form action="/busca" method="get" className="search-form" role="search">
          <input type="search" name="q" defaultValue={q} placeholder="Buscar matérias…" aria-label="Buscar matérias" />
          <button type="submit">Buscar</button>
        </form>
        {query ? (
          results.length ? (
            <>
              <p className="search-count">{results.length} resultado(s) encontrado(s).</p>
              <div className="grid">
                {results.map((article) => (
                  <ArticleCard key={article.slug} article={article} />
                ))}
              </div>
            </>
          ) : (
            <p className="search-count">Nenhum resultado para “{q}”. Tente outros termos.</p>
          )
        ) : (
          <p className="search-count">Digite um termo para buscar nas matérias publicadas.</p>
        )}
      </div>
    </main>
  );
}
