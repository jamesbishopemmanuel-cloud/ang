import { webRTCConfig } from "../config/webrtc.js";

export function getCallConfig() {
  return {
    type: "webrtc-config",
    config: webRTCConfig
  };
}