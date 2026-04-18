import { PipecatClient } from "@pipecat-ai/client-js";
import { SmallWebRTCTransport } from "@pipecat-ai/small-webrtc-transport";

// STUN servers help with NAT traversal
// TURN servers are needed when direct peer connection fails (strict NAT/firewall)
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  // Free TURN server from Open Relay Project (for testing only)
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

export function createPipecatClient(callbacks: ConstructorParameters<typeof PipecatClient>[0]["callbacks"]) {
  return new PipecatClient({
    transport: new SmallWebRTCTransport({
      iceServers: ICE_SERVERS,
      waitForICEGathering: true,
    }),
    enableMic: true,
    enableCam: false,
    callbacks,
  });
}

export function getBackendBaseUrl() {
  return process.env.NEXT_PUBLIC_PIPECAT_BASE_URL ?? "http://localhost:7860";
}
