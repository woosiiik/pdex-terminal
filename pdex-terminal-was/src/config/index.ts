import dotenv from "dotenv";

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || "3000", 10),

  // Redis
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || "0", 10),
  },

  // MySQL
  mysql: {
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: parseInt(process.env.MYSQL_PORT || "3307", 10),
    database: process.env.MYSQL_DATABASE || "pdex_terminal",
    user: process.env.MYSQL_USER || "pdex_terminal",
    password: process.env.MYSQL_PASSWORD || "pdex1234",
  },

  // Claude (primary)
  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
    model: process.env.ANTHROPIC_MODEL || "claude-opus-4-5-20251101",
  },

  // Groq (fallback 1)
  groq: {
    apiKey: process.env.GROQ_API_KEY || "",
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  },

  // Gemini (fallback 2)
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  },

  // OpenAI (fallback 3)
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  },

  // Hyperliquid
  hyperliquid: {
    apiUrl:
      process.env.HYPERLIQUID_API_URL || "https://api.hyperliquid.xyz",
  },

  // Cache TTL (seconds)
  cacheTTL: {
    price: 5,
    candles: 60,
    funding: 30,
    oi: 30,
    meta: 300,
  },

  // Analysis timeout (ms)
  analysisTimeout: 10_000,
} as const;
