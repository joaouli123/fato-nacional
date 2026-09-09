import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  current,
  total,
  basePath,
}: {
  current: number;
  total: number;
  basePath: string;
}) {
  if (total <= 1) return null;
  const href = (p: number) => (p <= 1 ? basePath : `${basePath}?page=${p}`);

  const pages: number[] = [];
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || Math.abs(p - current) <= 1) pages.push(p);
  }

  return (
    <nav className="pagination" aria-label="Paginação">
      {current > 1 ? (
        <Link href={href(current - 1)} className="pagination__btn" aria-label="Página anterior">
          <ChevronLeft size={16} />
        </Link>
      ) : null}

      {pages.map((p, i) => (
        <span key={p} className="pagination__cell">
          {i > 0 && p - pages[i - 1] > 1 ? <span className="pagination__gap">…</span> : null}
          <Link
            href={href(p)}
            className={`pagination__page${p === current ? " is-current" : ""}`}
            aria-current={p === current ? "page" : undefined}
          >
            {p}
          </Link>
        </span>
      ))}

      {current < total ? (
        <Link href={href(current + 1)} className="pagination__btn" aria-label="Próxima página">
          <ChevronRight size={16} />
        </Link>
      ) : null}
    </nav>
  );
}
