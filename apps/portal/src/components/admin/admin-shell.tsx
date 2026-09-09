"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Calendar,
  FileText,
  ShieldCheck,
  Coins,
  Cpu,
  Settings,
  ExternalLink,
  Shield,
  Activity,
  Terminal,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";

interface User {
  id: string;
  email: string;
  name?: string;
  collection: string;
}

const mainNavItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/pautas", label: "Pautas & Calendário", icon: Calendar },
  { href: "/admin/artigos", label: "Artigos", icon: FileText },
  { href: "/admin/revisao", label: "Revisão humana", icon: ShieldCheck },
  { href: "/admin/qualidade", label: "Qualidade", icon: ShieldCheck },
  { href: "/admin/custos", label: "Custos de IA", icon: Coins },
  { href: "/admin/agentes", label: "Agentes de IA", icon: Cpu },
] as const;

const systemNavItems = [
  { href: "/admin/auditorias", label: "Auditorias", icon: Shield },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AdminShell({ children, user }: { children: ReactNode; user?: User }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change (state adjustment during render — no effect needed)
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsMobileMenuOpen(false);
  }

  const getInitials = (email: string) => {
    return email ? email.substring(0, 2).toUpperCase() : "AD";
  };

  const getUsername = (email: string) => {
    return email ? email.split("@")[0] : "Administrador";
  };

  return (
    <div className="admin-layout">
      {/* Mobile Overlay */}
      <div 
        className={`admin-mobile-overlay ${isMobileMenuOpen ? "admin-mobile-overlay--active" : ""}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Sidebar Navigation */}
      <aside className={`admin-sidebar ${isMobileMenuOpen ? "admin-sidebar--mobile-open" : ""}`}>
        <div className="admin-sidebar__logo-area" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="admin-sidebar__logo-icon">F</div>
            <div>
              <div className="admin-sidebar__logo-text">Fato Nacional</div>
              <span className="admin-sidebar__logo-badge">SaaS Admin</span>
            </div>
          </div>
          {isMobileMenuOpen && (
            <button 
              className="admin-header__mobile-btn" 
              onClick={() => setIsMobileMenuOpen(false)}
              style={{ color: "var(--admin-sidebar-text-primary)", marginRight: 0 }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Operação Section */}
        <div className="admin-sidebar__menu-group">
          <p className="admin-sidebar__eyebrow">Operação</p>
          <nav>
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-sidebar__nav-item ${
                    isActive ? "admin-sidebar__nav-item--active" : ""
                  }`}
                >
                  <Icon className="admin-sidebar__nav-icon" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sistema Section */}
        <div className="admin-sidebar__menu-group">
          <p className="admin-sidebar__eyebrow">Sistema & Controle</p>
          <nav>
            {systemNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-sidebar__nav-item ${
                    isActive ? "admin-sidebar__nav-item--active" : ""
                  }`}
                >
                  <Icon className="admin-sidebar__nav-icon" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <Link href="/cms" className="admin-sidebar__nav-item" target="_blank">
              <Terminal className="admin-sidebar__nav-icon" />
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                Payload CMS <ExternalLink size={12} />
              </span>
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer User Info */}
        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__user-card">
            <div className="admin-sidebar__user-avatar">
              {user ? getInitials(user.email) : "AD"}
            </div>
            <div className="admin-sidebar__user-info">
              <span className="admin-sidebar__user-name">
                {user ? getUsername(user.email) : "Admin"}
              </span>
              <span className="admin-sidebar__user-role">
                {user ? user.email : "admin@fatonacional.com.br"}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="admin-main">
        {/* Top Header Bar */}
        <header className="admin-header">
          <div className="admin-header__title-area" style={{ display: "flex", alignItems: "center" }}>
            <button 
              className="admin-header__mobile-btn"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="admin-header__breadcrumb">
              <span>Admin</span>
              <span>/</span>
              <span style={{ color: "var(--admin-text-primary)", fontWeight: 500 }}>
                {pathname === "/admin"
                  ? "Dashboard"
                  : pathname.split("/").pop()?.replace("-", " ") || "Painel"}
              </span>
            </div>
          </div>

          <div className="admin-header__actions">
            <Link href="/" className="admin-header__btn" target="_blank">
              Ver Portal <ExternalLink size={14} />
            </Link>
          </div>
        </header>

        {/* Dynamic Page Container */}
        <div className="admin-page-container">{children}</div>
      </main>
    </div>
  );
}
