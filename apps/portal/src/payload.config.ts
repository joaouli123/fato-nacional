import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { seoPlugin } from "@payloadcms/plugin-seo";
import { s3Storage } from "@payloadcms/storage-s3";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import sharp from "sharp";
import { buildConfig, type Access, type CollectionConfig, type Where } from "payload";
import { articlePurgeUrls, purgeCloudflare } from "./lib/cache/purge";

// Resolve a relationship value (id or populated doc) to its `slug`, via the API when needed.
async function resolveSlug(
  payload: { findByID: (a: { collection: string; id: string | number; depth?: number }) => Promise<unknown> },
  collection: string,
  value: unknown,
): Promise<string | undefined> {
  if (!value) return undefined;
  if (typeof value === "object" && value !== null && "slug" in value) {
    return (value as { slug?: string }).slug;
  }
  try {
    const doc = (await payload.findByID({ collection, id: value as string | number, depth: 0 })) as {
      slug?: string;
    };
    return doc?.slug;
  } catch {
    return undefined;
  }
}

// After an article is published/updated/deleted, purge its edge cache so changes
// go live immediately (no-op until CLOUDFLARE_ZONE_ID + CLOUDFLARE_PURGE_TOKEN are set).
async function purgeArticle(doc: Record<string, unknown>, req: { payload?: unknown }): Promise<void> {
  const slug = doc?.slug as string | undefined;
  if (!slug) return;
  const payload = req?.payload as Parameters<typeof resolveSlug>[0] | undefined;
  let categorySlug: string | undefined;
  let authorSlug: string | undefined;
  if (payload) {
    categorySlug = await resolveSlug(payload, "categories", doc.primaryCategory);
    authorSlug = await resolveSlug(payload, "authors", doc.author);
  }
  try {
    await purgeCloudflare(articlePurgeUrls(slug, categorySlug, authorSlug));
  } catch {
    /* purge failures must never block editorial actions */
  }
}

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const readOnlyPublic = () => true;

// --- RBAC helpers (role-based access control) ---
const userRole = (req: { user?: unknown }) => (req.user as { role?: string } | null)?.role;

const isAdmin: Access = ({ req }) => userRole(req) === "admin";

const isStaff: Access = ({ req }) => {
  const role = userRole(req);
  return Boolean(role) && ["admin", "editor", "reviewer", "author"].includes(role as string);
};

const adminOrSelf: Access = ({ req }) => {
  const user = req.user as { role?: string; id?: string | number } | null;
  if (user?.role === "admin") return true;
  return user?.id ? { id: { equals: user.id } } : false;
};

// Public read; only staff can create/update; only admins can delete.
const staffWrite = { create: isStaff, update: isStaff, delete: isAdmin } as const;

function contentHash(content: unknown): string {
  return createHash("sha256").update(typeof content === "string" ? content : "").digest("hex");
}

/**
 * Public article reads are publication-only. Sensitive records additionally
 * require the immutable review receipt written by the beforeChange hook below.
 */
const articleRead: Access = async ({ req }) => {
  const role = userRole(req);
  if (role && ["admin", "editor", "reviewer", "author"].includes(role)) return true;

  const financeCategory = await req.payload.find({
    collection: "categories",
    where: { slug: { equals: "financas" } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const financeId = financeCategory.docs[0]?.id;
  if (!financeId) return false;

  const hasReviewReceipt: Where = {
    and: [
      { reviewer: { exists: true } },
      { reviewedAt: { exists: true } },
      { reviewedContentHash: { exists: true } },
    ],
  };
  const publicWhere: Where = {
    and: [
      { _status: { equals: "published" } },
      { status: { equals: "published" } },
      {
        or: [
          {
            and: [
              { riskLevel: { not_equals: "high" } },
              { primaryCategory: { not_equals: financeId } },
            ],
          },
          hasReviewReceipt,
        ],
      },
    ],
  };
  return publicWhere;
};

// Cloudflare R2 (S3-compatible) media storage — activates only when all env vars are present.
const r2 = {
  bucket: process.env.R2_BUCKET,
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
};
const r2Enabled = Boolean(r2.bucket && r2.accountId && r2.accessKeyId && r2.secretAccessKey);

const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  access: { read: adminOrSelf, create: isAdmin, update: adminOrSelf, delete: isAdmin },
  admin: { useAsTitle: "email", group: "Administracao" },
  fields: [
    { name: "name", type: "text", required: true },
    {
      name: "role",
      type: "select",
      defaultValue: "editor",
      required: true,
      options: [
        { label: "Editor", value: "editor" },
        { label: "Revisor", value: "reviewer" },
        { label: "Administrador", value: "admin" },
      ],
    },
  ],
};

const Media: CollectionConfig = {
  slug: "media",
  admin: { useAsTitle: "alt", group: "Conteudo" },
  access: { read: readOnlyPublic, ...staffWrite },
  upload: {
    imageSizes: [
      { name: "square", width: 1200, height: 1200, position: "centre" },
      { name: "wide", width: 1600, height: 900, position: "centre" },
    ],
    mimeTypes: ["image/webp", "image/avif", "image/jpeg", "image/png"],
  },
  fields: [
    { name: "alt", type: "text", required: true },
    { name: "caption", type: "textarea" },
    { name: "credit", type: "text" },
    { name: "disclosure", type: "text", defaultValue: "Imagem ilustrativa." },
  ],
};

const Categories: CollectionConfig = {
  slug: "categories",
  admin: { useAsTitle: "name", group: "Taxonomia" },
  access: { read: readOnlyPublic, ...staffWrite },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true },
    { name: "description", type: "textarea" },
    { name: "color", type: "text", defaultValue: "#0f766e" },
  ],
};

