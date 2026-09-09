import sanitizeHtml from "sanitize-html";
import { siteConfig } from "@/lib/site";

/**
 * Server-only allowlist sanitizer for article body HTML (AI/staff-authored,
 * therefore untrusted). Strips <script>/<iframe>/<style>, on* handlers and
 * javascript:/unknown-scheme URLs. Keep this OUT of client bundles — only
 * import it from server components / route handlers.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr", "h2", "h3", "h4", "h5", "h6",
    "blockquote", "ul", "ol", "li", "a", "strong", "b", "em", "i", "u", "s",
    "span", "figure", "figcaption", "img", "table", "thead", "tbody", "tfoot",
    "tr", "th", "td", "caption", "code", "pre", "sup", "sub", "mark", "small",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
    "*": ["id", "class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  transformTags: {
    a: (tagName, attribs) => {
      const nextAttribs = { ...attribs };
      const requestedRel = new Set(
        (attribs.rel || "")
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean),
      );
      const isBlankTarget = attribs.target?.toLowerCase() === "_blank";
      const isExternal = isExternalHttpLink(attribs.href);
      const rel = new Set<string>();

      // Keep editorial relationship markers only where they have meaning.
      // Ordinary citations remain follow links; paid/UGC/untrusted links can
      // still opt in to the corresponding marker in the source HTML.
      if (isExternal) {
        for (const token of ["nofollow", "sponsored", "ugc"]) {
          if (requestedRel.has(token)) rel.add(token);
        }
      }

      // target=_blank always gets reverse-tabnabbing protection, regardless
      // of whether the destination is internal or external.
      if (isBlankTarget) {
        rel.add("noopener");
        rel.add("noreferrer");
      }

      if (rel.size > 0) nextAttribs.rel = [...rel].join(" ");
      else delete nextAttribs.rel;

      return { tagName, attribs: nextAttribs };
    },
  },
};

const siteOrigin = new URL(siteConfig.url).origin;

function isExternalHttpLink(href?: string): boolean {
  if (!href || !/^https?:\/\//i.test(href)) return false;
  try {
    return new URL(href).origin !== siteOrigin;
  } catch {
    return false;
  }
}

export function sanitizeArticleHtml(html: string): string {
  if (!html) return "";
  return sanitizeHtml(html, OPTIONS);
}
