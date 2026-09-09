import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/site/article-card";
import { getArticlesByAuthor, getAuthor, getAuthors } from "@/lib/data/repository";
import { absoluteUrl } from "@/lib/utils";
import { articleAuthorSchemaType } from "@/lib/seo";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getAuthors()).map((author) => ({ slug: author.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthor(slug);
  if (!author) return { title: "Autor" };
  return {
    title: author.name,
    description: author.bio || `Matérias e cobertura de ${author.name} no Fato Nacional.`,
    alternates: { canonical: absoluteUrl(`/autores/${author.slug}`) },
  };
}

export default async function AuthorPage({ params }: Props) {
  const { slug } = await params;
  const author = await getAuthor(slug);
  if (!author) notFound();
  const articles = await getArticlesByAuthor(slug);

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": articleAuthorSchemaType(author.name),
    name: author.name,
    url: absoluteUrl(`/autores/${author.slug}`),
    ...(author.role ? { jobTitle: author.role } : {}),
    ...(author.bio ? { description: author.bio } : {}),
    ...(author.scope
      ? { knowsAbout: author.scope.split(/,\s*/).map((s) => s.replace(/\.$/, "").trim()) }
      : {}),
    email: "contato@fatonacional.com",
    worksFor: {
      "@type": "NewsMediaOrganization",
      name: "Fato Nacional",
      url: absoluteUrl(),
    },
  };

  return (
    <main className="section">
      <div className="container">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd).replaceAll("<", "\\u003c") }}
        />
        <p className="eyebrow">Autor</p>
        <h1>{author.name}</h1>
        {author.role ? <p className="author-role">{author.role}</p> : null}
        {author.bio ? <p className="author-bio">{author.bio}</p> : null}
        <dl className="author-details">
          {author.scope ? (
            <>
              <dt>Cobertura</dt>
              <dd>{author.scope}</dd>
            </>
          ) : null}
          {author.sources ? (
            <>
              <dt>Fontes habituais</dt>
              <dd>{author.sources}</dd>
            </>
          ) : null}
          {author.review ? (
            <>
              <dt>Revisão e transparência</dt>
              <dd>{author.review}</dd>
            </>
          ) : null}
        </dl>

        {author.criteria?.length ? (
          <section className="author-criteria">
            <h2>Critérios editoriais</h2>
            <ul>
              {author.criteria.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>
        ) : null}
        <h2 style={{ marginTop: "2rem" }}>Matérias de {author.name}</h2>
        <div className="grid">
          {articles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      </div>
    </main>
  );
}
