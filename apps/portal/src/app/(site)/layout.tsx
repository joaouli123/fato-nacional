import type { Metadata } from "next";
import { GoogleAnalytics } from "@/components/site/analytics";
import { AdSenseScript } from "@/components/site/adsense";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { siteConfig } from "@/lib/site";
import { createOrganizationJsonLd, createWebSiteJsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/utils";
import { GeistSans } from "geist/font/sans";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl()),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    types: { "application/rss+xml": [{ url: absoluteUrl("/rss.xml"), title: siteConfig.name }] },
  },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const orgJsonLd = createOrganizationJsonLd();
  const siteJsonLd = createWebSiteJsonLd();
  return (
    <html lang="pt-BR" className={GeistSans.variable}>
      <body>
        <GoogleAnalytics />
        <AdSenseScript />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd).replaceAll("<", "\\u003c") }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd).replaceAll("<", "\\u003c") }}
        />
        <div className="site-shell">
          <SiteHeader />
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
