"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Loader2,
  Mic,
  PhoneOff,
  Sparkles,
  Volume2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { SessionState, TimingEvent, TranscriptBubble } from "@/types/interview";

interface VoiceChatProps {
  sessionState: SessionState;
  connected: boolean;
  transportState: string;
  localAudioLevel: number;
  remoteAudioLevel: number;
  transcripts: TranscriptBubble[];
  timings: TimingEvent[];
  errorMessage: string | null;
  onToggleConnection: () => void | Promise<void>;
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>;
}

function createParticles() {
  return Array.from({ length: 18 }, (_, index) => ({
    id: index,
    left: `${(index * 37) % 100}%`,
    top: `${(index * 53) % 100}%`,
    duration: 6 + (index % 5),
    delay: index * 0.2,
  }));
}

const PARTICLES = createParticles();

function statusCopy(sessionState: SessionState) {
  switch (sessionState) {
    case "connecting":
      return "Connecting";
    case "listening":
      return "Listening";
    case "processing":
      return "Thinking";
    case "speaking":
      return "Speaking";
    case "disconnected":
      return "Disconnected";
    case "error":
      return "Error";
    default:
      return "Ready";
  }
}

function orbTone(sessionState: SessionState) {
  switch (sessionState) {
    case "connecting":
      return "from-cyan-400/35 via-sky-400/25 to-blue-500/20 border-cyan-300/50";
    case "listening":
      return "from-cyan-400/40 via-blue-400/30 to-sky-500/25 border-cyan-300/70";
    case "processing":
      return "from-amber-300/35 via-orange-300/25 to-yellow-500/20 border-amber-200/60";
    case "speaking":
      return "from-emerald-300/35 via-teal-300/25 to-cyan-500/25 border-emerald-200/60";
    case "error":
      return "from-rose-400/30 via-red-400/25 to-orange-500/20 border-rose-300/70";
    default:
      return "from-white/10 via-cyan-200/10 to-sky-200/10 border-white/15";
  }
}

