import type { Article } from "@/lib/data/seed";
import { SCORE_WEIGHTS, meetsPublishBar } from "./editorial-standard";

/** Categories treated as YMYL (Your Money or Your Life). */
export const YMYL_CATEGORIES = ["financas", "saude", "direito", "politica", "seguranca"] as const;

const GENERICITY_PATTERNS = [
  { key: "cenario_atual", pattern: /\bno cen[aá]rio atual\b/giu },
  { key: "mundo_cada_vez_mais", pattern: /\bem um mundo cada vez mais\b/giu },
  { key: "dias_de_hoje", pattern: /\bnos dias de hoje\b/giu },
  { key: "importante_destacar", pattern: /\b[eé] importante destacar\b/giu },
  { key: "vale_ressaltar", pattern: /\bvale ressaltar\b/giu },
  { key: "papel_crucial", pattern: /\bdesempenha um papel (?:crucial|fundamental)\b/giu },
  { key: "fazer_diferenca", pattern: /\bpode fazer toda a diferen[cç]a\b/giu },
  { key: "neste_artigo", pattern: /\bneste artigo\b/giu },
  { key: "continue_lendo", pattern: /\bcontinue lendo\b/giu },
  { key: "em_suma", pattern: /\bem suma\b/giu },
] as const;

const BUILT_IN_AUTHORITY_HOSTS = [
  "europa.eu",
  "imf.org",
  "oecd.org",
  "un.org",
  "who.int",
  "worldbank.org",
] as const;

