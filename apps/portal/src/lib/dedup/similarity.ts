import { Pool } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  }
  return pool;
}

export type SimilarHit = { slug: string; headline: string; similarity: number };

/**
 * Anti-cannibalization: finds existing PUBLISHED articles whose headline is
 * lexically similar to `title` (pg_trgm + unaccent, accent/case-insensitive).
 * Returns hits above `threshold` (0..1), most similar first.
 */
export async function findSimilarArticles(
  title: string,
  threshold = 0.3,
  limit = 5,
): Promise<SimilarHit[]> {
  if (!title || !process.env.DATABASE_URL) return [];
  try {
    const res = await getPool().query<SimilarHit>(
      `SELECT slug, headline,
              similarity(unaccent(lower(headline)), unaccent(lower($1))) AS similarity
         FROM articles
        WHERE _status = 'published'
          AND similarity(unaccent(lower(headline)), unaccent(lower($1))) > $2
        ORDER BY similarity DESC
        LIMIT $3`,
      [title, threshold, limit],
    );
    return res.rows.map((r) => ({ ...r, similarity: Number(r.similarity) }));
  } catch {
    return [];
  }
}

/**
 * Recommendation for a freshly discovered topic vs. what's already published.
 * If a very similar article exists, flag it as likely cannibalization.
 */
export async function recommendForTopic(title: string): Promise<{
  action: string;
  similarTo: SimilarHit | null;
}> {
  // pg_trgm on short headlines is noisy with common PT words, so thresholds are
  // conservative: this reliably catches near-DUPLICATE titles. Semantic
  // cannibalization (same topic, different words) needs embeddings (pgvector ready).
  const hits = await findSimilarArticles(title, 0.25, 1);
  const top = hits[0] ?? null;
  if (top && top.similarity >= 0.5) {
    return { action: "duplicado (titulo quase identico)", similarTo: top };
  }
  if (top && top.similarity >= 0.35) {
    return { action: "ja coberto (possivel canibalizacao)", similarTo: top };
  }
  return { action: "acompanhar", similarTo: null };
}
