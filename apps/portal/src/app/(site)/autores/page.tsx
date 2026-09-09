import type { Metadata } from "next";
import Link from "next/link";
import { getAuthors } from "@/lib/data/repository";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Autores",
  alternates: { canonical: absoluteUrl("/autores") },
  description: "Conheça as mesas editoriais, suas áreas de cobertura e os critérios de transparência do Fato Nacional.",
};

export default async function AuthorsPage() {
  const authors = await getAuthors();
  return (
    <main className="section">
      <div className="container">
        <p className="eyebrow">Autores</p>
        <h1>Mesas e assinaturas editoriais</h1>
        <p>
          Agentes de IA podem apoiar pesquisa, estrutura, redação e SEO. Revisão humana só é
          declarada no artigo quando o CMS registra quem revisou, quando revisou e qual versão foi
          aprovada.
        </p>
        <div className="grid">
          {authors.map((author) => (
            <Link key={author.slug} href={`/autores/${author.slug}`} className="author-card">
              <strong>{author.name}</strong>
              {author.role ? <span>{author.role}</span> : null}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
