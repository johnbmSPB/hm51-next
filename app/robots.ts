import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://hm5-1.ru/sitemap.xml",
    host: "https://hm5-1.ru",
  };
}
