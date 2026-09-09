import Link from "next/link";
import { Mail } from "lucide-react";
import { Logo } from "./logo";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div className="site-footer__brand">
          <Logo />
          <p>
            Notícias do Brasil e do mundo: economia, tecnologia, política e cidadania, com apuração
            cuidadosa e linguagem clara.
          </p>
          <a href="mailto:contato@fatonacional.com" className="site-footer__contact">
            <Mail size={15} /> contato@fatonacional.com
          </a>
        </div>

        <nav className="site-footer__col" aria-label="Editorias">
          <h4>Editorias</h4>
          <Link href="/categoria/brasil">Brasil</Link>
          <Link href="/categoria/tecnologia-e-ia">Tecnologia e IA</Link>
          <Link href="/categoria/mundo">Mundo</Link>
          <Link href="/categoria/financas">Finanças</Link>
        </nav>

        <nav className="site-footer__col" aria-label="Institucional">
          <h4>Institucional</h4>
          <Link href="/quem-somos">Quem somos</Link>
          <Link href="/expediente">Expediente</Link>
          <Link href="/contato">Contato</Link>
          <Link href="/politica-editorial">Política editorial</Link>
          <Link href="/como-usamos-ia">Como usamos IA</Link>
          <Link href="/politica-de-correcoes">Correções</Link>
        </nav>

        <nav className="site-footer__col" aria-label="Mais">
          <h4>Mais</h4>
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/termos">Termos de uso</Link>
          <Link href="/quem-somos">Quem somos</Link>
          <Link href="/rss.xml">RSS</Link>
        </nav>
      </div>

      <div className="container site-footer__bottom">
        <span>
          © {year} Fato Nacional · Todos os direitos reservados. Jornalismo independente · Brasil.
        </span>
      </div>
    </footer>
  );
}
