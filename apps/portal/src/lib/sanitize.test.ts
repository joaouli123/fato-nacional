import { describe, expect, it } from "vitest";
import { sanitizeArticleHtml } from "@/lib/sanitize";

describe("sanitizeArticleHtml links", () => {
  it("keeps ordinary internal links followable", () => {
    const html = sanitizeArticleHtml(
      '<a href="/artigos/exemplo" rel="nofollow noopener noreferrer">Interno</a>',
    );

    expect(html).toContain('href="/artigos/exemplo"');
    expect(html).not.toContain("rel=");
    expect(html).not.toContain("nofollow");
  });

  it("keeps ordinary external citations followable", () => {
    const html = sanitizeArticleHtml('<a href="https://example.com/fonte">Fonte</a>');

    expect(html).toContain('href="https://example.com/fonte"');
    expect(html).not.toContain("nofollow");
  });

  it("protects links opened in a new tab", () => {
    const html = sanitizeArticleHtml(
      '<a href="https://example.com/fonte" target="_blank">Fonte</a>',
    );

    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("preserves explicit relationship markers on external links", () => {
    const html = sanitizeArticleHtml(
      '<a href="https://example.com/parceiro" rel="sponsored nofollow">Parceiro</a>',
    );

    expect(html).toContain('rel="nofollow sponsored"');
  });
});
