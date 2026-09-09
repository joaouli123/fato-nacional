import type { LookupAddress } from "node:dns";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const OFFICIAL_HOSTS = [
  // Governo/instituições BR
  "bcb.gov.br",
  "caixa.gov.br",
  "ibge.gov.br",
  "planalto.gov.br",
  "senado.leg.br",
  "camara.leg.br",
  "stf.jus.br",
  "stj.jus.br",
  "susep.gov.br",
  "tesouro.gov.br",
  "gov.br",
  // Fontes primárias corporativas para tecnologia/IA/marketing — o anúncio oficial
  // do fabricante É a fonte primária do fato. Curadoria: apenas domínios corporativos,
  // nunca os que hospedam conteúdo de usuário (sites.google, github.io etc.).
  "openai.com",
  "anthropic.com",
  "blog.google",
  "ai.google",
  "developers.google.com",
  "support.google.com",
  "microsoft.com",
  "meta.com",
  "about.fb.com",
  "apple.com",
  "nvidia.com",
  "x.ai",
  "mistral.ai",
  "deepmind.google",
  "huggingface.co",
];

const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([300, 301, 302, 303, 307, 308]);
const BLOCKED_HOST_SUFFIXES = [".internal", ".lan", ".local", ".localhost"] as const;

export type ExtractedLink = {
  href: string;
  text: string;
};

export type CheckedExternalSource = ExtractedLink & {
  valid: boolean;
  status: number | null;
  finalUrl: string;
  official: boolean;
  specificPage: boolean;
  authorityKey: string;
  error?: string;
};

export type ArticleLinkAudit = {
  internal: ExtractedLink[];
  external: CheckedExternalSource[];
  brokenInternal: ExtractedLink[];
  invalidExternal: CheckedExternalSource[];
  officialSourceUrls: string[];
  criticalIssues: string[];
};

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function extractArticleLinks(html: string): { internal: ExtractedLink[]; external: ExtractedLink[] } {
  const internal: ExtractedLink[] = [];
  const external: ExtractedLink[] = [];
  const anchor = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchor.exec(html)) !== null) {
    const link = { href: match[1].trim(), text: stripTags(match[2]) };
    if (link.href.startsWith("/artigos/")) internal.push(link);
    else if (
      /^https?:\/\//i.test(link.href) ||
      link.href.startsWith("//") ||
      (/^[a-z][a-z0-9+.-]*:/i.test(link.href) && !/^(?:mailto|tel):/i.test(link.href))
    ) external.push(link);
  }
  return { internal, external };
}

function hostMatches(hostname: string, candidate: string): boolean {
  return hostname === candidate || hostname.endsWith(`.${candidate}`);
}

export function isOfficialSourceUrl(input: string | URL): boolean {
  try {
    const url = typeof input === "string" ? new URL(input) : input;
    const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
    return OFFICIAL_HOSTS.some((candidate) => hostMatches(host, candidate));
  } catch {
    return false;
  }
}

function isSpecificPage(url: URL): boolean {
  const path = url.pathname.replace(/\/+$/, "");
  return path.length > 1 && !/^\/(?:pt-br|en|home|inicio)?$/i.test(path);
}

function authorityKey(url: URL): string {
  const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  if (host === "gov.br") return `${host}/${url.pathname.split("/").filter(Boolean)[0] || "root"}`;
  return host;
}

function parseIpv4(address: string): number[] | null {
  const parts = address.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map((part) => Number(part));
  if (octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return octets;
}

function isBlockedIpv4(address: string): boolean {
  const octets = parseIpv4(address);
  if (!octets) return true;
  const [a, b, c] = octets;

  return (
    a === 0 || // current network / unspecified
    a === 10 ||
    a === 127 ||
    a >= 224 || // multicast and reserved
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local and cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) || // protocol assignments + TEST-NET-1
    (a === 192 && b === 88 && c === 99) || // deprecated 6to4 relay
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    (a === 198 && b === 51 && c === 100) || // TEST-NET-2
    (a === 203 && b === 0 && c === 113) // TEST-NET-3
  );
}

function ipv6ToBigInt(input: string): bigint | null {
  let address = input.toLowerCase().replace(/^\[|\]$/g, "");
  if (address.includes("%")) return null;

  if (address.includes(".")) {
    const separator = address.lastIndexOf(":");
    if (separator < 0) return null;
    const ipv4 = parseIpv4(address.slice(separator + 1));
    if (!ipv4) return null;
    const high = ((ipv4[0] << 8) | ipv4[1]).toString(16);
    const low = ((ipv4[2] << 8) | ipv4[3]).toString(16);
    address = `${address.slice(0, separator)}:${high}:${low}`;
  }

  const halves = address.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 1)) return null;
  const groups = [...left, ...Array.from({ length: Math.max(0, missing) }, () => "0"), ...right];
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) return null;

  return groups.reduce((value, group) => (value << 16n) | BigInt(`0x${group}`), 0n);
}

