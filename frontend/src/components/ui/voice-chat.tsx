"use client";

import { useMemo, useState, type RefObject } from "react";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Copy,
  Download,
  Loader2,
  Mic,
  PhoneOff,
  RotateCcw,
  Sparkles,
  Square,
  Terminal,
  Volume2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { SessionState, TimingEvent, TranscriptBubble } from "@/types/interview";

type AppState = "idle" | "connected" | "generating" | "result" | "error";

type MarkdownBlock =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "code"; text: string };

interface VoiceChatProps {
  appState: AppState;
  sessionState: SessionState;
  connected: boolean;
  transportState: string;
  localAudioLevel: number;
  remoteAudioLevel: number;
  remoteAudioActive: boolean;
  transcripts: TranscriptBubble[];
  timings: TimingEvent[];
  markdown: string;
  errorMessage: string | null;
  audioErrorMessage: string | null;
  onStartSession: () => void | Promise<void>;
  onEndSession: () => void | Promise<void>;
  onStartNewSession: () => void | Promise<void>;
  onResumeAudio: () => void | Promise<void>;
  remoteAudioRef: RefObject<HTMLAudioElement | null>;
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

function statusCopy(appState: AppState, sessionState: SessionState) {
  if (appState === "generating") {
    return "Generating PRD";
  }
  if (appState === "result") {
    return "PRD Ready";
  }
  if (appState === "error") {
    return "Error";
  }
  if (appState === "idle") {
    return "Ready";
  }

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

function statusDetail(appState: AppState, connected: boolean) {
  switch (appState) {
    case "generating":
      return "Turning the session transcript into an implementation-ready product spec.";
    case "result":
      return "Your discovery session is complete. Copy, download, or start another pass.";
    case "error":
      return "The session hit an error. You can start a fresh session when you are ready.";
    case "connected":
      return connected
        ? "Speak naturally. End the session once the strategist has enough context."
        : "Connecting to the live voice session.";
    default:
      return "Start a short product discovery session and talk your idea into a PRD.";
  }
}

function orbTone(appState: AppState, sessionState: SessionState) {
  if (appState === "generating") {
    return "from-amber-300/35 via-orange-300/25 to-yellow-500/20 border-amber-200/60";
  }
  if (appState === "result") {
    return "from-emerald-300/35 via-teal-300/25 to-cyan-500/25 border-emerald-200/60";
  }
  if (appState === "error") {
    return "from-rose-400/30 via-red-400/25 to-orange-500/20 border-rose-300/70";
  }

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

function parseMarkdown(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = markdown.split(/\r?\n/);
  const listItems: string[] = [];
  const codeLines: string[] = [];
  let inCodeBlock = false;

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ type: "list", items: [...listItems] });
      listItems.length = 0;
    }
  };

  const flushCode = () => {
    if (codeLines.length > 0) {
      blocks.push({ type: "code", text: codeLines.join("\n") });
      codeLines.length = 0;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        flushCode();
      }
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (!trimmed) {
      flushList();
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || /^\d+\.\s/.test(trimmed)) {
      listItems.push(trimmed.replace(/^[-*]\s/, "").replace(/^\d+\.\s/, ""));
      continue;
    }

    flushList();

    if (trimmed.startsWith("# ")) {
      blocks.push({ type: "h1", text: trimmed.slice(2).trim() });
    } else if (trimmed.startsWith("## ")) {
      blocks.push({ type: "h2", text: trimmed.slice(3).trim() });
    } else {
      blocks.push({ type: "p", text: trimmed });
    }
  }

  flushList();
  flushCode();
  return blocks;
}

