const LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  silent: -1,
};

const normalizeLevel = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(LEVELS, raw)) {
    return raw;
  }
  return process.env.NODE_ENV === "production" ? "warn" : "info";
};

const configuredLevel = normalizeLevel(process.env.LOG_LEVEL);

const canLog = (level) => {
  if (configuredLevel === "silent") return false;
  return LEVELS[level] <= LEVELS[configuredLevel];
};

const formatPrefix = (level) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}]`;
};

export const logger = {
  error: (...args) => {
    if (!canLog("error")) return;
    console.error(formatPrefix("error"), ...args);
  },
  warn: (...args) => {
    if (!canLog("warn")) return;
    console.warn(formatPrefix("warn"), ...args);
  },
  info: (...args) => {
    if (!canLog("info")) return;
    console.log(formatPrefix("info"), ...args);
  },
  debug: (...args) => {
    if (!canLog("debug")) return;
    console.debug(formatPrefix("debug"), ...args);
  },
};