export function VoiceChat({
  sessionState,
  connected,
  transportState,
  localAudioLevel,
  remoteAudioLevel,
  transcripts,
  timings,
  errorMessage,
  onToggleConnection,
  remoteAudioRef,
}: VoiceChatProps) {
  const visualLevel =
    sessionState === "speaking"
      ? Math.max(remoteAudioLevel, 0.08)
      : Math.max(localAudioLevel, sessionState === "listening" ? 0.08 : 0.02);

  const waveformData = Array.from({ length: 24 }, (_, index) => {
    const scale = 0.25 + ((index % 6) / 6) * 0.9;
    return Math.max(8, 16 + visualLevel * 110 * scale);
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_bottom,rgba(15,23,42,0.95),rgba(2,6,23,1))]" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(14,165,233,0.08),transparent_40%,rgba(34,197,94,0.08))]" />

      <div className="absolute inset-0 overflow-hidden">
        {PARTICLES.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute h-1 w-1 rounded-full bg-cyan-200/30"
            style={{ left: particle.left, top: particle.top }}
            animate={{
              y: [0, -28, 0],
              opacity: [0.18, 0.5, 0.18],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-between px-6 py-8">
        <div className="w-full max-w-5xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/60">
                Voice Interviewer
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Recruiter Screen
              </h1>
            </div>

            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 backdrop-blur-xl">
              transport: {transportState}
            </div>
          </div>
        </div>

        <div className="flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-10">
          <div className="relative flex flex-col items-center">
            <motion.div
              className="absolute h-[28rem] w-[28rem] rounded-full bg-cyan-400/10 blur-3xl"
              animate={{
                scale: sessionState === "speaking" ? [1, 1.2, 1] : [1, 1.08, 1],
                opacity: sessionState === "idle" ? [0.15, 0.22, 0.15] : [0.24, 0.42, 0.24],
              }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            />

            <AnimatePresence>
              {(sessionState === "listening" || sessionState === "speaking") && (
                <>
                  <motion.div
                    className="absolute h-56 w-56 rounded-full border border-cyan-300/30"
                    initial={{ opacity: 0.6, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.6 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                  />
                  <motion.div
                    className="absolute h-56 w-56 rounded-full border border-cyan-200/20"
                    initial={{ opacity: 0.35, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.9 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      ease: "easeOut",
                      delay: 0.45,
                    }}
                  />
                </>
              )}
            </AnimatePresence>

            <motion.button
              type="button"
              onClick={() => void onToggleConnection()}
              className={cn(
                "relative z-10 flex h-52 w-52 items-center justify-center rounded-full border bg-gradient-to-br backdrop-blur-xl transition-colors",
                orbTone(sessionState),
                connected ? "shadow-orb" : "shadow-none",
              )}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              animate={{
                scale: sessionState === "listening" || sessionState === "speaking" ? [1, 1.03, 1] : 1,
              }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <AnimatePresence mode="wait">
                {sessionState === "connecting" ? (
                  <motion.div
                    key="connecting"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                  >
                    <Loader2 className="h-16 w-16 animate-spin text-cyan-100" />
                  </motion.div>
                ) : sessionState === "speaking" ? (
                  <motion.div
                    key="speaking"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                  >
                    <Volume2 className="h-16 w-16 text-emerald-100" />
                  </motion.div>
                ) : sessionState === "error" ? (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                  >
                    <AlertCircle className="h-16 w-16 text-rose-100" />
                  </motion.div>
                ) : connected ? (
                  <motion.div
                    key="connected"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                  >
                    <Mic className="h-16 w-16 text-cyan-50" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                  >
                    <PhoneOff className="h-16 w-16 text-white/70" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            <div className="mt-10 flex h-20 items-end gap-1.5">
              {waveformData.map((height, index) => (
                <motion.div
                  key={index}
                  className={cn(
                    "w-1.5 rounded-full",
                    sessionState === "speaking"
                      ? "bg-emerald-300/90"
                      : sessionState === "processing"
                        ? "bg-amber-300/90"
                        : sessionState === "listening"
                          ? "bg-cyan-300/90"
                          : "bg-white/15",
                  )}
                  animate={{
                    height,
                    opacity: connected ? [0.55, 1, 0.55] : 0.35,
                  }}
                  transition={{
                    duration: 0.4,
                    repeat: Infinity,
                    repeatType: "mirror",
                    delay: index * 0.03,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>

            <div className="mt-8 text-center">
              <p className="text-3xl font-medium text-white">{statusCopy(sessionState)}</p>
              <p className="mt-2 text-sm text-white/55">
                {connected
                  ? "The backend controls turn-taking and audio."
                  : "Tap the orb to start the voice interview."}
              </p>
              {errorMessage ? (
                <p className="mt-3 text-sm text-rose-300">{errorMessage}</p>
              ) : null}
            </div>
          </div>

          <div className="grid w-full max-w-5xl gap-4 lg:grid-cols-[1.35fr_0.85fr]">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-2xl">
              <div className="mb-4 flex items-center gap-2 text-sm text-white/70">
                <Sparkles className="h-4 w-4 text-cyan-200" />
                Live transcript
              </div>
              <div className="space-y-3">
                {transcripts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-white/45">
                    Transcript bubbles will appear here during the call.
                  </div>
                ) : (
                  transcripts.map((bubble) => (
                    <div
                      key={bubble.id}
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6",
                        bubble.speaker === "user"
                          ? "ml-auto bg-cyan-400/12 text-cyan-50"
                          : "bg-white/8 text-white/85",
                        !bubble.final && "ring-1 ring-white/10",
                      )}
                    >
                      <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/45">
                        {bubble.speaker === "user" ? "Candidate" : "Interviewer"}
                      </div>
                      <div>{bubble.text}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-2xl">
              <div className="mb-4 text-sm text-white/70">Timing and debug</div>
              <div className="space-y-3 text-xs text-white/60">
                <div className="rounded-2xl bg-white/[0.04] p-3">
                  <div>session: {sessionState}</div>
                  <div>connected: {String(connected)}</div>
                  <div>transport: {transportState}</div>
                </div>

                {timings.length === 0 ? (
                  <div className="rounded-2xl bg-white/[0.04] p-3">
                    Waiting for backend timing events.
                  </div>
                ) : (
                  timings
                    .slice()
                    .reverse()
                    .map((entry, index) => (
                      <div key={`${entry.type}-${index}`} className="rounded-2xl bg-white/[0.04] p-3">
                        <div className="mb-1 font-medium uppercase tracking-[0.2em] text-white/45">
                          {entry.type}
                        </div>
                        <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-white/65">
                          {JSON.stringify(entry.payload, null, 2)}
                        </pre>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-5xl">
          <div className="flex items-center justify-between rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-xs text-white/55 backdrop-blur-xl">
            <span>Mic/VAD is live only while the session is connected.</span>
            <button
              type="button"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-white/80 transition hover:bg-white/10"
              onClick={() => void onToggleConnection()}
            >
              {connected ? "Disconnect" : "Start session"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
