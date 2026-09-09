import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { siteConfig } from "@/lib/site";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(date));
}

export function absoluteUrl(path = "") {
  const base = siteConfig.url;
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Normalize an untrusted `?page=` value to the first valid positive page. */
export function parsePageNumber(value?: string): number {
  const parsed = Number.parseInt(value || "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/** Build a self-referencing canonical for a paginated listing. */
export function paginatedUrl(path: string, page: number): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return absoluteUrl(page <= 1 ? normalizedPath : `${normalizedPath}?page=${page}`);
}

/** Return a normalized public HTTP(S) URL, rejecting script/data/invalid URLs. */
export function safeHttpUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Builds a table of contents from an article's HTML body by injecting a stable
 * `id` into every <h2> and returning the matching {id,label} list.
 * Returns the (possibly) modified html plus the toc entries.
 */
export function buildArticleToc(html: string): {
  html: string;
  toc: Array<{ id: string; label: string }>;
} {
  if (!html) return { html: "", toc: [] };
  const toc: Array<{ id: string; label: string }> = [];
  const used = new Set<string>();
  let index = 0;
  const out = html.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (_match, attrs: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    if (!text) return `<h2${attrs}>${inner}</h2>`;
    index += 1;
    const base = slugify(text) || `secao-${index}`;
    let id = base;
    let n = 2;
    while (used.has(id)) id = `${base}-${n++}`;
    used.add(id);
    toc.push({ id, label: `${index}. ${text}` });
    const attrsNoId = attrs.replace(/\s+id="[^"]*"/i, "");
    return `<h2${attrsNoId} id="${id}">${inner}</h2>`;
  });
  return { html: out, toc };
}

export function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
