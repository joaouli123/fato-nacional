import { describe, expect, it } from "vitest";
import {
  slugify,
  buildArticleToc,
  escapeXml,
  absoluteUrl,
  paginatedUrl,
  parsePageNumber,
  safeHttpUrl,
} from "@/lib/utils";

describe("slugify", () => {
  it("lowercases, strips accents and non-alphanumerics", () => {
    expect(slugify("Pix Automático: como funciona!")).toBe("pix-automatico-como-funciona");
    expect(slugify("Tecnologia e IA")).toBe("tecnologia-e-ia");
    expect(slugify("  Inflação   de Alimentos  ")).toBe("inflacao-de-alimentos");
  });
  it("collapses repeated separators and trims edges", () => {
    expect(slugify("--Olá--Mundo--")).toBe("ola-mundo");
  });
});

describe("buildArticleToc", () => {
  it("injects ids into h2 and returns numbered toc entries", () => {
    const { html, toc } = buildArticleToc("<h2>O que é</h2><p>x</p><h2>Como funciona</h2>");
    expect(toc).toHaveLength(2);
    expect(toc[0]).toEqual({ id: "o-que-e", label: "1. O que é" });
    expect(toc[1]).toEqual({ id: "como-funciona", label: "2. Como funciona" });
    expect(html).toContain('<h2 id="o-que-e">');
    expect(html).toContain('<h2 id="como-funciona">');
  });
  it("deduplicates ids for repeated headings", () => {
    const { toc } = buildArticleToc("<h2>FAQ</h2><h2>FAQ</h2>");
    expect(toc[0].id).toBe("faq");
    expect(toc[1].id).toBe("faq-2");
  });
  it("returns empty toc for content without h2", () => {
    expect(buildArticleToc("<p>só texto</p>").toc).toHaveLength(0);
    expect(buildArticleToc("").toc).toHaveLength(0);
  });
});

describe("escapeXml", () => {
  it("escapes the five xml entities", () => {
    expect(escapeXml(`a & b < c > d " e ' f`)).toBe("a &amp; b &lt; c &gt; d &quot; e &apos; f");
  });
});

describe("absoluteUrl", () => {
  it("joins base and path without double slashes", () => {
    expect(absoluteUrl("/artigos/x")).toMatch(/\/artigos\/x$/);
    expect(absoluteUrl("artigos/x")).toMatch(/\/artigos\/x$/);
  });
});

describe("pagination URL helpers", () => {
  it("normalizes invalid page values to page one", () => {
    expect(parsePageNumber()).toBe(1);
    expect(parsePageNumber("0")).toBe(1);
    expect(parsePageNumber("invalid")).toBe(1);
    expect(parsePageNumber("3")).toBe(3);
  });

  it("uses a clean canonical for page one and a self canonical for later pages", () => {
    expect(paginatedUrl("/categoria/brasil", 1)).toMatch(/\/categoria\/brasil$/);
    expect(paginatedUrl("/categoria/brasil", 2)).toMatch(/\/categoria\/brasil\?page=2$/);
    expect(paginatedUrl("/", 4)).toMatch(/\/\?page=4$/);
  });
});

describe("safeHttpUrl", () => {
  it("allows normalized HTTP(S) URLs and rejects unsafe schemes", () => {
    expect(safeHttpUrl("https://images.example/foto/1")).toBe(
      "https://images.example/foto/1",
    );
    expect(safeHttpUrl("http://images.example/foto")).toBe("http://images.example/foto");
    expect(safeHttpUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeHttpUrl("data:text/html,unsafe")).toBeUndefined();
    expect(safeHttpUrl("not a url")).toBeUndefined();
  });
});
