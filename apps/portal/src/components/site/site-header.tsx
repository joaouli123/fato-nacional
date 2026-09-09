import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { getArticles, getCategories } from "@/lib/data/repository";

export async function SiteHeader() {
  const [categories, articles] = await Promise.all([getCategories(), getArticles()]);
  // Only show editorias that already have at least one published post — new
  // categories appear in the nav automatically once they have content.
  const counts = new Map<string, number>();
  for (const a of articles) counts.set(a.category, (counts.get(a.category) ?? 0) + 1);
  const activeCategories = categories.filter((c) => (counts.get(c.slug) ?? 0) > 0);
  const navItems: Array<{ href: string; label: string }> = [
    { href: "/", label: "Início" },
    ...activeCategories.map((c) => ({ href: `/categoria/${c.slug}`, label: c.name })),
    { href: "/autores", label: "Autores" },
  ];

  return (
    <header className="site-header">
      <div className="container site-header__inner-grid">
        {/* Left: Logo */}
        <div className="header-left">
          <Link href="/" aria-label="Início">
            <Logo />
          </Link>
        </div>

        {/* Center: all categories (dynamic — new editorias appear automatically) */}
        <nav className="header-center-nav" aria-label="Principal">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right: Search shortcut + mobile menu */}
        <div className="header-right-actions">
          <Link href="/busca" className="icon-action-btn" aria-label="Buscar">
            <Search size={18} />
          </Link>
          <MobileNav items={navItems} />
        </div>
      </div>
    </header>
  );
}
