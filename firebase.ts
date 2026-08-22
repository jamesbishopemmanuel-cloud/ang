import admin from "firebase-admin";
import { env } from "../config/env.js";

if (
  env.FIREBASE_PROJECT_ID &&
  env.FIREBASE_CLIENT_EMAIL &&
  env.FIREBASE_PRIVATE_KEY
) {
  admin.initializeApp({
    credential:
      admin.credential.cert({
        projectId:
          env.FIREBASE_PROJECT_ID,

        clientEmail:
          env.FIREBASE_CLIENT_EMAIL,

        privateKey:
          env.FIREBASE_PRIVATE_KEY
      })
  });
}

export async function sendPush(
  token: string,
  title: string,
  body: string,
  data: Record<string, string> = {}
) {
  if (!admin.apps.length) {
    throw new Error(
      "Firebase is not configured"
    );
  }

  return admin.messaging().send({
    token,

    notification: {
      title,
      body
    },

    data
  });
}