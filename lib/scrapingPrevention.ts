/**
 * Utility functions for preventing web scraping and detecting malicious bots
 */

const SCRAPER_USER_AGENTS = [
  "curl", "wget", "python", "scrapy", "bot", "crawler", "spider", 
  "scraper", "selenium", "headless", "phantom", "automation",
];

export function isSuspiciousUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false; 
  const lowercaseUA = userAgent.toLowerCase();
  return SCRAPER_USER_AGENTS.some((botUA) => lowercaseUA.includes(botUA));
}

export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  
  return headers.get("x-real-ip") || 
         headers.get("x-client-ip") || 
         headers.get("cf-connecting-ip") || 
         "127.0.0.1";
}

export function isLikelyLegitimateRequest(headers: Headers): boolean {
  // ALWAYS ALLOW IN DEVELOPMENT
  if (process.env.NODE_ENV === "development") return true;

  const userAgent = headers.get("user-agent") || "";
  const accept = headers.get("accept") || "";

  // Check for suspicious bots
  if (isSuspiciousUserAgent(userAgent)) return false;

  // Allow if it's a standard browser User Agent or expects JSON (API calls)
  if (
    userAgent.includes("Mozilla") || 
    accept.includes("application/json") || 
    accept.includes("*/*")
  ) {
    return true;
  }

  return false;
}