import dotenv from "dotenv";
import path from "path";

// Load .env before any env var is read; path resolves relative to backend/src/
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function require_env(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const config = {
  port: parseInt(process.env.PORT ?? "3001", 10),
  groqApiKey: require_env("GROQ_API_KEY"),
  uploadsDir: path.resolve(process.env.UPLOADS_DIR ?? "./uploads"),
  dbPath: path.resolve(process.env.DB_PATH ?? "./receipts.db"),
};
