import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticle, getArticles, getCategory, getRelatedArticles } from "@/lib/data/repository";
import { absoluteUrl, buildArticleToc, formatDate, safeHttpUrl, slugify } from "@/lib/utils";
import { sanitizeArticleHtml } from "@/lib/sanitize";
import { getPublicReviewStatus } from "@/lib/editorial-transparency";
import {
  createNewsArticleJsonLd,
  createBreadcrumbJsonLd,
  createFaqJsonLd,
  extractFaqFromHtml,
} from "@/lib/seo";
import { Clock, User, ArrowRight } from "lucide-react";
import { ScrollToTopButton } from "@/components/site/scroll-to-top";
import { AdSlot } from "@/components/site/adsense";
import { ShareButtons } from "@/components/article/share-buttons";
import { TableOfContents } from "@/components/site/table-of-contents";
import Image from "next/image";
import Link from "next/link";

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 60;

export async function generateStaticParams() {
  return (await getArticles()).map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: "Artigo" };

  const url = absoluteUrl(`/artigos/${article.slug}`);
  const editorialUpdatedAt = article.editorialUpdatedAt || article.updatedAt;
  return {
    title: article.seoTitle || article.headline,
    description: article.metaDescription || article.description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: article.seoTitle || article.headline,
      description: article.metaDescription || article.description,
      publishedTime: article.publishedAt,
      modifiedTime: editorialUpdatedAt || article.publishedAt,
      authors: [article.author],
      images: [{ url: article.image, alt: article.imageAlt || article.headline }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.seoTitle || article.headline,
      description: article.metaDescription || article.description,
      images: [article.image],
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();
  const editorialUpdatedAt = article.editorialUpdatedAt || article.updatedAt;
  const reviewStatus = getPublicReviewStatus(article);
  const imageSourceUrl = safeHttpUrl(article.imageSourceUrl);
  const category = await getCategory(article.category);
  const newsJsonLd = await createNewsArticleJsonLd(article);
  const breadcrumbJsonLd = createBreadcrumbJsonLd([
    { name: "Início", url: absoluteUrl("/") },
    { name: category?.name || article.category, url: absoluteUrl(`/categoria/${article.category}`) },
    { name: article.headline, url: absoluteUrl(`/artigos/${article.slug}`) },
  ]);
  const faqPairs = article.contentHtml ? extractFaqFromHtml(article.contentHtml) : [];
  const faqJsonLd = createFaqJsonLd(faqPairs);
  const schemas = [newsJsonLd, breadcrumbJsonLd, faqJsonLd].filter(Boolean);

  // "Leia também": only genuinely related articles, ranked by topical relevance.
  // A candidate qualifies via a shared curated tag (the only cross-category
  // signal we trust) or, within the same category, strong headline/summary term
  // overlap. Never padded with random recent posts — if nothing is relevant the
  // section renders nothing (Google Helpful Content + internal-linking guidance).
  const relatedArticles = await getRelatedArticles(slug, 4);

  // contentHtml is AI/staff-authored → sanitize before rendering (strips scripts/handlers).
  const { html: richBody, toc } = buildArticleToc(sanitizeArticleHtml(article.contentHtml || ""));

  return (
    <main className="article-page">
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replaceAll("<", "\\u003c") }}
        />
      ))}
      <div className="container article-layout-three-col">
        {/* LEFT COLUMN: TABLE OF CONTENTS (NESTA PÁGINA) */}
        <aside className="article-toc-sidebar">
          {toc.length > 0 ? <TableOfContents items={toc} /> : null}
        </aside>

        {/* CENTER COLUMN: MAIN CONTENT */}
        <article className="article-main-content">
          <nav className="article-breadcrumb" aria-label="Navegação estrutural">
            <ol>
              <li><Link href="/">Início</Link></li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href={`/categoria/${category?.slug || article.category}`}>
                  {category?.name || article.category}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="article-breadcrumb__current" aria-current="page">
                {article.headline}
              </li>
            </ol>
          </nav>
          <span className="category-tag-inline article-category-eyebrow">
            {category?.name || article.category}
          </span>
          <h1 className="article-headline-main">{article.headline}</h1>
          <p className="article-lead-paragraph">{article.summary || article.description}</p>

          <div className="article-meta-row-clean">
            <Link href={`/autores/${slugify(article.author)}`} className="meta-item-clean meta-author-link">
              <User size={13} /> {article.author}
            </Link>
            <span className="meta-dot">•</span>
            <span className="meta-item-clean">
              Publicado em {formatDate(article.publishedAt)}
            </span>
            {editorialUpdatedAt ? (
              <>
                <span className="meta-dot">•</span>
                <span className="meta-item-clean meta-updated">
                  Atualizado em {formatDate(editorialUpdatedAt)}
                </span>
              </>
            ) : null}
            <span className="meta-dot">•</span>
            <span className="meta-item-clean">
              <Clock size={13} /> {article.readingTime} de leitura
            </span>
          </div>

          {article.tags?.length ? (
            <div className="article-tags-row">
              {article.tags.map((tag) => (
                <Link key={tag} href={`/tag/${slugify(tag)}`} className="article-tag-chip">
                  #{tag}
                </Link>
              ))}
            </div>
          ) : null}

          <figure className="article-hero-media">
            <Image
              src={article.image}
              alt={article.imageAlt || article.headline}
              width={1200}
              height={675}
              priority
              sizes="(max-width: 1024px) 100vw, 760px"
              className="article-hero-img"
            />
            {article.imageCaption || article.imageCredit || article.imageProvider || article.imageLicense ? (
              <figcaption className="article-hero-caption">
                {article.imageCaption ? <span>{article.imageCaption}</span> : null}
                {article.imageCredit ? (
                  <span className="article-hero-credit">{article.imageCredit}</span>
                ) : null}
                {article.imageProvider || article.imageLicense ? (
                  imageSourceUrl ? (
                    <a
                      className="article-hero-credit"
                      href={imageSourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {[article.imageProvider, article.imageLicense].filter(Boolean).join(" · ")}
                    </a>
                  ) : (
                    <span className="article-hero-credit">
                      {[article.imageProvider, article.imageLicense].filter(Boolean).join(" · ")}
                    </span>
                  )
                ) : null}
              </figcaption>
            ) : null}
          </figure>

          {/* Ad slot: after the hero, below the H1 (never before it) — reserved space, no CLS. */}
          <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_TOP} className="ad-slot--article" />

          {/* Rich long-form body (semantic HTML). Falls back to plain paragraphs. */}
          {richBody ? (
            <div
              className="article-rich-body"
              dangerouslySetInnerHTML={{ __html: richBody }}
            />
          ) : (
            article.content.map((paragraph, index) => (
              <div className="article-body-section" key={index}>
                <p>{paragraph}</p>
              </div>
            ))
          )}

          <aside className="article-eeat-box">
            <p className="article-eeat-author">
              Por <strong>{article.author}</strong>
            </p>
            <p className="article-eeat-note">
              Conteúdo produzido com apoio de inteligência artificial e submetido a checagens
              editoriais automatizadas. {reviewStatus.kind === "verified" ? (
                <>
                  Revisão humana desta versão registrada por{" "}
                  <strong>{reviewStatus.reviewer.name}</strong> em{" "}
                  {formatDate(reviewStatus.reviewedAt)} (versão{" "}
                  <code>{reviewStatus.reviewedContentHash.replace(/^sha256:/i, "").slice(0, 12)}</code>).
                </>
              ) : reviewStatus.kind === "none" ? (
                <>Nenhum revisor humano está registrado para esta versão.</>
              ) : reviewStatus.kind === "stale" ? (
                <>Há revisão humana associada a outra versão, mas não ao conteúdo exibido aqui.</>
              ) : (
                <>Há um revisor associado, mas o registro não comprova revisão desta versão.</>
              )}{" "}
              Consulte nossa <Link href="/como-usamos-ia">política de IA</Link> e{" "}
              <Link href="/politica-editorial">política editorial</Link>. Publicado em{" "}
              {formatDate(article.publishedAt)}. Correções seguem a nossa{" "}
              <Link href="/politica-de-correcoes">política de correções</Link>.
            </p>
          </aside>

          {/* Ad slot: end of the article, before sharing. */}
          <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_BOTTOM} className="ad-slot--article" />

          {/* Share bar — moved to the end of the article (horizontal) */}
          <div className="article-share-bar">
            <span className="article-share-bar__label">Compartilhar</span>
            <ShareButtons url={absoluteUrl(`/artigos/${article.slug}`)} title={article.headline} />
          </div>
        </article>

        {/* FLOATING ACTION: BACK TO TOP BUTTON */}
        <ScrollToTopButton />
      </div>

      {/* Leia também — full-width grid below the article (frees the side space).
          Only renders when there are genuinely related articles. */}
      {relatedArticles.length ? (
        <section className="article-related-section">
          <div className="container">
            <div className="section-title-bar">
              <h2>Leia também</h2>
              <div className="title-bar-line" />
            </div>
            <div className="article-related-grid">
              {relatedArticles.map((item) => (
                <Link href={`/artigos/${item.slug}`} className="related-card" key={item.slug}>
                  <div className="related-card__media">
                    <Image
                      src={item.image}
                      alt={item.imageAlt || item.headline}
                      fill
                      sizes="(max-width: 768px) 50vw, 280px"
                      className="card-cover-img"
                    />
                  </div>
                  <div className="related-card__body">
                    <strong>{item.headline}</strong>
                    <span className="related-card__meta">{item.readingTime} de leitura</span>
                  </div>
                </Link>
              ))}
            </div>
            <Link href={`/categoria/${article.category}`} className="related-articles-footer-btn">
              Ver mais em {category?.name || article.category} <ArrowRight size={12} />
            </Link>
          </div>
        </section>
      ) : null}
    </main>
  );
}