function ipv6InCidr(value: bigint, network: string, prefixLength: number): boolean {
  const networkValue = ipv6ToBigInt(network);
  if (networkValue === null) return true;
  const shift = BigInt(128 - prefixLength);
  return value >> shift === networkValue >> shift;
}

function isBlockedIpv6(address: string): boolean {
  const value = ipv6ToBigInt(address);
  if (value === null) return true;
  if (value === 0n || value === 1n) return true; // unspecified / loopback

  // IPv4-mapped IPv6 must inherit the embedded IPv4 policy.
  if (value >> 32n === 0xffffn) {
    const ipv4 = Number(value & 0xffff_ffffn);
    return isBlockedIpv4([
      (ipv4 >>> 24) & 255,
      (ipv4 >>> 16) & 255,
      (ipv4 >>> 8) & 255,
      ipv4 & 255,
    ].join("."));
  }

  // Public global-unicast IPv6 is currently allocated from 2000::/3. Reject
  // link-local, ULA, multicast, documentation and transition mechanisms.
  if (!ipv6InCidr(value, "2000::", 3)) return true;
  return (
    ipv6InCidr(value, "2001::", 23) || // IETF protocol/special assignments
    ipv6InCidr(value, "2001:db8::", 32) || // documentation
    ipv6InCidr(value, "2002::", 16) || // 6to4
    ipv6InCidr(value, "3fff::", 20) // documentation
  );
}

function isBlockedIp(address: string): boolean {
  const family = isIP(address.replace(/^\[|\]$/g, ""));
  if (family === 4) return isBlockedIpv4(address);
  if (family === 6) return isBlockedIpv6(address);
  return true;
}

function normalizedHostname(url: URL): string {
  return url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
}

async function validateOutboundUrl(input: string | URL): Promise<URL> {
  let url: URL;
  try {
    url = typeof input === "string" ? new URL(input) : new URL(input.toString());
  } catch {
    throw new Error("URL inválida");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Protocolo não permitido; use HTTP ou HTTPS");
  }
  if (url.username || url.password) {
    throw new Error("Credenciais na URL não são permitidas");
  }
  const allowedPort = url.protocol === "https:" ? "443" : "80";
  if (url.port && url.port !== allowedPort) {
    throw new Error(`Porta não permitida: ${url.port}`);
  }

  const hostname = normalizedHostname(url);
  if (
    !hostname ||
    hostname === "localhost" ||
    BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  ) {
    throw new Error("Host local ou reservado não permitido");
  }

  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) throw new Error("Endereço IP privado ou reservado não permitido");
    return url;
  }

  let addresses: LookupAddress[];
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "falha de DNS";
    throw new Error(`Falha ao resolver DNS: ${detail}`);
  }
  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw new Error("DNS não retornou endereços");
  }
  const blocked = addresses.find((entry) => isBlockedIp(entry.address));
  if (blocked) {
    throw new Error("DNS resolveu para endereço privado ou reservado");
  }
  return url;
}

type SafeResponse = {
  response: Response;
  finalUrl: URL;
};

async function requestUrl(input: string, method: "HEAD" | "GET"): Promise<SafeResponse> {
  let current = await validateOutboundUrl(input);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    // Re-resolve immediately before every request, including every redirect.
    current = await validateOutboundUrl(current);
    const response = await fetch(current, {
      method,
      redirect: "manual",
      headers: method === "GET"
        ? { Range: "bytes=0-2048", "User-Agent": "FatoNacionalSourceValidator/1.0" }
        : { "User-Agent": "FatoNacionalSourceValidator/1.0" },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });

    // With redirect:"manual", response.url should be the requested URL. Validate
    // it anyway to fail closed if a runtime reports a different destination.
    if (response.url) await validateOutboundUrl(response.url);

    const location = response.headers.get("location");
    if (!REDIRECT_STATUSES.has(response.status) || !location) {
      return { response, finalUrl: current };
    }
    if (redirectCount === MAX_REDIRECTS) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error(`Redirecionamentos demais (máximo ${MAX_REDIRECTS})`);
    }

    let next: URL;
    try {
      next = new URL(location, current);
    } catch {
      await response.body?.cancel().catch(() => undefined);
      throw new Error("Redirecionamento com URL inválida");
    }
    await response.body?.cancel().catch(() => undefined);
    // Validate before following so a public URL cannot redirect to metadata,
    // localhost, RFC1918 space or a hostname whose DNS contains a private answer.
    current = await validateOutboundUrl(next);
  }

  throw new Error("Falha inesperada ao seguir redirecionamentos");
}

