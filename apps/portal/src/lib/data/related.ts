import type { Article } from "./seed";
import { slugify } from "@/lib/utils";

/**
 * Intelligent "Leia também" (related articles) ranking.
 *
 * Google's guidance on internal links is explicit: every internal link should
 * reinforce topical relevance / a topic cluster, and irrelevant or random links
 * hurt rankings and the reader experience (Helpful Content, people-first). So we
 * NEVER pad the list with the newest posts. A candidate is only eligible when it
 * shares real topical signal with the source article; if nothing qualifies we
 * return an empty list and the section renders nothing at all.
 *
 * Signals, strongest first:
 *   1. Shared curated tags           — the strongest, editor-intended topic link;
 *                                      the ONLY signal allowed to relate articles
 *                                      across different categories.
 *   2. Same category                 — same desk; broad on its own, so within a
 *                                      category it only qualifies a candidate that
 *                                      also has strong headline/summary term
 *                                      overlap (a category like "Brasil" is not,
 *                                      by itself, evidence two pieces are related).
 *   3. Headline/summary term overlap — refines ranking and lets same-desk pieces
 *                                      qualify without an identical tag. It is
 *                                      NEVER enough on its own across categories:
 *                                      a few generic words coinciding between two
 *                                      unrelated stories is not topical relevance.
 *   4. Same content type             — tiny affinity bonus (guide↔guide).
 *
 * Recency is only a tie-breaker among already-relevant candidates; it can never
 * pull an unrelated article into the list.
 */

// Normalized (lowercase, unaccented) Portuguese stopwords + explainer boilerplate
// ("como", "entenda", "guia"…) that carry no topical signal and would otherwise
// create spurious overlaps between unrelated headlines.
const STOPWORDS = new Set<string>([
  // articles, prepositions, conjunctions
  "uma", "uns", "umas", "dos", "das", "nos", "nas", "por", "pelo", "pela", "pelos",
  "pelas", "para", "com", "sem", "sob", "sobre", "ate", "apos", "ante", "entre",
  "mas", "que", "como", "quando", "onde", "porque", "pois", "contra", "desde",
  "durante", "cerca", "dele", "dela", "deles", "delas",
  // possessives, pronouns, determiners
  "seu", "sua", "seus", "suas", "meu", "minha", "teu", "tua", "nosso", "nossa",
  "este", "esta", "estes", "estas", "esse", "essa", "esses", "essas", "aquele",
  "aquela", "isto", "isso", "aquilo", "qual", "quais", "quem", "cujo", "cada",
  "todo", "toda", "todos", "todas", "mesmo", "mesma", "outro", "outra", "outros",
  "outras", "ele", "ela", "eles", "elas", "voce", "voces",
  // adverbs / quantifiers
  "nao", "sim", "tambem", "muito", "muita", "muitos", "muitas", "mais", "menos",
  "pouco", "depois", "antes", "agora", "aqui", "ali", "entao", "assim", "apenas",
  "ainda", "sempre",
  // high-frequency verbs (ser / estar / ter / haver / poder / fazer)
  "ser", "estar", "ter", "foi", "sao", "era", "eram", "sera", "serao", "tem",
  "teve", "havia", "vai", "vao", "pode", "podem", "deve", "devem", "fazer", "faz",
  // explainer / headline boilerplate (topic-neutral)
  "entenda", "saiba", "veja", "confira", "tudo", "guia", "dicas", "passo",
  "aprenda", "funciona", "novo", "nova", "novos", "novas", "assista", "descubra",
  "conheca",
]);

const COMBINING_MARKS = /[̀-ͯ]/g;
const NON_ALNUM = /[^a-z0-9]+/g;
const ONLY_DIGITS = /^\d+$/;

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(COMBINING_MARKS, "");
}

/**
 * Significant, topic-bearing terms from an article's headline + summary. Drops
 * 1–2 char noise, bare numbers (years like "2026"), stopwords and boilerplate.
 */
