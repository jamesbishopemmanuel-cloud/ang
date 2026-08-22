import twilio from "twilio";
import { env } from "../config/env.js";

const client =
  env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN
    ? twilio(
        env.TWILIO_ACCOUNT_SID,
        env.TWILIO_AUTH_TOKEN
      )
    : null;

export async function sendOTP(
  phone: string
) {
  if (!client) {
    throw new Error("OTP provider is not configured");
  }

  if (!env.TWILIO_VERIFY_SERVICE_SID) {
    throw new Error("OTP Verify Service is not configured");
  }

  return client.verify.v2
    .services(env.TWILIO_VERIFY_SERVICE_SID)
    .verifications.create({
      to: phone,
      channel: "sms"
    });
}

export async function verifyOTP(
  phone: string,
  code: string
) {
  if (!client) {
    throw new Error("OTP provider is not configured");
  }

  return client.verify.v2
    .services(env.TWILIO_VERIFY_SERVICE_SID)
    .verificationChecks.create({
      to: phone,
      code
    });
}