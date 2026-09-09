import Link from "next/link";
import Image from "next/image";
import type { Article } from "@/lib/data/seed";
import { formatDate } from "@/lib/utils";

export function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="article-card">
      <Link className="article-card__media" href={`/artigos/${article.slug}`}>
        <Image
          src={article.image}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 360px"
          className="card-cover-img"
        />
      </Link>
      <div className="article-card__body">
        <span className="badge">{article.category}</span>
        <h3>
          <Link href={`/artigos/${article.slug}`}>{article.headline}</Link>
        </h3>
        <p>{article.description}</p>
        <div className="meta">
          <span>{formatDate(article.publishedAt)}</span>
          <span>{article.readingTime} de leitura</span>
        </div>
      </div>
    </article>
  );
}