export async function checkExternalSource(link: ExtractedLink): Promise<CheckedExternalSource> {
  let response: Response | null = null;
  let finalUrl: URL | null = null;
  try {
    let result = await requestUrl(link.href, "HEAD");
    response = result.response;
    finalUrl = result.finalUrl;
    if ([403, 405, 429].includes(response.status)) {
      await response.body?.cancel().catch(() => undefined);
      result = await requestUrl(link.href, "GET");
      response = result.response;
      finalUrl = result.finalUrl;
    }
    const official = isOfficialSourceUrl(finalUrl);
    // Servidores públicos (caixa.gov.br etc.) frequentemente respondem 5xx/403/429
    // a robôs. Erro de SERVIDOR em domínio oficial é tolerado (a URL existe e foi
    // verificada na apuração); 404/410 continuam reprovando — significam URL errada.
    const softTolerated = official && (response.status >= 500 || [403, 429].includes(response.status));
    const checked: CheckedExternalSource = {
      ...link,
      valid: response.ok || softTolerated,
      status: response.status,
      finalUrl: finalUrl.toString(),
      official,
      specificPage: isSpecificPage(finalUrl),
      authorityKey: authorityKey(finalUrl),
      ...(!response.ok
        ? { error: `HTTP ${response.status}${softTolerated ? " (tolerado: domínio oficial instável)" : ""}` }
        : {}),
    };
    await response.body?.cancel().catch(() => undefined);
    return checked;
  } catch (error) {
    let parsed: URL | null = null;
    try {
      parsed = new URL(link.href);
    } catch {
      // Keep the structured result even for malformed input.
    }
    const message = error instanceof Error ? error.message : "network error";
    const official = parsed ? isOfficialSourceUrl(parsed) : false;
    // Tolera APENAS instabilidade transitória (loop de redirect anti-robô, timeout)
    // em domínio oficial. Falha de DNS/host inexistente continua reprovando —
    // pode ser subdomínio inventado.
    const transient = /Redirecionamentos demais|timeout|abort|fetch failed/i.test(message);
    const softTolerated = official && transient;
    return {
      ...link,
      valid: softTolerated,
      status: response?.status ?? null,
      finalUrl: finalUrl?.toString() ?? link.href,
      official,
      specificPage: parsed ? isSpecificPage(parsed) : false,
      authorityKey: parsed ? authorityKey(parsed) : "",
      error: `${message}${softTolerated ? " (tolerado: domínio oficial instável)" : ""}`,
    };
  }
}

export async function auditArticleLinks(input: {
  html: string;
  knownArticleSlugs: Iterable<string>;
  ymyl: boolean;
}): Promise<ArticleLinkAudit> {
  const extracted = extractArticleLinks(input.html);
  const known = new Set(input.knownArticleSlugs);
  const brokenInternal = extracted.internal.filter((link) => {
    const slug = link.href.slice("/artigos/".length).split(/[?#]/, 1)[0];
    return !known.has(slug);
  });
  const external = await Promise.all(extracted.external.map(checkExternalSource));
  const invalidExternal = external.filter((source) => !source.valid);
  const official = external.filter((source) => source.valid && source.official && source.specificPage);
  const independentAuthorities = new Set(official.map((source) => source.authorityKey));
  const criticalIssues: string[] = [];

  if (brokenInternal.length) {
    criticalIssues.push(`Links internos quebrados: ${brokenInternal.map((link) => link.href).join(", ")}`);
  }
  if (invalidExternal.length) {
    criticalIssues.push(`Fontes inacessíveis: ${invalidExternal.map((link) => `${link.href} (${link.error || link.status})`).join(", ")}`);
  }
  const minimumAuthorities = input.ymyl ? 3 : 1;
  if (independentAuthorities.size < minimumAuthorities) {
    criticalIssues.push(`Fontes oficiais independentes insuficientes: ${independentAuthorities.size}/${minimumAuthorities}`);
  }

  return {
    internal: extracted.internal,
    external,
    brokenInternal,
    invalidExternal,
    officialSourceUrls: official.map((source) => source.finalUrl),
    criticalIssues,
  };
}