const Tags: CollectionConfig = {
  slug: "tags",
  admin: { useAsTitle: "name", group: "Taxonomia" },
  access: { read: readOnlyPublic, ...staffWrite },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true },
  ],
};

const Authors: CollectionConfig = {
  slug: "authors",
  admin: { useAsTitle: "name", group: "Redacao" },
  access: { read: readOnlyPublic, ...staffWrite },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true },
    { name: "role", type: "text", required: true },
    { name: "bio", type: "textarea" },
    {
      name: "disclosure",
      type: "textarea",
      defaultValue: "Conteúdo produzido com apoio de IA; revisão humana é informada quando efetivamente registrada.",
    },
  ],
};

const Sources: CollectionConfig = {
  slug: "sources",
  admin: { useAsTitle: "name", group: "Redacao" },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "url", type: "text", required: true, unique: true },
    { name: "finalUrl", type: "text" },
    { name: "sourceType", type: "text", required: true },
    { name: "reliability", type: "number", min: 0, max: 1, defaultValue: 0.8 },
    { name: "httpStatus", type: "number", min: 100, max: 599 },
    { name: "publishedAt", type: "date" },
    { name: "retrievedAt", type: "date" },
    { name: "publisher", type: "text" },
  ],
};

const Topics: CollectionConfig = {
  slug: "topics",
  admin: { useAsTitle: "title", group: "Planejamento" },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true },
    { name: "summary", type: "textarea", required: true },
    { name: "primaryKeyword", type: "text", required: true },
    { name: "category", type: "relationship", relationTo: "categories", required: true },
    {
      name: "riskLevel",
      type: "select",
      defaultValue: "low",
      options: [
        { label: "Baixo", value: "low" },
        { label: "Medio", value: "medium" },
        { label: "Alto", value: "high" },
      ],
    },
    { name: "score", type: "json" },
    { name: "recommendedAction", type: "text" },
  ],
};

