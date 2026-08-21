import "dotenv/config";

export const config = {
  port: Number(process.env.PORT || 4000),

  jwtSecret:
    process.env.JWT_SECRET ||
    "development-only-secret-change-me",

  jwtExpiresIn:
    process.env.JWT_EXPIRES_IN || "7d",

  corsOrigin:
    process.env.CORS_ORIGIN || "*"
};