import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const lookupMock = vi.hoisted(() => vi.fn());

vi.mock("node:dns/promises", () => ({
  lookup: lookupMock,
}));

import {
  auditArticleLinks,
  checkExternalSource,
  isOfficialSourceUrl,
} from "./source-validation";

const PUBLIC_DNS = [{ address: "93.184.216.34", family: 4 }];

describe("proteção SSRF da validação de fontes", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    lookupMock.mockReset();
    lookupMock.mockResolvedValue(PUBLIC_DNS);
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    "http://localhost/admin",
    "http://sub.localhost/admin",
    "http://localhost./admin",
    "http://127.0.0.1/admin",
    "http://127.1/admin",
    "http://2130706433/admin",
    "http://0x7f000001/admin",
    "http://10.0.0.8/admin",
    "http://169.254.169.254/latest/meta-data",
    "http://192.168.1.10/admin",
    "http://192.0.2.10/documentacao",
    "http://[::]/admin",
    "http://[::1]/admin",
    "http://[fc00::1]/admin",
    "http://[2001:db8::1]/documentacao",
    "http://[3fff::1]/documentacao",
    "http://[::ffff:127.0.0.1]/admin",
  ])("recusa host local, privado ou reservado: %s", async (href) => {
    const result = await checkExternalSource({ href, text: "Fonte" });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/local|privado|reservado/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    "https://usuario:senha@www.gov.br/fazenda/noticia",
    "https://www.gov.br:8443/fazenda/noticia",
    "ftp://www.gov.br/fazenda/noticia",
    "//www.gov.br/fazenda/noticia",
    "https://[",
  ])("recusa URL inválida ou com autoridade insegura: %s", async (href) => {
    const result = await checkExternalSource({ href, text: "Fonte" });

    expect(result.valid).toBe(false);
    expect(result.status).toBeNull();
    expect(result.error).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("bloqueia hostname público quando qualquer resposta DNS é privada", async () => {
    lookupMock.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "192.168.0.20", family: 4 },
    ]);

    const result = await checkExternalSource({ href: "https://fontes.example/relatorio", text: "Relatório" });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/DNS.*privado|privado.*DNS/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("valida cada redirecionamento antes de segui-lo", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, {
      status: 302,
      headers: { Location: "http://169.254.169.254/latest/meta-data" },
    }));

    const result = await checkExternalSource({
      href: "https://www.gov.br/fazenda/noticia",
      text: "Notícia",
    });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/privado|reservado/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ redirect: "manual" }));
  });

  it("segue uma cadeia pública curta e registra a URL final segura", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, {
        status: 302,
        headers: { Location: "/fazenda/pt-br/noticias/pagina-final" },
      }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    const result = await checkExternalSource({
      href: "https://www.gov.br/fazenda/noticia-antiga",
      text: "Notícia",
    });

    expect(result).toEqual(expect.objectContaining({
      valid: true,
      status: 200,
      official: true,
      specificPage: true,
      finalUrl: "https://www.gov.br/fazenda/pt-br/noticias/pagina-final",
    }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("mantém o fallback GET protegido quando HEAD não é aceito", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 405 }))
      .mockResolvedValueOnce(new Response("conteúdo", { status: 200 }));

    const result = await checkExternalSource({
      href: "https://www.gov.br/fazenda/pt-br/noticias/fonte",
      text: "Fonte",
    });

    expect(result.valid).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ method: "HEAD" }));
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({ method: "GET", redirect: "manual" }));
  });

  it("preserva auditArticleLinks com fonte segura mockada", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    const audit = await auditArticleLinks({
      html: `
        <a href="/artigos/alvo-publicado">Leia também</a>
        <a href="https://www.gov.br/fazenda/pt-br/noticias/fonte-oficial">Fonte oficial</a>`,
      knownArticleSlugs: new Set(["alvo-publicado"]),
      ymyl: false,
    });

    expect(audit.brokenInternal).toEqual([]);
    expect(audit.invalidExternal).toEqual([]);
    expect(audit.officialSourceUrls).toEqual([
      "https://www.gov.br/fazenda/pt-br/noticias/fonte-oficial",
    ]);
    expect(audit.criticalIssues).toEqual([]);
  });

  it("inclui esquemas externos não permitidos entre as fontes inválidas", async () => {
    const audit = await auditArticleLinks({
      html: `<a href="ftp://arquivos.example/relatorio.csv">Relatório FTP</a>`,
      knownArticleSlugs: [],
      ymyl: false,
    });

    expect(audit.external).toHaveLength(1);
    expect(audit.invalidExternal).toEqual([
      expect.objectContaining({ href: "ftp://arquivos.example/relatorio.csv", valid: false }),
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("isOfficialSourceUrl falha fechado para entradas malformadas", () => {
    expect(isOfficialSourceUrl("https://[")).toBe(false);
    expect(isOfficialSourceUrl("https://gov.br.evil.example/noticia")).toBe(false);
    expect(isOfficialSourceUrl("https://www.gov.br/fazenda/noticia")).toBe(true);
  });
});
