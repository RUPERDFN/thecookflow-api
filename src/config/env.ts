import { z } from "zod";

const RawEnv = z.object({
  // Core Security
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters").optional(),
  
  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  
  // AI Services
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required").optional(),
  PERPLEXITY_API_KEY: z.string().min(1, "PERPLEXITY_API_KEY is required").optional(),
  
  // Google Play Billing
  GOOGLE_PLAY_PUBLIC_KEY: z.string().min(20, "GOOGLE_PLAY_PUBLIC_KEY is required").optional(),
  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64: z.string().optional(),
  
  // Google Cloud Storage
  GCS_BUCKET_NAME: z.string().optional(),
  GCS_SERVICE_ACCOUNT_KEY: z.string().optional(),
  
  // Firebase (for Google Play verification)
  FIREBASE_SERVICE_ACCOUNT: z.string().optional(),
  
  // CORS & Security
  ALLOWED_ORIGINS: z.string().optional(),
  
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

function normalizePemOrBase64(input: string): string {
  // Convert literal \n to actual newlines and trim
  const s = input.replace(/\\n/g, "\n").trim();

  // If already in PEM format, use it
  if (s.includes("BEGIN PUBLIC KEY")) return s;

  // If raw base64, wrap as PEM with 64 char lines
  const b64 = s.replace(/-----.*-----/g, "").replace(/\s+/g, "");
  const lines = (b64.match(/.{1,64}/g) || [b64]).join("\n");
  return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
}

export const env = {
  ...parsed.data,
  GOOGLE_PLAY_PUBLIC_KEY_PEM: parsed.data.GOOGLE_PLAY_PUBLIC_KEY 
    ? normalizePemOrBase64(parsed.data.GOOGLE_PLAY_PUBLIC_KEY) 
    : undefined,
  ALLOWED_ORIGINS_ARRAY:
    parsed.data.ALLOWED_ORIGINS?.split(",").map(s => s.trim()).filter(Boolean) ?? [
      "http://localhost:3000",
      "http://localhost:5000"
    ],
  isProd: parsed.data.NODE_ENV === "production",
  isDev: parsed.data.NODE_ENV !== "production",
  isTest: parsed.data.NODE_ENV === "test",
};

// Helper function to validate Google Play key format
function validateGooglePlayKey(key: string): boolean {
  const pemPattern = /-----BEGIN PUBLIC KEY-----[\s\S]*-----END PUBLIC KEY-----/;
  const base64Pattern = /^[A-Za-z0-9+\/]+=*$/;
  
  if (pemPattern.test(key.trim())) {
    return true;
  }
  
  // If not PEM, check if valid base64
  const cleanKey = key.replace(/\s/g, '').replace(/\\n/g, '');
  return base64Pattern.test(cleanKey) && cleanKey.length > 200;
}

// For backward compatibility
export function validateEnv() {
  return env;
}

// Log configuration (without exposing secrets)
export function logEnvConfig() {
  console.log('🔧 Environment Configuration:');
  console.log(`  - NODE_ENV: ${env.NODE_ENV}`);
  console.log(`  - PORT: ${env.PORT}`);
  console.log(`  - API_VERSION: ${env.API_VERSION}`);
  console.log(`  - DATABASE_URL: ${env.DATABASE_URL ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`  - JWT_SECRET: ${env.JWT_SECRET ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`  - SESSION_SECRET: ${env.SESSION_SECRET ? '✅ Configured' : '❌ Not configured (optional)'}`);
  console.log(`  - OPENAI_API_KEY: ${env.OPENAI_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`  - PERPLEXITY_API_KEY: ${env.PERPLEXITY_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  
  // Special validation for Google Play Key
  if (env.GOOGLE_PLAY_PUBLIC_KEY) {
    const isValidFormat = validateGooglePlayKey(env.GOOGLE_PLAY_PUBLIC_KEY);
    if (!isValidFormat) {
      console.log('  - GOOGLE_PLAY_PUBLIC_KEY: ⚠️  Configured but format not recognized as PEM/base64');
    } else {
      console.log('  - GOOGLE_PLAY_PUBLIC_KEY: ✅ Configured');
    }
  } else {
    console.log('  - GOOGLE_PLAY_PUBLIC_KEY: ❌ Not configured (optional for development)');
  }
  
  console.log(`  - GCS_BUCKET_NAME: ${env.GCS_BUCKET_NAME ? '✅ Configured' : '❌ Not configured (optional)'}`);
  console.log(`  - ALLOWED_ORIGINS: ${env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5000'}`);
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
    perplexity: !!env.PERPLEXITY_API_KEY
  };
}