const GENERIC_SOURCE_HOSTS = [
  "blogspot.com",
  "example.com",
  "example.net",
  "example.org",
  "medium.com",
  "substack.com",
  "wordpress.com",
] as const;

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:nbsp|#160);/gi, " ")
    .replace(/&(?:amp|#38);/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  return normalizedText(value).match(/[\p{L}\p{N}]+/gu) ?? [];
}

function slugClean(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug);
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function countMatches(value: string, pattern: RegExp): number {
  pattern.lastIndex = 0;
  const count = (value.match(pattern) ?? []).length;
  pattern.lastIndex = 0;
  return count;
}

function segmentsFromHtml(html: string): string[] {
  const separated = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:blockquote|div|h[1-6]|li|p|section|td|th|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:nbsp|#160);/gi, " ")
    .replace(/[\t ]+/g, " ")
    .replace(/\n\s*/g, "\n")
    .trim();

  return separated
    .split(/\n+|(?<=[.!?])\s+/u)
    .map((segment) => segment.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export type TextQualityMetrics = {
  rawWordCount: number;
  effectiveWordCount: number;
  repetitionRatio: number;
  uniqueShingleRatio: number;
  repeatedSegmentCount: number;
  genericityOccurrences: number;
  genericitySignals: string[];
  generic: boolean;
  severelyRepetitive: boolean;
};

/**
 * Measures usable depth instead of raw length. Exact repeated segments are counted
 * once and a five-word shingle ratio catches repetition inside a single long block.
 */
export function analyzeTextQuality(html: string): TextQualityMetrics {
  const text = stripHtml(html);
  const tokens = tokenize(text);
  const rawWordCount = tokens.length;
  const segments = segmentsFromHtml(html);
  const seenSegments = new Set<string>();
  let deduplicatedWordCount = 0;
  let repeatedSegmentCount = 0;

  for (const segment of segments) {
    const segmentTokens = tokenize(segment);
    if (segmentTokens.length < 6) {
      deduplicatedWordCount += segmentTokens.length;
      continue;
    }

    const normalized = segmentTokens.join(" ");
    if (seenSegments.has(normalized)) {
      repeatedSegmentCount += 1;
      continue;
    }
    seenSegments.add(normalized);
    deduplicatedWordCount += segmentTokens.length;
  }

  const shingleSize = 5;
  const shingleCount = Math.max(0, tokens.length - shingleSize + 1);
  const shingles = new Set<string>();
  for (let index = 0; index < shingleCount; index += 1) {
    shingles.add(tokens.slice(index, index + shingleSize).join(" "));
  }
  const uniqueShingleRatio = shingleCount > 0 ? shingles.size / shingleCount : 1;
  const shingleAdjustedWords = Math.round(rawWordCount * Math.min(1, uniqueShingleRatio + 0.15));
  const effectiveWordCount = Math.min(rawWordCount, deduplicatedWordCount, shingleAdjustedWords);
  const repetitionRatio = rawWordCount > 0 ? 1 - effectiveWordCount / rawWordCount : 0;

  const genericitySignals: string[] = [];
  let genericityOccurrences = 0;
  for (const signal of GENERICITY_PATTERNS) {
    const occurrences = countMatches(text, signal.pattern);
    if (occurrences > 0) genericitySignals.push(signal.key);
    genericityOccurrences += occurrences;
  }

  const generic =
    rawWordCount >= 200 &&
    (genericitySignals.length >= 3 || genericityOccurrences >= 5);
  const severelyRepetitive =
    rawWordCount >= 300 &&
    (repetitionRatio >= 0.45 || (repeatedSegmentCount >= 4 && repetitionRatio >= 0.3));

  return {
    rawWordCount,
    effectiveWordCount,
    repetitionRatio,
    uniqueShingleRatio,
    repeatedSegmentCount,
    genericityOccurrences,
    genericitySignals,
    generic,
    severelyRepetitive,
  };
}

type ParsedLink = {
  href: string;
  url?: URL;
  internalSlug?: string;
};

function extractLinks(html: string): ParsedLink[] {
  const links: ParsedLink[] = [];
  const pattern = /<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const href = match[2].trim();
    const internal = href.match(/^\/artigos\/([^/?#]+)\/?(?:[?#].*)?$/i);
    if (internal) {
      links.push({ href, internalSlug: internal[1].toLowerCase() });
      continue;
    }
    if (/^\/artigos(?:\/|$)/i.test(href)) {
      // Preserve malformed article paths so they fail validation instead of
      // disappearing from the audit (for example /artigos/ or nested slashes).
      links.push({ href, internalSlug: href.toLowerCase() });
      continue;
    }

    if (/^https?:\/\//i.test(href)) {
      try {
        links.push({ href, url: new URL(href) });
      } catch {
        links.push({ href });
      }
    }
  }
  return links;
}

function canonicalUrl(value: string | URL): string | null {
  try {
    const url = typeof value === "string" ? new URL(value) : new URL(value.toString());
    url.hash = "";
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return null;
  }
}

function hostMatches(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function hasSpecificSourceTarget(url: URL): boolean {
  return url.pathname.replace(/\/+$/, "").length > 0 || url.search.length > 1;
}

function isKnownGenericSource(url: URL): boolean {
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  return (
    GENERIC_SOURCE_HOSTS.some((domain) => hostMatches(hostname, domain)) ||
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".invalid")
  );
}

function builtInOfficialSource(url: URL): boolean {
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!hasSpecificSourceTarget(url)) return false;
  if (isKnownGenericSource(url)) return false;

  return (
    hostname === "gov.br" ||
    hostname.endsWith(".gov.br") ||
    hostname.endsWith(".leg.br") ||
    hostname.endsWith(".jus.br") ||
    hostname.endsWith(".gov") ||
    BUILT_IN_AUTHORITY_HOSTS.some((domain) => hostMatches(hostname, domain))
  );
}

function meaningfulHeadings(html: string, level: 2 | 3): string[] {
  const pattern = new RegExp(`<h${level}\\b[^>]*>([\\s\\S]*?)<\\/h${level}>`, "gi");
  return [...html.matchAll(pattern)].map((match) => stripHtml(match[1])).filter(Boolean);
}

function meaningfulSummary(html: string): boolean {
  const headingPattern = /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi;
  const headings = [...html.matchAll(headingPattern)];
  const summaryHeading = headings.find((match) => /resumo(?: em)? (?:\d+|cinco) pontos/i.test(stripHtml(match[1])));
  if (!summaryHeading || summaryHeading.index === undefined) return false;
  const sectionStart = summaryHeading.index + summaryHeading[0].length;
  const rest = html.slice(sectionStart);
  const nextHeading = rest.search(/<h2\b/i);
  const section = nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;
  const items = [...section.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => stripHtml(match[1]))
    .filter((item) => tokenize(item).length >= 3);
  return items.length >= 3;
}

function meaningfulFaqPairs(html: string): number {
  const headingPattern = /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi;
  const headings = [...html.matchAll(headingPattern)];
  const faqHeading = headings.find((match) => normalizedText(stripHtml(match[1])).includes("perguntas frequentes"));
  if (!faqHeading || faqHeading.index === undefined) return 0;
  const sectionStart = faqHeading.index + faqHeading[0].length;
  const rest = html.slice(sectionStart);
  const nextHeading = rest.search(/<h2\b/i);
  const section = nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;
  const pairPattern = /<h3\b[^>]*>([\s\S]*?)<\/h3>\s*<p\b[^>]*>([\s\S]*?)<\/p>/gi;

  return [...section.matchAll(pairPattern)].filter((match) => {
    const questionWords = tokenize(stripHtml(match[1])).length;
    const answerWords = tokenize(stripHtml(match[2])).length;
    return questionWords >= 2 && answerWords >= 3;
  }).length;
}

function meaningfulTableCount(html: string): number {
  return [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].filter((tableMatch) => {
    const rows = [...tableMatch[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
    let meaningfulRows = 0;
    let hasDataRow = false;
    for (const row of rows) {
      const cells = [...row[1].matchAll(/<(t[hd])\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)]
        .map((cell) => ({ type: cell[1].toLowerCase(), text: stripHtml(cell[2]) }))
        .filter((cell) => tokenize(cell.text).length > 0);
      if (cells.length >= 2) {
        meaningfulRows += 1;
        if (cells.some((cell) => cell.type === "td")) hasDataRow = true;
      }
    }
    return meaningfulRows >= 2 && hasDataRow;
  }).length;
}

export type HumanReviewEvidence = {
  reviewerId: string;
  approvedAt: string;
  contentHash?: string;
};

export type ScoreArticleOptions = {
  /** Published article slugs known to resolve. Required for internal links to score. */
  validInternalSlugs?: Iterable<string>;
  /** Alternative synchronous resolver for callers that already have an index. */
  resolveInternalLink?: (slug: string) => boolean;
  /** Fail closed when links exist but no target validator was supplied. */
  strictInternalLinks?: boolean;
  /** Exact URLs validated as authoritative by the research/evidence stage. */
  officialSourceUrls?: Iterable<string>;
  /** Domain-aware extension point; generic HTTP links are never official by default. */
  isOfficialSource?: (url: URL) => boolean;
  /** Identified approval evidence. A byline is not human-review evidence. */
  humanReview?: HumanReviewEvidence;
  /** Defaults to true. Set false only for a read-only legacy corpus audit. */
  requireHumanReviewForSensitive?: boolean;
  /** Hash of the exact draft being scored, when hash-bound review is enabled. */
  contentHash?: string;
  /** Critical findings produced by an independent fact-check stage. */
  criticalIssues?: readonly string[];
  /** Components selected by the approved brief; omitted components are not mandatory. */
  expectedComponents?: readonly ("faq" | "table")[];
};

export type ScoreCheck = {
  key: string;
  label: string;
  points: number;
  max: number;
  ok: boolean;
  detail: string;
};

export type ScorePenalty = {
  key: string;
  label: string;
  points: number;
  detail: string;
};

export type GateIssue = {
  code:
    | "critical_factual_issue"
    | "empty_content"
    | "generic_content"
    | "insufficient_official_sources"
    | "internal_link_validation_unavailable"
    | "invalid_internal_link"
    | "missing_human_review"
    | "missing_ymyl_disclaimer"
    | "severe_repetition"
    | "stale_human_review"
    | "unfulfilled_title_promise"
    | "unverified_internal_links"
    | "unverified_source_links";
  label: string;
  detail: string;
};

export type ArticleScoreMetrics = TextQualityMetrics & {
  externalLinkCount: number;
  officialSourceCount: number;
  internalLinkCount: number;
  validInternalLinkCount: number;
  invalidInternalSlugs: string[];
  unverifiedInternalSlugs: string[];
  meaningfulFaqPairs: number;
  meaningfulTableCount: number;
};

export type ArticleScore = {
  slug: string;
  headline: string;
  category: string;
  score: number;
  max: number;
  passes: boolean;
  sensitive: boolean;
  decision: "approved" | "human_review_required" | "rejected";
  checks: ScoreCheck[];
  penalties: ScorePenalty[];
  hardBlockers: GateIssue[];
  warnings: GateIssue[];
  metrics: ArticleScoreMetrics;
  missing: string[];
};

/**
 * Deterministic pre-publish quality gate. The numeric score remains 0–100, while
 * hard blockers are evaluated independently: a high structural score can never
 * compensate for broken evidence, invalid targets or severe repetition.
 */
export function scoreArticle(a: Article): ArticleScore;
export function scoreArticle(a: Article, options: ScoreArticleOptions): ArticleScore;
export function scoreArticle(a: Article, options: ScoreArticleOptions = {}): ArticleScore {
  const html = a.contentHtml || (a.content || []).join("\n") || "";
  const textQuality = analyzeTextQuality(html);
  const h2 = meaningfulHeadings(html, 2).length;
  const hasFontes = /fontes consultadas/i.test(stripHtml(html));
  const hasResumo = meaningfulSummary(html);
  const faqPairs = meaningfulFaqPairs(html);
  const tableCount = meaningfulTableCount(html);
  const hasFaq = faqPairs >= 2;
  const hasTable = tableCount >= 1;
  const hasDisclaimer = /<blockquote\b/i.test(html) || /não constitui recomenda|aviso importante/i.test(stripHtml(html));
  const metaLen = (a.metaDescription || "").length;
  const seoLen = (a.seoTitle || a.headline || "").length;
  const sensitive = (YMYL_CATEGORIES as readonly string[]).includes(a.category);
  const links = extractLinks(html);
  const externalUrls = [...new Map(
    links
      .filter((link): link is ParsedLink & { url: URL } => Boolean(link.url))
      .map((link) => [canonicalUrl(link.url), link.url] as const)
      .filter((entry): entry is readonly [string, URL] => Boolean(entry[0])),
  ).values()];

  const explicitlyOfficial = new Set<string>();
  for (const source of options.officialSourceUrls ?? []) {
    const canonical = canonicalUrl(source);
    if (canonical) explicitlyOfficial.add(canonical);
  }
  const officialUrls = externalUrls.filter((url) => {
    if (!hasSpecificSourceTarget(url)) return false;
    // Callers may extend the authority policy, but placeholders, publishing
    // platforms and local hosts can never be promoted to "official" evidence.
    if (isKnownGenericSource(url)) return false;
    const canonical = canonicalUrl(url);
    if (canonical && explicitlyOfficial.has(canonical)) return true;
    if (builtInOfficialSource(url)) return true;
    try {
      return options.isOfficialSource?.(url) === true;
    } catch {
      return false;
    }
  });

  const internalSlugs = [...new Set(
    links.map((link) => link.internalSlug).filter((slug): slug is string => Boolean(slug)),
  )];
  const validSlugSet = options.validInternalSlugs
    ? new Set([...options.validInternalSlugs].map((slug) => slug.toLowerCase()))
    : undefined;
  const hasInternalResolver = Boolean(validSlugSet || options.resolveInternalLink);
  const validInternalSlugs: string[] = [];
  const invalidInternalSlugs: string[] = [];
  const unverifiedInternalSlugs: string[] = [];

  for (const slug of internalSlugs) {
    if (!slugClean(slug)) {
      invalidInternalSlugs.push(slug);
      continue;
    }
    if (!hasInternalResolver) {
      unverifiedInternalSlugs.push(slug);
      continue;
    }

    let valid = validSlugSet?.has(slug) ?? false;
    if (!valid && options.resolveInternalLink) {
      try {
        valid = options.resolveInternalLink(slug);
      } catch {
        valid = false;
      }
    }
    (valid ? validInternalSlugs : invalidInternalSlugs).push(slug);
  }

  const checks: ScoreCheck[] = [];
  const add = (key: string, label: string, points: number, max: number, detail: string) =>
    checks.push({ key, label, points, max, ok: points >= max, detail });

  // Official sources (20). Generic links and authority homepages score zero.
  const sourceCount = officialUrls.length;
  const fontesPts =
    sourceCount >= 3 ? (hasFontes ? 20 : 16) :
    sourceCount >= 1 ? (hasFontes ? 12 : 8) : 0;
  add(
    "fontesOficiais",
    "Fontes oficiais",
    fontesPts,
    SCORE_WEIGHTS.fontesOficiais,
    `${sourceCount} fonte(s) oficial(is) específica(s) de ${externalUrls.length} link(s) externo(s)${hasFontes ? ", seção presente" : ", sem seção Fontes"}`,
  );

  // Depth (15) uses effective rather than raw words.
  const words = textQuality.effectiveWordCount;
  const depthPts = words >= 1200 ? 15 : words >= 900 ? 11 : words >= 600 ? 7 : words >= 300 ? 4 : 0;
  add(
    "profundidade",
    "Profundidade",
    depthPts,
    SCORE_WEIGHTS.profundidade,
    `${words} palavras efetivas (${textQuality.rawWordCount} brutas; ${Math.round(textQuality.repetitionRatio * 100)}% de repetição)`,
  );

  // SEO on-page (15): title, meta description, slug.
  const seoOk = seoLen > 0 && seoLen <= 65;
  const metaOk = metaLen >= 110 && metaLen <= 170;
  const slugOk = slugClean(a.slug);
  const seoPts = (seoOk ? 5 : 0) + (metaOk ? 5 : 0) + (slugOk ? 5 : 0);
  add(
    "seoOnPage",
    "SEO on-page",
    seoPts,
    SCORE_WEIGHTS.seoOnPage,
    `título ${seoLen}c${seoOk ? "" : " (fora 1–65)"}, meta ${metaLen}c${metaOk ? "" : " (fora 110–170)"}, slug ${slugOk ? "ok" : "inválido"}`,
  );

  // Clarity/structure (10).
  const clarezaPts = (hasResumo ? 5 : 0) + (h2 >= 3 ? 5 : 0);
  add(
    "clareza",
    "Clareza/estrutura",
    clarezaPts,
    SCORE_WEIGHTS.clareza,
    `${h2} H2 válidos${hasResumo ? ", resumo preenchido" : ", sem resumo preenchido"}`,
  );

  // Freshness (10).
  const atualPts = a.updatedAt ? 10 : 0;
  add("atualizacao", "Data de atualização", atualPts, SCORE_WEIGHTS.atualizacao, a.updatedAt ? String(a.updatedAt) : "ausente");

  // Internal links (10): only targets verified by the caller can score.
  const linkPts = validInternalSlugs.length >= 3 ? 10 : validInternalSlugs.length >= 1 ? 5 : 0;
  add(
    "linksInternos",
    "Links internos válidos",
    linkPts,
    SCORE_WEIGHTS.linksInternos,
    `${validInternalSlugs.length} válido(s), ${invalidInternalSlugs.length} inválido(s), ${unverifiedInternalSlugs.length} não verificado(s)`,
  );

  // Authorship/image (10).
  const autoriaPts = (a.author ? 6 : 0) + (a.imageAlt ? 4 : 0);
  add(
    "autoriaTransparencia",
    "Autoria + imagem",
    autoriaPts,
    SCORE_WEIGHTS.autoriaTransparencia,
    `${a.author || "sem autor"}${a.imageAlt ? ", alt ok" : ", sem alt"}`,
  );

  // FAQ/table (10): only components selected by the brief are required. Empty
  // wrappers still never satisfy an expected component.
  const expectedComponents = options.expectedComponents
    ? new Set(options.expectedComponents)
    : null;
  const faqSatisfied = expectedComponents ? !expectedComponents.has("faq") || hasFaq : hasFaq;
  const tableSatisfied = expectedComponents ? !expectedComponents.has("table") || hasTable : hasTable;
  const uxPts = (faqSatisfied ? 5 : 0) + (tableSatisfied ? 5 : 0);
  add(
    "uxTabelaFaq",
    "FAQ + tabela úteis",
    uxPts,
    SCORE_WEIGHTS.uxTabelaFaq,
    `${faqPairs} par(es) de FAQ preenchido(s), ${tableCount} tabela(s) preenchida(s)` +
      (expectedComponents
        ? `; brief exige: ${[...expectedComponents].join(", ") || "nenhum componente"}`
        : "; sem brief de componentes"),
  );

  const penalties: ScorePenalty[] = [];
  const addPenalty = (key: string, label: string, points: number, detail: string) => {
    if (points > 0) penalties.push({ key, label, points, detail });
  };

  if (sensitive && !hasDisclaimer) {
    addPenalty("missingYmylDisclaimer", "Disclaimer YMYL ausente", 10, "Tema sensível sem aviso editorial explícito.");
  }
  if (textQuality.generic) {
    const penalty = textQuality.genericityOccurrences >= 8 ? 8 : 4;
    addPenalty(
      "genericidade",
      "Linguagem genérica",
      penalty,
      `${textQuality.genericityOccurrences} ocorrência(s): ${textQuality.genericitySignals.join(", ")}`,
    );
  }

  // A numbered title must deliver the promised number of visible items.
  const olItemCount = ((html.match(/<ol[\s\S]*?<\/ol>/gi) || []).join(" ").match(/<li\b/gi) || []).length;
  const numberedHeadings = (html.match(/<h[2-4][^>]*>\s*\d+[.)]/gi) || []).length;
  const deliveredCount = Math.max(olItemCount, numberedHeadings);
  const numMatch = a.headline.match(
    /\b(\d{1,3})\s+(estrat[ée]gias|dicas|passos|formas|maneiras|motivos|raz[õo]es|itens|regras|erros|sinais|pilares|t[ée]cnicas)\b/i,
  );
  const promiseN = numMatch ? parseInt(numMatch[1], 10) : 0;
  const promiseOk = !promiseN || deliveredCount >= promiseN;
  if (!promiseOk) {
    addPenalty("titlePromise", "Promessa do título não entregue", 8, `Título promete ${promiseN}; corpo entrega ${deliveredCount}.`);
  }

  const baseScore = checks.reduce((sum, check) => sum + check.points, 0);
  const score = clampScore(baseScore - penalties.reduce((sum, penalty) => sum + penalty.points, 0));
  const hardBlockers: GateIssue[] = [];
  const warnings: GateIssue[] = [];
  const block = (code: GateIssue["code"], label: string, detail: string) => hardBlockers.push({ code, label, detail });
  const warn = (code: GateIssue["code"], label: string, detail: string) => warnings.push({ code, label, detail });

  if (textQuality.rawWordCount === 0) {
    block("empty_content", "Conteúdo vazio", "Não há palavras auditáveis no corpo.");
  }
  if (textQuality.severelyRepetitive) {
    block(
      "severe_repetition",
      "Repetição severa",
      `${Math.round(textQuality.repetitionRatio * 100)}% do volume bruto não representa conteúdo novo.`,
    );
  }
  if (textQuality.generic && textQuality.genericityOccurrences >= 8 && textQuality.genericitySignals.length >= 4) {
    block("generic_content", "Conteúdo genérico", "O texto excede o limite de clichês editoriais intercambiáveis.");
  }
  if (sensitive && !hasDisclaimer) {
    block("missing_ymyl_disclaimer", "Disclaimer YMYL ausente", "Temas sensíveis exigem aviso explícito.");
  }
  if (sensitive && sourceCount < 3) {
    block(
      "insufficient_official_sources",
      "Fontes oficiais insuficientes (YMYL)",
      `Encontradas ${sourceCount}; são necessárias pelo menos 3 URLs específicas e oficiais.`,
    );
  }
  if (!promiseOk) {
    block("unfulfilled_title_promise", "Promessa do título não entregue", `Título promete ${promiseN}; corpo entrega ${deliveredCount}.`);
  }
  if (invalidInternalSlugs.length > 0) {
    block("invalid_internal_link", "Link interno inválido", `Alvos sem resolução: ${invalidInternalSlugs.join(", ")}.`);
  }
  if (unverifiedInternalSlugs.length > 0) {
    const detail = `Forneça validInternalSlugs ou resolveInternalLink para: ${unverifiedInternalSlugs.join(", ")}.`;
    if (options.strictInternalLinks) {
      block("internal_link_validation_unavailable", "Validação de links indisponível", detail);
    } else {
      warn("unverified_internal_links", "Links internos não verificados", detail);
    }
  }
  if (hasFontes && externalUrls.length > 0 && sourceCount === 0) {
    warn("unverified_source_links", "Links externos não são fontes oficiais", "Nenhum link passou pela política de autoridade e URL específica.");
  }
  for (const issue of options.criticalIssues ?? []) {
    if (issue.trim()) block("critical_factual_issue", "Falha factual crítica", issue.trim());
  }

  const requireHumanReview = options.requireHumanReviewForSensitive ?? true;
  const review = options.humanReview;
  const reviewIsIdentified = Boolean(
    review?.reviewerId.trim() &&
    review.approvedAt &&
    Number.isFinite(new Date(review.approvedAt).getTime()),
  );
  if (sensitive && requireHumanReview && !reviewIsIdentified) {
    block("missing_human_review", "Revisão humana obrigatória", "Informe reviewerId e approvedAt válidos; a assinatura do artigo não comprova revisão.");
  }
  if (
    sensitive &&
    requireHumanReview &&
    reviewIsIdentified &&
    options.contentHash &&
    review?.contentHash !== options.contentHash
  ) {
    block("stale_human_review", "Revisão humana desatualizada", "O hash aprovado não corresponde ao conteúdo avaliado.");
  }

  const passes = meetsPublishBar(score, sensitive) && hardBlockers.length === 0;
  const onlyReviewMissing =
    hardBlockers.length > 0 &&
    hardBlockers.every((issue) => issue.code === "missing_human_review");
  const decision: ArticleScore["decision"] = passes
    ? "approved"
    : onlyReviewMissing
      ? "human_review_required"
      : "rejected";

  const missing = [...new Set([
    ...checks.filter((check) => !check.ok).map((check) => check.label),
    ...hardBlockers.map((issue) => issue.label),
  ])];

  return {
    slug: a.slug,
    headline: a.headline,
    category: a.category,
    score,
    max: 100,
    passes,
    sensitive,
    decision,
    checks,
    penalties,
    hardBlockers,
    warnings,
    metrics: {
      ...textQuality,
      externalLinkCount: externalUrls.length,
      officialSourceCount: sourceCount,
      internalLinkCount: internalSlugs.length,
      validInternalLinkCount: validInternalSlugs.length,
      invalidInternalSlugs,
      unverifiedInternalSlugs,
      meaningfulFaqPairs: faqPairs,
      meaningfulTableCount: tableCount,
    },
    missing,
  };
}