function significantTerms(article: Article): Set<string> {
  const source = `${article.headline} ${article.summary ?? article.description ?? ""}`;
  const terms = new Set<string>();
  for (const token of normalize(source).split(NON_ALNUM)) {
    if (token.length < 3) continue;
    if (ONLY_DIGITS.test(token)) continue;
    if (STOPWORDS.has(token)) continue;
    terms.add(token);
  }
  return terms;
}

/** Accent/case-insensitive slugified tag set (matches repository tag handling). */
function tagKeys(article: Article): Set<string> {
  const keys = new Set<string>();
  for (const tag of article.tags ?? []) {
    const key = slugify(tag);
    if (key) keys.add(key);
  }
  return keys;
}

function intersectionSize(a: Set<string>, b: Set<string>): number {
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  let count = 0;
  for (const item of small) if (big.has(item)) count += 1;
  return count;
}

const WEIGHT_TAG = 6;
const WEIGHT_CATEGORY = 3;
const WEIGHT_TERM = 1.5;
const TERM_MATCH_CAP = 6;
const WEIGHT_SAME_TYPE = 0.5;
// A same-category candidate with no shared tag must overlap on at least this many
// significant headline/summary terms to qualify — high enough that coincidental
// generic words don't create weak "same desk, unrelated topic" suggestions.
const MIN_SAME_CATEGORY_TERMS = 3;
const RECENCY_MAX_BONUS = 2;
const RECENCY_HALF_LIFE_DAYS = 120;
const DAY_MS = 86_400_000;

/** Small freshness boost (0..RECENCY_MAX_BONUS), halving every ~120 days. */
function recencyBonus(article: Article, now: number): number {
  const published = new Date(article.publishedAt).getTime();
  if (!Number.isFinite(published)) return 0;
  const ageDays = Math.max(0, (now - published) / DAY_MS);
  return RECENCY_MAX_BONUS * Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);
}

export type RelatedArticle = Article & { relevanceScore: number };

export type RankRelatedOptions = {
  /** Max number of related articles to return (default 4). */
  limit?: number;
  /** Reference timestamp for the recency tie-breaker (default Date.now()). */
  now?: number;
};

/**
 * Rank `candidates` by topical relevance to `source` and return only those that
 * pass the qualification gate, best first. Returns `[]` when nothing is a
 * genuine topical match — the caller should then render no "related" section.
 */
export function rankRelatedArticles(
  source: Article,
  candidates: Article[],
  options: RankRelatedOptions = {},
): RelatedArticle[] {
  const limit = Math.max(0, options.limit ?? 4);
  if (limit === 0) return [];
  const now = options.now ?? Date.now();

  const sourceTags = tagKeys(source);
  const sourceTerms = significantTerms(source);
  const sourceType = source.contentType ?? "article";

  const scored: RelatedArticle[] = [];
  for (const candidate of candidates) {
    if (candidate.slug === source.slug) continue;

    const sharedTags = intersectionSize(sourceTags, tagKeys(candidate));
    const sameCategory = candidate.category === source.category;
    const sharedTerms = intersectionSize(sourceTerms, significantTerms(candidate));

    // Topical qualification gate — the rule that forbids random suggestions.
    // Either a shared curated tag (the only cross-category signal we trust), or,
    // WITHIN the same category, strong headline/summary term overlap. Term
    // overlap alone across categories is rejected: coincidental generic words do
    // not make two unrelated articles related.
    const qualifies = sharedTags >= 1 || (sameCategory && sharedTerms >= MIN_SAME_CATEGORY_TERMS);
    if (!qualifies) continue;

    const sameType = (candidate.contentType ?? "article") === sourceType;
    const score =
      sharedTags * WEIGHT_TAG +
      (sameCategory ? WEIGHT_CATEGORY : 0) +
      Math.min(sharedTerms, TERM_MATCH_CAP) * WEIGHT_TERM +
      (sameType ? WEIGHT_SAME_TYPE : 0) +
      recencyBonus(candidate, now);

    scored.push({ ...candidate, relevanceScore: Number(score.toFixed(4)) });
  }

  scored.sort(
    (a, b) =>
      b.relevanceScore - a.relevanceScore ||
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime() ||
      a.slug.localeCompare(b.slug),
  );

  return scored.slice(0, limit);
}
