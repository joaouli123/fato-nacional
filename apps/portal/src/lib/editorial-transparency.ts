import type { Article, ArticleReviewer } from "@/lib/data/seed";

const SENSITIVE_CATEGORIES = new Set([
  "financas",
  "saude",
  "direito",
  "politica",
  "seguranca",
]);

const SHA256_PATTERN = /^(?:sha256:)?[a-f0-9]{64}$/i;

type ReviewFields = Pick<
  Article,
  | "reviewer"
  | "reviewedAt"
  | "reviewedContentHash"
  | "reviewedVersionMatches"
>;

export type PublicReviewStatus =
  | {
      kind: "verified";
      reviewer: ArticleReviewer;
      reviewedAt: string;
      reviewedContentHash: string;
    }
  | {
      kind: "none" | "incomplete" | "stale";
      reviewer?: ArticleReviewer;
    };

export function isSensitiveArticle(
  article: Pick<Article, "category" | "riskLevel">,
): boolean {
  return article.riskLevel === "high" || SENSITIVE_CATEGORIES.has(article.category);
}

export function getPublicReviewStatus(article: ReviewFields): PublicReviewStatus {
  if (!article.reviewer?.id.trim()) return { kind: "none" };

  const reviewedAt = article.reviewedAt;
  const reviewedContentHash = article.reviewedContentHash?.trim();
  if (
    !reviewedAt ||
    !Number.isFinite(new Date(reviewedAt).getTime()) ||
    !reviewedContentHash ||
    !SHA256_PATTERN.test(reviewedContentHash)
  ) {
    return { kind: "incomplete", reviewer: article.reviewer };
  }

  if (article.reviewedVersionMatches !== true) {
    return { kind: "stale", reviewer: article.reviewer };
  }

  return {
    kind: "verified",
    reviewer: article.reviewer,
    reviewedAt,
    reviewedContentHash,
  };
}

export function hasVerifiedHumanReview(article: ReviewFields): boolean {
  return getPublicReviewStatus(article).kind === "verified";
}

/**
 * Public fail-closed gate. Sensitive content remains available in the CMS but
 * is excluded from every public repository consumer until its exact version
 * has a complete, hash-bound human review record.
 */
export function isPubliclyEligibleArticle(
  article: Pick<
    Article,
    | "category"
    | "riskLevel"
    | "reviewer"
    | "reviewedAt"
    | "reviewedContentHash"
    | "reviewedVersionMatches"
  >,
): boolean {
  return !isSensitiveArticle(article) || hasVerifiedHumanReview(article);
}
