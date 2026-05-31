import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Block aggressive scrapers and bots
        userAgent: ["AhrefsBot", "SemrushBot", "DotBot", "MJ12bot", "DataForSeoBot"],
        disallow: "/",
      },
      {
        // Restrict API access
        userAgent: "*",
        disallow: ["/api/", "/_next/", "/public/"],
        allow: "/",
      },
      {
        // Additional restrictions
        userAgent: "*",
        disallow: [
          "/*?*", // Disallow URLs with query parameters to prevent scraping variations
          "/admin/",
          "/*.json$", // Block JSON files
        ],
        crawlDelay: 2, // Add delay between requests
      },
    ],
    sitemap: "/sitemap.xml",
  };
}
