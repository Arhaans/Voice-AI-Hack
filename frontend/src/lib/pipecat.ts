import { PipecatClient } from "@pipecat-ai/client-js";
import { SmallWebRTCTransport } from "@pipecat-ai/small-webrtc-transport";

const DEFAULT_STUN_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

export function createPipecatClient(callbacks: ConstructorParameters<typeof PipecatClient>[0]["callbacks"]) {
  return new PipecatClient({
    transport: new SmallWebRTCTransport({
      iceServers: DEFAULT_STUN_SERVERS,
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
