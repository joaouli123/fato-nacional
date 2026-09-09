import { GeistSans } from "geist/font/sans";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { NotFoundContent } from "@/components/site/not-found-content";
import "./globals.css";

// Global 404 for routes outside the (site) group (no shared root layout exists),
// so this one carries its own <html> + the site shell.
export default function GlobalNotFound() {
  return (
    <html lang="pt-BR" className={GeistSans.variable}>
      <body>
        <div className="site-shell">
          <SiteHeader />
          <NotFoundContent />
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
