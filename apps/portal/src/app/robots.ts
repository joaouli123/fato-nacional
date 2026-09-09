import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Article images are served by this public API route. The more
        // specific allow rule wins over the broad /api/ disallow below.
        allow: ["/", "/api/media/"],
        disallow: ["/admin/", "/api/", "/cms/"],
      },
    ],
    sitemap: [
      absoluteUrl("/sitemap.xml"),
      absoluteUrl("/news-sitemap.xml"),
      absoluteUrl("/image-sitemap.xml"),
    ],
  };
}