const Articles: CollectionConfig = {
  slug: "articles",
  admin: {
    useAsTitle: "headline",
    defaultColumns: ["headline", "status", "riskLevel"],
    group: "Conteudo",
  },
  access: { read: articleRead, ...staffWrite },
  versions: { drafts: true },
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        const merged = { ...(originalDoc || {}), ...(data || {}) } as Record<string, unknown>;
        const categorySlug = await resolveSlug(req.payload, "categories", merged.primaryCategory);
        const sensitive = merged.riskLevel === "high" || categorySlug === "financas";
        if (!sensitive) return data;

        const html = typeof merged.contentHtml === "string" ? merged.contentHtml : "";
        const publishing = merged.status === "published" || merged._status === "published";
        if (publishing) {
          const user = req.user as { id?: string | number; role?: string } | null;
          if (!user?.id || !["admin", "reviewer"].includes(user.role || "")) {
            throw new Error("Conteúdo sensível exige aprovação explícita de um revisor ou administrador autenticado.");
          }
          return {
            ...data,
            reviewer: user.id,
            reviewedAt: new Date().toISOString(),
            reviewedContentHash: contentHash(html),
          };
        }

        // Qualquer nova edição invalida um recibo anterior até nova aprovação.
        if (data?.contentHtml !== undefined && data.contentHtml !== originalDoc?.contentHtml) {
          return { ...data, reviewer: null, reviewedAt: null, reviewedContentHash: null };
        }
        return data;
      },
    ],
    afterChange: [
      async ({ doc, req }) => {
        if (doc?.status === "published") await purgeArticle(doc, req);
        return doc;
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        await purgeArticle(doc, req);
        return doc;
      },
    ],
  },
  fields: [
    { name: "headline", type: "text", required: true },
    { name: "seoTitle", type: "text", required: true },
    { name: "socialTitle", type: "text", required: true },
    { name: "description", type: "textarea", required: true },
    { name: "slug", type: "text", required: true, unique: true },
    { name: "primaryKeyword", type: "text", required: true },
    { name: "primaryCategory", type: "relationship", relationTo: "categories", required: true },
    { name: "tags", type: "relationship", relationTo: "tags", hasMany: true },
    { name: "summary", type: "textarea", required: true },
    { name: "readingTime", type: "text" },
    { name: "content", type: "richText", required: true },
    { name: "contentHtml", type: "textarea" },
    { name: "heroImage", type: "relationship", relationTo: "media" },
    { name: "imagePath", type: "text" },
    { name: "imageAlt", type: "text" },
    { name: "imageCaption", type: "textarea" },
    { name: "imageCredit", type: "text" },
    { name: "imageProvider", type: "text" },
    { name: "imageLicense", type: "text" },
    { name: "imageSourceUrl", type: "text" },
    { name: "sources", type: "relationship", relationTo: "sources", hasMany: true },
    { name: "author", type: "relationship", relationTo: "authors", required: true },
    { name: "reviewer", type: "relationship", relationTo: "users" },
    { name: "reviewedAt", type: "date" },
    { name: "reviewedContentHash", type: "text" },
    { name: "publishedAt", type: "date" },
    { name: "editorialUpdatedAt", type: "date" },
    { name: "nextReviewAt", type: "date" },
    {
      name: "contentType",
      type: "select",
      defaultValue: "article",
      options: [
        { label: "Noticia", value: "news" },
        { label: "Artigo", value: "article" },
        { label: "Guia", value: "guide" },
        { label: "Servico", value: "service" },
      ],
    },
    { name: "editorialRunId", type: "text", index: true },
    { name: "clusterId", type: "text", index: true },
    { name: "pillarId", type: "text", index: true },
    { name: "primaryIntent", type: "textarea" },
    { name: "secondaryIntents", type: "json" },
    { name: "entities", type: "json" },
    { name: "updateTriggers", type: "json" },
    {
      name: "riskLevel",
      type: "select",
      defaultValue: "low",
      options: [
        { label: "Baixo", value: "low" },
        { label: "Medio", value: "medium" },
        { label: "Alto", value: "high" },
      ],
    },
    {
      name: "status",
      type: "select",
      defaultValue: "discovered",
      admin: { description: "Estado no fluxo editorial (descoberta -> publicacao)." },
      options: [
        { label: "Descoberto", value: "discovered" },
        { label: "Pontuado", value: "scored" },
        { label: "Aprovado", value: "approved" },
        { label: "Pesquisando", value: "researching" },
        { label: "Briefing pronto", value: "brief_ready" },
        { label: "Redacao", value: "writing" },
        { label: "Checagem de fatos", value: "fact_checking" },
        { label: "Edicao", value: "editing" },
        { label: "Revisao SEO", value: "seo_review" },
        { label: "Geracao de imagem", value: "image_generation" },
        { label: "Revisao humana", value: "human_review" },
        { label: "Agendado", value: "scheduled" },
        { label: "Publicado", value: "published" },
        { label: "Atualizar", value: "needs_update" },
        { label: "Rejeitado", value: "rejected" },
        { label: "Arquivado", value: "archived" },
      ],
    },
    { name: "scores", type: "json" },
    { name: "qualityReport", type: "json" },
  ],
};

const AgentRuns: CollectionConfig = {
  slug: "agent-runs",
  admin: { useAsTitle: "agent", group: "Automacao" },
  fields: [
    { name: "agent", type: "text", required: true },
    { name: "provider", type: "text" },
    { name: "model", type: "text" },
    { name: "status", type: "text", required: true },
    { name: "durationMs", type: "number", defaultValue: 0 },
    { name: "costUsd", type: "number", defaultValue: 0 },
    { name: "input", type: "json" },
    { name: "output", type: "json" },
    { name: "error", type: "textarea" },
  ],
};

