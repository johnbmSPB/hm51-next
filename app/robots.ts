import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://hm51-next.vercel.app/sitemap.xml",
    host: "https://hm51-next.vercel.app",
  };
}
