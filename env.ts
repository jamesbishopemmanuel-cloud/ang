import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",

  PORT: Number(process.env.PORT ?? 3000),

  API_URL: required("API_URL"),

  DATABASE_URL: required("DATABASE_URL"),

  JWT_SECRET: required("JWT_SECRET"),

  CLIENT_URL: required("CLIENT_URL"),

  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY ?? "",

  TURN_URL: process.env.TURN_URL ?? "",
  TURN_USERNAME: process.env.TURN_USERNAME ?? "",
  TURN_PASSWORD: process.env.TURN_PASSWORD ?? "",

  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ?? "",
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ?? "",
  FIREBASE_PRIVATE_KEY:
    process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n") ?? "",

  OTP_PROVIDER: process.env.OTP_PROVIDER ?? "twilio",
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ?? "",
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ?? "",
  TWILIO_VERIFY_SERVICE_SID:
    process.env.TWILIO_VERIFY_SERVICE_SID ?? ""
};