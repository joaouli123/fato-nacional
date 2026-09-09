import type { Article } from "@/lib/data/seed";
import { getPublicReviewStatus } from "@/lib/editorial-transparency";

export function ArticleSidebar({ article }: { article: Article }) {
  const review = getPublicReviewStatus(article);
  return (
    <aside className="article-sidebar">
      <p className="eyebrow">Transparencia</p>
      <p>Autor: {article.author}</p>
      <p>
        {review.kind === "verified"
          ? `Revisão humana registrada por ${review.reviewer.name}.`
          : "Nenhuma revisão humana verificável registrada para esta versão."}
      </p>
      <div className="meta">
        {article.tags.map((tag) => (
          <span className="badge" key={tag}>
            {tag}
          </span>
        ))}
      </div>
    </aside>
  );
}