function createMarkdownFilename(markdown: string) {
  const firstHeading = markdown
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith("# "))
    ?.replace(/^#\s+/, "")
    .trim();

  const slug = (firstHeading || "product-prd")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${slug || "product-prd"}.md`;
}

const PARTICLES = createParticles();

export function VoiceChat({
  appState,
  sessionState,
  connected,
  transportState,
  localAudioLevel,
  remoteAudioLevel,
  remoteAudioActive,
  transcripts,
  timings,
  markdown,
  errorMessage,
  audioErrorMessage,
  onStartSession,
  onEndSession,
  onStartNewSession,
  onResumeAudio,
  remoteAudioRef,
}: VoiceChatProps) {
  const [copied, setCopied] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const visualLevel =
    sessionState === "speaking"
      ? Math.max(remoteAudioLevel, 0.08)
      : Math.max(localAudioLevel, sessionState === "listening" ? 0.08 : 0.02);

  const waveformData = Array.from({ length: 24 }, (_, index) => {
    const scale = 0.25 + ((index % 6) / 6) * 0.9;
    return Math.max(8, 16 + visualLevel * 110 * scale);
  });

  const markdownBlocks = useMemo(() => parseMarkdown(markdown), [markdown]);
  const markdownFilename = useMemo(() => createMarkdownFilename(markdown), [markdown]);

  const handlePrimaryAction = async () => {
    if (appState === "generating") {
      return;
    }

    if (connected) {
      await onEndSession();
      return;
    }

    if (appState === "result" || appState === "error") {
      await onStartNewSession();
      return;
    }

    await onStartSession();
  };

  const handleCopyMarkdown = async () => {
    if (!markdown) {
      return;
    }

    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const handleCopyClaudePrompt = async () => {
    if (!markdown) {
      return;
    }

    const claudePrompt = `You are a senior software engineer who builds production-grade systems. You have deep expertise in system design, architecture patterns, and writing clean, maintainable code.

I want you to use your "plan mode" thinking approach:
1. First, carefully analyze the requirements in the PRD below
2. Break down the implementation into logical phases
3. Identify potential technical challenges and edge cases
4. Consider scalability, security, and maintainability
5. Then provide a detailed implementation plan with code

Here is the Product Requirements Document (PRD) that defines what needs to be built:

---

${markdown}

---

Please analyze this PRD and provide a comprehensive implementation plan followed by the actual code implementation. Start by outlining your approach, then proceed with the implementation.`;

    await navigator.clipboard.writeText(claudePrompt);
    setCopiedPrompt(true);
    window.setTimeout(() => setCopiedPrompt(false), 1500);
  };

  const handleDownloadMarkdown = () => {
    if (!markdown) {
      return;
    }

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = markdownFilename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const primaryButtonLabel = connected
    ? "End session"
    : appState === "generating"
      ? "Generating..."
      : appState === "result" || appState === "error"
        ? "Start new session"
        : "Start session";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
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
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/60">Voice AI Hack</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Talk your idea into a PRD
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-white/60">
                Product discovery with a live AI strategist, followed by an implementation-ready markdown spec.
              </p>
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
                scale:
                  sessionState === "speaking" || appState === "generating" ? [1, 1.2, 1] : [1, 1.08, 1],
                opacity: appState === "idle" ? [0.15, 0.22, 0.15] : [0.24, 0.42, 0.24],
              }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            />

            <AnimatePresence>
              {(sessionState === "listening" || sessionState === "speaking" || appState === "generating") && (
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
              onClick={() => void handlePrimaryAction()}
              disabled={appState === "generating"}
              className={cn(
                "relative z-10 flex h-52 w-52 items-center justify-center rounded-full border bg-gradient-to-br backdrop-blur-xl transition-colors disabled:cursor-not-allowed disabled:opacity-80",
                orbTone(appState, sessionState),
                connected || appState === "result" ? "shadow-orb" : "shadow-none",
              )}
              whileHover={{ scale: appState === "generating" ? 1 : 1.03 }}
              whileTap={{ scale: appState === "generating" ? 1 : 0.97 }}
              animate={{
                scale:
                  sessionState === "listening" || sessionState === "speaking" || appState === "generating"
                    ? [1, 1.03, 1]
                    : 1,
              }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <AnimatePresence mode="wait">
                {appState === "generating" || sessionState === "connecting" ? (
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
                ) : appState === "result" ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                  >
                    <Sparkles className="h-16 w-16 text-emerald-100" />
                  </motion.div>
                ) : appState === "error" || sessionState === "error" ? (
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
                    appState === "result"
                      ? "bg-emerald-300/90"
                      : appState === "generating" || sessionState === "processing"
                        ? "bg-amber-300/90"
                        : sessionState === "speaking"
                          ? "bg-emerald-300/90"
                          : sessionState === "listening"
                            ? "bg-cyan-300/90"
                            : "bg-white/15",
                  )}
                  animate={{
                    height,
                    opacity: connected || appState === "generating" ? [0.55, 1, 0.55] : 0.35,
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
              <p className="text-3xl font-medium text-white">{statusCopy(appState, sessionState)}</p>
              <p className="mt-2 max-w-xl text-sm text-white/55">{statusDetail(appState, connected)}</p>
              {errorMessage ? <p className="mt-3 text-sm text-rose-300">{errorMessage}</p> : null}
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
                    Transcript bubbles will appear here during the discovery session.
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
                        {bubble.speaker === "user" ? "You" : "Strategist"}
                      </div>
                      <div>{bubble.text}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-2xl">
              <div className="mb-4 text-sm text-white/70">
                {appState === "result" ? "Session summary" : "Timing and debug"}
              </div>
              <div className="space-y-3 text-xs text-white/60">
                <div className="rounded-2xl bg-white/[0.04] p-3">
                  <div>app: {appState}</div>
                  <div>session: {sessionState}</div>
                  <div>connected: {String(connected)}</div>
                  <div>transport: {transportState}</div>
                </div>

                {appState === "generating" ? (
                  <div className="rounded-2xl bg-white/[0.04] p-3 text-sm text-white/70">
                    Generating your markdown PRD from the captured transcript.
                  </div>
                ) : timings.length === 0 ? (
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

          <div className="w-full max-w-5xl rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-2xl">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm text-white/60">AI audio output</div>
                <p className="mt-2 text-sm text-white/75">
                  {remoteAudioActive
                    ? "Remote audio is attached. If you still do not hear the strategist, use the controls or tap manual play."
                    : "Waiting for remote audio. Keep this control visible while we debug browser playback."}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:bg-white/10"
                onClick={() => void onResumeAudio()}
              >
                Play AI Audio
              </button>
            </div>

            <audio
              ref={remoteAudioRef}
              autoPlay
              playsInline
              controls
              className="w-full rounded-2xl border border-white/10 bg-black/20"
            />

            {audioErrorMessage ? (
              <p className="mt-3 text-sm text-amber-200">{audioErrorMessage}</p>
            ) : (
              <p className="mt-3 text-xs text-white/50">
                Browser audio controls are shown temporarily for debugging playback.
              </p>
            )}
          </div>

          {(appState === "generating" || appState === "result" || (appState === "error" && !connected)) && (
            <div className="w-full max-w-5xl rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-2xl">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm text-white/60">Generated PRD</div>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Implementation-ready markdown</h2>
                </div>

                {appState === "result" ? (
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
                      onClick={() => void handleCopyMarkdown()}
                    >
                      <Copy className="h-4 w-4" />
                      {copied ? "Copied" : "Copy Markdown"}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-400/20"
                      onClick={() => void handleCopyClaudePrompt()}
                    >
                      <Terminal className="h-4 w-4" />
                      {copiedPrompt ? "Copied!" : "Copy Claude Prompt"}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
                      onClick={handleDownloadMarkdown}
                    >
                      <Download className="h-4 w-4" />
                      Download .md
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-cyan-400/15 px-4 py-2 text-sm text-cyan-50 transition hover:bg-cyan-400/20"
                      onClick={() => void onStartNewSession()}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Start New Session
                    </button>
                  </div>
                ) : null}
              </div>

              {appState === "generating" ? (
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-white/70">
                  <Loader2 className="h-4 w-4 animate-spin text-amber-200" />
                  Generating PRD...
                </div>
              ) : markdown ? (
                <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                  {markdownBlocks.map((block, index) => {
                    if (block.type === "h1") {
                      return (
                        <h1 key={index} className="text-3xl font-semibold tracking-tight text-white">
                          {block.text}
                        </h1>
                      );
                    }

                    if (block.type === "h2") {
                      return (
                        <h2
                          key={index}
                          className="pt-3 text-lg font-semibold uppercase tracking-[0.18em] text-cyan-100/85"
                        >
                          {block.text}
                        </h2>
                      );
                    }

                    if (block.type === "list") {
                      return (
                        <ul key={index} className="space-y-2 pl-1 text-sm leading-7 text-white/80">
                          {block.items.map((item, itemIndex) => (
                            <li key={`${index}-${itemIndex}`} className="flex gap-3">
                              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-300" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      );
                    }

                    if (block.type === "code") {
                      return (
                        <pre
                          key={index}
                          className="overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-xs leading-6 text-cyan-50"
                        >
                          <code>{block.text}</code>
                        </pre>
                      );
                    }

                    return (
                      <p key={index} className="text-sm leading-7 text-white/80">
                        {block.text}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-rose-300/20 bg-rose-400/5 px-4 py-5 text-sm text-rose-100">
                  PRD generation failed before markdown was returned.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-full max-w-5xl">
          <div className="flex flex-col gap-3 rounded-[28px] border border-white/10 bg-white/[0.04] px-5 py-4 text-xs text-white/55 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
            <span>Mic and voice activity detection stay live only while the session is connected.</span>
            <div className="flex flex-wrap gap-3">
              {connected ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-rose-400/10 px-4 py-2 text-white/85 transition hover:bg-rose-400/20"
                  onClick={() => void onEndSession()}
                >
                  <Square className="h-4 w-4" />
                  End Session
                </button>
              ) : null}

              <button
                type="button"
                disabled={appState === "generating"}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void handlePrimaryAction()}
              >
                {primaryButtonLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
