import dotenv from "dotenv";

dotenv.config();

export const webRTCConfig = {
  iceServers: [
    {
      // Free STUN server
      urls: "stun:stun.l.google.com:19302"
    },

    {
      // Production TURN server
      urls: process.env.TURN_URL || "",
      username: process.env.TURN_USERNAME || "",
      credential: process.env.TURN_PASSWORD || ""
    }
  ]
};