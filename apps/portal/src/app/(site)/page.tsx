import { getArticles, getCategories } from "@/lib/data/repository";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { Pagination } from "@/components/site/pagination";
import { Clock, User, Radio, ArrowRight, Mail } from "lucide-react";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { paginatedUrl, parsePageNumber } from "@/lib/utils";
import { siteConfig } from "@/lib/site";

export const revalidate = 60;

const PER_PAGE = 10;

type HomeProps = {
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ searchParams }: HomeProps): Promise<Metadata> {
  const { page } = await searchParams;
  const pageNum = parsePageNumber(page);
  return {
    title: pageNum === 1 ? { absolute: siteConfig.name } : `Últimas publicações — página ${pageNum}`,
    description: siteConfig.description,
    alternates: { canonical: paginatedUrl("/", pageNum) },
  };
}

export default async function HomePage({
  searchParams,
}: HomeProps) {
  const articles = await getArticles();
  const { page } = await searchParams;
  const pageNum = parsePageNumber(page);

  // News ticker: latest article
  const latestArticle = articles[0];

  // Hero (featured + 4 highlights) only on the first page.
  const showHero = pageNum === 1;
  const mainFeatured = articles[0];
  const sideHighlights = articles.slice(1, 5);

  // Feed pool starts after the 5 hero slots, then paginates.
  const feedPool = articles.slice(5);
  const totalPages = Math.max(1, Math.ceil(feedPool.length / PER_PAGE));
  if (pageNum > totalPages) notFound();
  const feedArticles = feedPool.slice((pageNum - 1) * PER_PAGE, pageNum * PER_PAGE);

  const categories = await getCategories();

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    });
  };

  const getCategoryColor = (catSlug: string) => {
    const found = categories.find((c) => c.slug === catSlug);
    return found?.color || "#0f766e";
  };

  const getCategoryName = (catSlug: string) => {
    const found = categories.find((c) => c.slug === catSlug);
    return found?.name || catSlug;
  };

  return (
    <div className="news-portal-container">
      {/* 1. LATEST NEWS TICKER */}
      <div className="ticker-bar">
        <div className="container ticker-bar__inner">
          <div className="ticker-label">
            <Radio className="ticker-icon" size={14} />
            <span>PLANTÃO</span>
          </div>
          <a href={`/artigos/${latestArticle.slug}`} className="ticker-content">
            <span className="ticker-time">{formatDate(latestArticle.publishedAt)}</span>
            <span className="ticker-text">{latestArticle.headline}</span>
          </a>
        </div>
      </div>

      <div className="container main-layout">
        {/* 2. FEATURED HERO GRID */}
        {showHero && (
        <section className="featured-news-section">
          <div className="news-featured-grid">
            {/* Left: Main Featured Article */}
            {mainFeatured && (
              <a href={`/artigos/${mainFeatured.slug}`} className="featured-main-card">
                <div className="featured-main-card__media">
                  <Image
                    src={mainFeatured.image}
                    alt={mainFeatured.headline}
                    fill
                    sizes="(max-width: 900px) 100vw, 640px"
                    priority
                    className="card-cover-img"
                  />
                  <div className="featured-main-card__overlay" />
                </div>
                <div className="featured-main-card__content">
                  <div className="card-badge-row">
                    <span 
                      className="category-tag" 
                      style={{ backgroundColor: getCategoryColor(mainFeatured.category) }}
                    >
                      {getCategoryName(mainFeatured.category)}
                    </span>
                    <span className="read-time-indicator">
                      <Clock size={12} /> {mainFeatured.readingTime} de leitura
                    </span>
                  </div>
                  <h1>{mainFeatured.headline}</h1>
                  <p>{mainFeatured.description}</p>
                  <div className="author-meta-row">
                    <span className="meta-item">
                      <User size={12} /> {mainFeatured.author}
                    </span>
                    <span className="meta-separator">•</span>
                    <span className="meta-item">
                      {formatDate(mainFeatured.publishedAt)}
                    </span>
                  </div>
                </div>
              </a>
            )}

            {/* Right: 4 Highlights in Grid */}
            <div className="featured-grid-side">
              {sideHighlights.map((item) => (
                <a href={`/artigos/${item.slug}`} className="side-highlight-card" key={item.slug}>
                  <div className="side-highlight-card__media">
                    <Image
                      src={item.image}
                      alt={item.headline}
                      fill
                      sizes="(max-width: 900px) 50vw, 220px"
                      className="card-cover-img"
                    />
                    <div className="side-highlight-card__overlay" />
                  </div>
                  <div className="side-highlight-card__content">
                    <span 
                      className="category-tag-small" 
                      style={{ backgroundColor: getCategoryColor(item.category) }}
                    >
                      {getCategoryName(item.category)}
                    </span>
                    <h3>{item.headline}</h3>
                    <span className="side-highlight-card__date">
                      {formatDate(item.publishedAt)}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
        )}

        {/* 3. TWO-COLUMN BODY LAYOUT */}
        <div className="news-body-columns">
          {/* Left Column: Feed List */}
          <main className="news-feed-column">
            <div className="section-title-bar">
              <h2>Últimas publicações</h2>
              <div className="title-bar-line" />
            </div>

            <div className="horizontal-feed-list">
              {feedArticles.map((article) => (
                <a href={`/artigos/${article.slug}`} className="horizontal-news-card" key={article.slug}>
                  <div className="horizontal-news-card__media">
                    <Image
                      src={article.image}
                      alt={article.headline}
                      fill
                      sizes="(max-width: 768px) 100vw, 200px"
                      className="card-cover-img"
                    />
                  </div>
                  <div className="horizontal-news-card__body">
                    <div className="card-badge-row">
                      <span 
                        className="category-tag-inline" 
                        style={{ color: getCategoryColor(article.category), borderColor: getCategoryColor(article.category) + "33", backgroundColor: getCategoryColor(article.category) + "11" }}
                      >
                        {getCategoryName(article.category)}
                      </span>
                      <span className="meta-time-text">
                        <Clock size={11} /> {article.readingTime} de leitura
                      </span>
                    </div>
                    <h3>{article.headline}</h3>
                    <p>{article.description}</p>
                    <div className="horizontal-news-card__footer">
                      <div className="author-meta-row">
                        <span className="meta-item">Por {article.author}</span>
                        <span className="meta-separator">•</span>
                        <span className="meta-item">{formatDate(article.publishedAt)}</span>
                      </div>
                      <span className="read-more-btn">
                        Ler Artigo <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            <Pagination current={pageNum} total={totalPages} basePath="/" />
          </main>

          {/* Right Column: Sidebar Widgets */}
          <aside className="news-sidebar-column">
            {/* Widget 1: Newsletter (captura real de e-mails) */}
            <div className="sidebar-widget newsletter-widget">
              <div className="widget-header">
                <div className="widget-header-title">
                  <Mail size={16} className="newsletter-icon" />
                  <h3>Newsletter</h3>
                </div>
                <div className="widget-header-line" />
              </div>
              <p className="newsletter-pitch">
                Receba as principais notícias do dia no seu e-mail. Sem spam, só o essencial.
              </p>
              <NewsletterForm />
            </div>

            {/* Widget 2: Categorias Populares */}
            <div className="sidebar-widget">
              <div className="widget-header">
                <h3>Coberturas</h3>
                <div className="widget-header-line" />
              </div>
              <div className="sidebar-categories-list">
                {categories.map((cat) => (
                  <a 
                    href={`/categoria/${cat.slug}`} 
                    className="sidebar-category-item" 
                    key={cat.slug}
                  >
                    <div className="sidebar-category-item__left">
                      <span 
                        className="cat-dot" 
                        style={{ backgroundColor: cat.color }} 
                      />
                      <span className="cat-name">{cat.name}</span>
                    </div>
                    <span className="cat-count">Ver tudo</span>
                  </a>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
