import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Clock } from "lucide-react";
import { ArticleCard } from "@/components/site/article-card";
import { Pagination } from "@/components/site/pagination";
import { getArticlesByCategory, getCategories, getCategory } from "@/lib/data/repository";
import { formatDate, paginatedUrl, parsePageNumber } from "@/lib/utils";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export const revalidate = 60;

const PER_PAGE = 12;

export async function generateStaticParams() {
  return (await getCategories()).map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { page } = await searchParams;
  const pageNum = parsePageNumber(page);
  const category = await getCategory(slug);
  return {
    title: category ? `${category.name}${pageNum > 1 ? ` — página ${pageNum}` : ""}` : "Categoria",
    description: category?.description,
    ...(category
      ? { alternates: { canonical: paginatedUrl(`/categoria/${category.slug}`, pageNum) } }
      : {}),
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page } = await searchParams;
  const pageNum = parsePageNumber(page);

  const category = await getCategory(slug);
  if (!category) notFound();

  const all = await getArticlesByCategory(slug);
  const totalPages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  if (pageNum > totalPages) notFound();
  const pageItems = all.slice((pageNum - 1) * PER_PAGE, pageNum * PER_PAGE);

  const showFeatured = pageNum === 1;
  const featured = showFeatured ? pageItems[0] : undefined;
  const rest = showFeatured ? pageItems.slice(1) : pageItems;

  return (
    <main className="section">
      <div className="container">
        <div className="category-header" style={{ borderColor: category.color }}>
          <p className="eyebrow" style={{ color: category.color }}>
            Editoria
          </p>
          <h1>{category.name}</h1>
          <p className="category-header__desc">{category.description}</p>
        </div>

        {featured ? (
          <Link href={`/artigos/${featured.slug}`} className="category-feature">
            <div className="category-feature__media">
              <Image
                src={featured.image}
                alt={featured.imageAlt || featured.headline}
                fill
                sizes="(max-width: 900px) 100vw, 620px"
                priority
                className="card-cover-img"
              />
            </div>
            <div className="category-feature__body">
              <span className="category-tag" style={{ backgroundColor: category.color }}>
                {category.name}
              </span>
              <h2>{featured.headline}</h2>
              <p>{featured.summary || featured.description}</p>
              <span className="category-feature__meta">
                <Clock size={13} /> {featured.readingTime} de leitura · {formatDate(featured.publishedAt)}
              </span>
            </div>
          </Link>
        ) : null}

        {rest.length ? (
          <div className="grid">
            {rest.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        ) : null}

        {all.length === 0 ? (
          <p className="category-header__desc">Nenhuma matéria nesta editoria ainda.</p>
        ) : null}

        <Pagination current={pageNum} total={totalPages} basePath={`/categoria/${slug}`} />
      </div>
    </main>
  );
}
