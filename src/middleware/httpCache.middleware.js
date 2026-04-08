/**
 * Shared catalog / reference GET responses only. Safe behind CDN/browser caches
 * because data is non-personal; TTL stays short so CMS changes propagate quickly.
 */
export const publicShortCache =
  (maxAgeSeconds = 60, staleWhileRevalidateSeconds = 120) =>
  (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return next();
    }

    const hasAuthContext = Boolean(req.headers.authorization || req.headers.cookie);
    if (hasAuthContext) {
      res.setHeader("Cache-Control", "private, no-store");
      return next();
    }

    res.setHeader(
      "Cache-Control",
      `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidateSeconds}`,
    );
    next();
  };

/** Sensitive or highly dynamic GETs (availability, listings that may leak PII). */
export const privateNoStore = (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD") {
    res.setHeader("Cache-Control", "private, no-store");
  }
  next();
};

/** Authenticated JSON APIs — never cache intermediaries. */
export const sensitiveApiNoCache = (req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  next();
};
