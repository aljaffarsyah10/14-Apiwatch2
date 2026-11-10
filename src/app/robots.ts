import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.APP_URL || "https://apiwatch.io";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/status", "/login", "/register"],
        disallow: [
          "/dashboard",
          "/dashboard/*",
          "/endpoints",
          "/endpoints/*",
          "/incidents",
          "/incidents/*",
          "/reports",
          "/reports/*",
          "/settings",
          "/settings/*",
          "/api/",
          "/api/*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
