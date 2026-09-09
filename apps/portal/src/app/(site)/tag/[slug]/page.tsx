import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/site/article-card";
import { getArticlesByTag, getTag, getTags } from "@/lib/data/repository";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getTags()).map((tag) => ({ slug: tag.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getTag(slug);
  if (!tag) return { title: "Tag" };
  return {
    title: `${tag.name}`,
    description: `Matérias e cobertura sobre ${tag.name} no Fato Nacional.`,
    alternates: { canonical: absoluteUrl(`/tag/${tag.slug}`) },
  };
}

export default async function TagPage({ params }: Props) {
  const { slug } = await params;
  const tag = await getTag(slug);
  if (!tag) notFound();
  const articles = await getArticlesByTag(slug);

  return (
    <main className="section">
      <div className="container">
        <p className="eyebrow">Tag</p>
        <h1>#{tag.name}</h1>
        <p className="search-count">{articles.length} matéria(s) com esta tag.</p>
        <div className="grid">
          {articles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      </div>
    </main>
  );
}
