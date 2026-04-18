export type SessionState =
  | "idle"
  | "connecting"
  | "listening"
  | "processing"
  | "speaking"
  | "disconnected"
  | "error";

export type TranscriptSpeaker = "user" | "ai";

export interface TranscriptBubble {
  id: string;
  speaker: TranscriptSpeaker;
  text: string;
  final: boolean;
}

export interface TimingEvent {
  type: "timing" | "latency_summary" | "latency_breakdown";
  payload: Record<string, unknown>;
}

export interface InterviewState {
  sessionState: SessionState;
  connected: boolean;
  transportState: string;
  localAudioLevel: number;
  remoteAudioLevel: number;
  remoteAudioActive: boolean;
  transcripts: TranscriptBubble[];
  timings: TimingEvent[];
  errorMessage: string | null;
  audioErrorMessage: string | null;
}
