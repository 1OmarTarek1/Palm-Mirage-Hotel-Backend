import mongoose from "mongoose";

let connectionPromise = null;
let retryTimer = null;
let listenersAttached = false;

const RETRY_DELAY_MS = 5000;

const getNormalizedDbUrl = () => {
  const rawDbUrl = process.env.DB_URL?.trim();
  return rawDbUrl?.startsWith("mongodb://") || rawDbUrl?.startsWith("mongodb+srv://")
    ? rawDbUrl
    : rawDbUrl
      ? `mongodb://${rawDbUrl}`
      : "";
};

const attachConnectionListeners = () => {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on("connected", () => {
    console.log("DB connected");
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("DB disconnected");
  });

  mongoose.connection.on("error", (error) => {
    console.error(`MongoDB connection error: ${error.message}`);
  });
};

const scheduleReconnect = () => {
  if (retryTimer) return;

  console.warn(`Retrying DB connection in ${RETRY_DELAY_MS / 1000} seconds`);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    connectDB().catch(() => {
      // The error is already logged inside connectDB.
    });
  }, RETRY_DELAY_MS);
};

export const isDatabaseReady = () => mongoose.connection.readyState === 1;

export const getDatabaseStatus = () => {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  return states[mongoose.connection.readyState] || "unknown";
};

const connectDB = async () => {
  const normalizedDbUrl = getNormalizedDbUrl();

  if (!normalizedDbUrl) {
    throw new Error("DB_URL is missing. Please configure it in src/config/.env.dev");
  }

  if (isDatabaseReady()) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  attachConnectionListeners();
  mongoose.set("bufferCommands", false);

  connectionPromise = mongoose
    .connect(normalizedDbUrl, {
      serverSelectionTimeoutMS: 10000,
    })
    .then((connection) => {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }

      return connection;
    })
    .catch((error) => {
      console.error(`DB connection failed: ${error.message}`);
      scheduleReconnect();
      throw error;
    })
    .finally(() => {
      connectionPromise = null;
    });

  return connectionPromise;
};

export default connectDB;
