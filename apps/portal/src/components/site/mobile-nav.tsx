"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function MobileNav({ items }: { items: Array<{ href: string; label: string }> }) {
  const [open, setOpen] = useState(false);
  const links: Array<[string, string]> = [
    ...items.map((i) => [i.href, i.label] as [string, string]),
    ["/busca", "Buscar"],
  ];

  return (
    <>
      <button
        type="button"
        className="mobile-nav-toggle"
        aria-label="Abrir menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu size={22} />
      </button>

      {open ? (
        <div className="mobile-nav-overlay" onClick={() => setOpen(false)}>
          <nav
            className="mobile-nav-drawer"
            aria-label="Menu"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="mobile-nav-close"
              aria-label="Fechar menu"
              onClick={() => setOpen(false)}
            >
              <X size={22} />
            </button>
            {links.map(([href, label]) => (
              <Link key={href} href={href} onClick={() => setOpen(false)}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </>
  );
}
