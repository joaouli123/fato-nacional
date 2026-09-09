import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const requiredFiles = [
  "apps/portal/src/app/(payload)/layout.tsx",
  "apps/portal/src/payload.config.ts",
  "apps/portal/src/app/globals.css",
  "apps/worker/src/index.ts",
  "apps/scheduler/src/index.ts",
  "packages/shared/src/index.ts",
  "eslint.config.mjs",
];
const ignoredDirectories = new Set([".git", ".next", ".turbo", "dist", "node_modules", "generated"]);
const sourceExtensions = new Set([".css", ".js", ".json", ".mjs", ".scss", ".ts", ".tsx"]);
const mojibakePattern = /(?:Ã[\u00a0-\u00bf]|Â[\u00a0-\u00bf]|â[\u0080-\u00bf]|\uFFFD)/u;
const secretPattern = /\bsk-[A-Za-z0-9_-]{24,}\b/u;

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(fullPath)));
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(fullPath);
  }
  return files;
}

const problems = [];

for (const relativePath of requiredFiles) {
  const fullPath = path.join(root, relativePath);
  try {
    if (!(await stat(fullPath)).isFile()) problems.push(`Arquivo obrigatorio ausente: ${relativePath}`);
  } catch {
    problems.push(`Arquivo obrigatorio ausente: ${relativePath}`);
  }
}

for (const directory of ["apps", "packages", "scripts"]) {
  for (const file of await walk(path.join(root, directory))) {
    const content = await readFile(file, "utf8");
    const relativePath = path.relative(root, file);
    if (mojibakePattern.test(content)) problems.push(`Codificacao corrompida: ${relativePath}`);
    if (secretPattern.test(content)) problems.push(`Possivel chave de API no codigo: ${relativePath}`);
  }
}

const payloadLayout = await readFile(path.join(root, requiredFiles[0]), "utf8").catch(() => "");
if (!payloadLayout.includes("@payloadcms/next/css") || !payloadLayout.includes("RootLayout")) {
  problems.push("O layout do Payload nao carrega o tema oficial do CMS");
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}

console.log("source integrity ok");