const EditorialRuns: CollectionConfig = {
  slug: "editorial-runs",
  admin: { useAsTitle: "runId", group: "Automacao" },
  access: { read: isStaff, create: isStaff, update: isStaff, delete: isAdmin },
  fields: [
    { name: "runId", type: "text", required: true, unique: true, index: true },
    { name: "articleSlug", type: "text", required: true, index: true },
    {
      name: "slot",
      type: "select",
      required: true,
      options: [
        { label: "Noticia", value: "news" },
        { label: "Evergreen", value: "evergreen" },
        { label: "Servico", value: "service" },
        { label: "Atualizacao", value: "update" },
      ],
    },
    { name: "stage", type: "text", required: true },
    {
      name: "runStatus",
      type: "select",
      required: true,
      options: [
        { label: "Executando", value: "running" },
        { label: "Revisao humana", value: "human_review_required" },
        { label: "Aprovado", value: "approved" },
        { label: "Publicado", value: "published" },
        { label: "Falhou", value: "failed" },
        { label: "Quarentena", value: "quarantined" },
      ],
    },
    { name: "attempt", type: "number", min: 1, defaultValue: 1 },
    { name: "inputHash", type: "text", index: true },
    { name: "artifactHash", type: "text", index: true },
    { name: "schemaVersion", type: "text", defaultValue: "1" },
    { name: "promptVersion", type: "text", defaultValue: "2026-07-p0" },
    { name: "modelRequested", type: "text" },
    { name: "modelResolved", type: "text" },
    { name: "providerResolved", type: "text" },
    { name: "artifacts", type: "json" },
    { name: "gateDecisions", type: "json" },
    { name: "error", type: "textarea" },
    { name: "startedAt", type: "date", required: true },
    { name: "finishedAt", type: "date" },
  ],
};

export default buildConfig({
  admin: {
    user: Users.slug,
    // Force the light theme so the admin never renders black (it was following the
    // browser's dark mode, which looked like a broken/black login screen).
    theme: "light",
    // Branding claro no login: reduz falso-positivo de "predictive phishing" do
    // Chrome/Safe Browsing (login genérico sem identidade parece página enganosa).
    meta: {
      titleSuffix: " — Redação Fato Nacional",
      description: "Acesso restrito da redação do Fato Nacional (fatonacional.com).",
    },
    importMap: {
      baseDir: path.resolve(dirname, "app/(payload)"),
      importMapFile: path.resolve(dirname, "app/(payload)/cms/importMap.js"),
    },
  },
  collections: [Users, Media, Categories, Tags, Authors, Sources, Topics, Articles, AgentRuns, EditorialRuns],
  // Allow the CMS to work on both the canonical (www) and bare host.
  cors: [
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    "https://www.fatonacional.com",
    "https://fatonacional.com",
  ],
  csrf: [
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    "https://www.fatonacional.com",
    "https://fatonacional.com",
  ],
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || "" },
  }),
  editor: lexicalEditor(),
  graphQL: { disablePlaygroundInProduction: true },
  plugins: [
    // SEMPRE registrado (com enabled dinâmico), nunca condicional: se o plugin só
    // existe quando o R2 está configurado, o `payload generate:importmap` roda sem
    // as envs e omite o S3ClientUploadHandler do importMap — e o admin INTEIRO
    // renderiza uma página em branco ("PayloadComponent not found in importMap").
    s3Storage({
      enabled: r2Enabled,
      collections: { media: true },
      bucket: r2.bucket || "r2-disabled",
      config: {
        endpoint: r2.accountId
          ? `https://${r2.accountId}.r2.cloudflarestorage.com`
          : "https://r2-disabled.invalid",
        region: "auto",
        credentials: {
          accessKeyId: r2.accessKeyId || "disabled",
          secretAccessKey: r2.secretAccessKey || "disabled",
        },
      },
    }),
    seoPlugin({ collections: ["articles"], uploadsCollection: "media" }),
  ],
  routes: {
    admin: "/cms",
    api: "/api/payload",
    graphQL: "/api/payload/graphql",
    graphQLPlayground: "/api/payload/graphql-playground",
  },
  secret: process.env.PAYLOAD_SECRET || "",
  serverURL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
});
