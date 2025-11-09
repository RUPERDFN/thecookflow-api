import { z } from "zod";

const RawEnv = z.object({
  // Core Security
  JWT_SECRET: z.string().min(8, "JWT_SECRET must be at least 8 characters"),
  SESSION_SECRET: z.string().min(8, "SESSION_SECRET must be at least 8 characters").optional(),

  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),

  // AI Services
  OPENAI_API_KEY: z.string().optional(),
  PERPLEXITY_API_KEY: z.string().optional(),

  // Google Play Billing
  GOOGLE_PLAY_PUBLIC_KEY_B64: z.string().optional(),
  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_B64: z.string().optional(),

  // Google Cloud Storage
  GCS_BUCKET_NAME: z.string().optional(),
  GCS_SERVICE_ACCOUNT_JSON_B64: z.string().optional(),

  // Firebase (for Google Play verification)
  FIREBASE_SERVICE_ACCOUNT_JSON_B64: z.string().optional(),

  // CORS & Security
  ALLOWED_ORIGINS: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),

  // Environment
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().default("5000"),
  API_VERSION: z.string().default("1.0.0"),

  // Feature Flags
  ENABLE_DEMO_MODE: z.string().transform(val => val === "true").default("false"),
  ENABLE_STAGING_FEATURES: z.string().transform(val => val === "true").default("false"),
});

const parsed = RawEnv.safeParse(process.env);
if (!parsed.success) {
  const msg = parsed.error.errors.map(e => `• ${e.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${msg}`);
}

function tryDecodeBase64(input?: string): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  const normalized = trimmed.replace(/\s+/g, "");
  const isBase64 = /^[A-Za-z0-9+/=]+$/.test(normalized) && normalized.length % 4 === 0;
  if (!isBase64) {
    return trimmed;
  }

  try {
    return Buffer.from(normalized, "base64").toString("utf-8");
  } catch (error) {
    return trimmed;
  }
}

function normalizePem(input?: string): string | undefined {
  if (!input) return undefined;
  const decoded = tryDecodeBase64(input) ?? input;
  const normalized = decoded.replace(/\r\n/g, "\n").replace(/\\n/g, "\n").trim();

  if (!normalized) {
    return undefined;
  }

  if (normalized.includes("BEGIN") && normalized.includes("END")) {
    return normalized;
  }

  const body = normalized.replace(/-----.*-----/g, "").replace(/\s+/g, "");
  if (!body) {
    return undefined;
  }

  const lines = (body.match(/.{1,64}/g) ?? [body]).join("\n");
  return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
}

function decodeJson<T = unknown>(input?: string): T | undefined {
  if (!input) return undefined;
  const decoded = tryDecodeBase64(input) ?? input;
  try {
    return JSON.parse(decoded) as T;
  } catch (error) {
    return undefined;
  }
}

function parseOrigins(raw?: string, fallback?: string): string[] {
  const source = raw && raw.trim().length > 0 ? raw : fallback ?? "";
  return source
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
}

const rawEnv = parsed.data;

export const env = {
  ...rawEnv,
  GOOGLE_PLAY_PUBLIC_KEY_PEM: normalizePem(rawEnv.GOOGLE_PLAY_PUBLIC_KEY_B64),
  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: decodeJson<Record<string, unknown>>(
    rawEnv.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_B64
  ),
  GCS_SERVICE_ACCOUNT_JSON: decodeJson<Record<string, unknown>>(
    rawEnv.GCS_SERVICE_ACCOUNT_JSON_B64
  ),
  FIREBASE_SERVICE_ACCOUNT_JSON: decodeJson<Record<string, unknown>>(
    rawEnv.FIREBASE_SERVICE_ACCOUNT_JSON_B64
  ),
  ALLOWED_ORIGINS_LIST: parseOrigins(rawEnv.ALLOWED_ORIGINS, rawEnv.CORS_ORIGIN),
  isProd: rawEnv.NODE_ENV === "production",
  isDev: rawEnv.NODE_ENV !== "production",
  isTest: rawEnv.NODE_ENV === "test",
};

// For backward compatibility
export function validateEnv() {
  return env;
}

// Log configuration (without exposing secrets)
export function logEnvConfig() {
  console.log("🔧 Environment Configuration:");
  console.log(`  - NODE_ENV: ${env.NODE_ENV}`);
  console.log(`  - PORT: ${env.PORT}`);
  console.log(`  - API_VERSION: ${env.API_VERSION}`);
  console.log(
    `  - DATABASE_URL: ${env.DATABASE_URL ? "✅ Configured" : "❌ Not configured"}`
  );
  console.log(`  - JWT_SECRET: ${env.JWT_SECRET ? "✅ Configured" : "❌ Not configured"}`);
  console.log(
    `  - SESSION_SECRET: ${env.SESSION_SECRET ? "✅ Configured" : "❌ Not configured (optional)"}`
  );
  console.log(`  - OPENAI_API_KEY: ${env.OPENAI_API_KEY ? "✅ Configured" : "❌ Not configured"}`);
  console.log(
    `  - PERPLEXITY_API_KEY: ${env.PERPLEXITY_API_KEY ? "✅ Configured" : "❌ Not configured"}`
  );
  console.log(
    `  - GOOGLE_PLAY_PUBLIC_KEY_B64: ${env.GOOGLE_PLAY_PUBLIC_KEY_B64 ? "✅ Configured" : "❌ Not configured (optional)"}`
  );
  console.log(
    `  - GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_B64: ${
      env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_B64 ? "✅ Configured" : "❌ Not configured (optional)"
    }`
  );
  console.log(
    `  - FIREBASE_SERVICE_ACCOUNT_JSON_B64: ${
      env.FIREBASE_SERVICE_ACCOUNT_JSON_B64 ? "✅ Configured" : "❌ Not configured (optional)"
    }`
  );
  console.log(
    `  - GCS_SERVICE_ACCOUNT_JSON_B64: ${
      env.GCS_SERVICE_ACCOUNT_JSON_B64 ? "✅ Configured" : "❌ Not configured (optional)"
    }`
  );
  console.log(`  - GCS_BUCKET_NAME: ${env.GCS_BUCKET_NAME ? "✅ Configured" : "❌ Not configured (optional)"}`);
  console.log(
    `  - ALLOWED_ORIGINS: ${
      env.ALLOWED_ORIGINS_LIST.length > 0
        ? env.ALLOWED_ORIGINS_LIST.join(", ")
        : env.CORS_ORIGIN || "(none configured)"
    }`
  );
  console.log(`  - ENABLE_DEMO_MODE: ${env.ENABLE_DEMO_MODE}`);
  console.log(`  - ENABLE_STAGING_FEATURES: ${env.ENABLE_STAGING_FEATURES}`);
}

// Helper to get normalized Google Play public key
export function getGooglePlayPublicKey(): string | undefined {
  return env.GOOGLE_PLAY_PUBLIC_KEY_PEM;
}

// Helper to check if AI APIs are configured
export function checkAIKeys(): { openai: boolean; perplexity: boolean } {
  return {
    openai: !!env.OPENAI_API_KEY,
    perplexity: !!env.PERPLEXITY_API_KEY,
  };
}