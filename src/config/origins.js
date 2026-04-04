const DEFAULT_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
];

export const getAllowedOrigins = () => {
  const envOrigins = (process.env.ORAGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [...new Set([...DEFAULT_ORIGINS, ...envOrigins])];
};

export const allowOrigin = (origin, callback) => {
  const allowedOrigins = getAllowedOrigins();

  if (!origin || allowedOrigins.includes(origin)) {
    return callback(null, origin || true);
  }

  return callback(new Error(`CORS blocked for origin: ${origin}`));
};
