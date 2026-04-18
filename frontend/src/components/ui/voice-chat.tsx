"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";

import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Copy,
  Download,
  FileText,
  Loader2,
  MessageSquare,
  Mic,
  PhoneOff,
  RotateCcw,
  Sparkles,
  Square,
  Terminal,
  Volume2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { PlasmaRef } from "@pipecat-ai/voice-ui-kit/webgl";
import type { SessionState, TimingEvent, TranscriptBubble } from "@/types/interview";

// WebGL canvas must not SSR
const Plasma = dynamic(
  () => import("@pipecat-ai/voice-ui-kit/webgl").then((m) => ({ default: m.Plasma })),
  { ssr: false, loading: () => <PlasmaFallback /> },
);

function PlasmaFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
    </div>
  );
}

type AppState = "idle" | "connected" | "generating" | "result" | "error";
type SidebarTab = "transcript" | "prd";

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

// Wave-animated button
function WaveButton({
  children,
  className,
  disabled,
  onClick,
  type = "button",
}: {
  children: string;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn("wave-btn", className)}
    >
      {children.split("").map((char, i) => (
        <span
          key={i}
          className="wave-char"
          style={{ "--char-index": i } as CSSProperties}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </button>
  );
}

function statusCopy(appState: AppState, sessionState: SessionState) {
  if (appState === "generating") return "Generating PRD";
  if (appState === "result")    return "PRD Ready";
  if (appState === "error")     return "Error";
  if (appState === "idle")      return "Ready";
  switch (sessionState) {
    case "connecting":   return "Connecting";
    case "listening":    return "Listening";
    case "processing":   return "Thinking";
    case "speaking":     return "Speaking";
    case "disconnected": return "Disconnected";
    case "error":        return "Error";
    default:             return "Ready";
  }
}

function statusDetail(appState: AppState, connected: boolean) {
  switch (appState) {
    case "generating":
      return "Turning your session transcript into a product spec.";
    case "result":
      return "Your PRD is ready — view it in the panel.";
    case "error":
      return "Session hit an error. Start a fresh session when ready.";
    case "connected":
      return connected
        ? "Speak naturally. End once the strategist has enough context."
        : "Connecting to live voice session.";
    default:
      return "Start a discovery session and talk your idea into a PRD.";
  }
}

// Plasma config per state — drives intensity, speed, color bias
function plasmaConfigForState(
  appState: AppState,
  sessionState: SessionState,
  level: number,
) {
  const base = {
    useCustomColors: true as const,
    color1: "#F97316",
    color2: "#0A0A0A",
    color3: "#FED7AA",
    backgroundColor: "#ffffff",
    audioEnabled: false,
    ringCount: 5,
    ringThickness: 0.018,
    ringBounce: 0.35,
    ringVariance: 0.4,
    lerpSpeed: 0.06,
  };

  if (appState === "generating") {
    return { ...base, intensity: 1.6 + level * 1.2, plasmaSpeed: 1.4, color1: "#FB923C", ringCount: 7 };
  }
  if (appState === "result") {
    return { ...base, intensity: 0.5, plasmaSpeed: 0.25, color1: "#F97316", color2: "#0A0A0A" };
  }
  if (appState === "error") {
    return { ...base, intensity: 0.6, plasmaSpeed: 0.3, color1: "#EF4444", color2: "#0A0A0A" };
  }

  switch (sessionState) {
    case "listening":
      return { ...base, intensity: 0.8 + level * 2.5, plasmaSpeed: 0.7 + level * 1.5, ringCount: 6, ringThickness: 0.018 + level * 0.04 };
    case "processing":
      return { ...base, intensity: 1.4, plasmaSpeed: 1.2, color1: "#FB923C", ringCount: 6 };
    case "speaking":
      return { ...base, intensity: 0.9 + level * 2, plasmaSpeed: 0.9 + level, color1: "#0A0A0A", color2: "#F97316", color3: "#1C1C1C" };
    case "connecting":
      return { ...base, intensity: 0.7, plasmaSpeed: 0.6, color1: "#FDBA74" };
    default:
      return { ...base, intensity: 0.28, plasmaSpeed: 0.18 };
  }
}

function parseMarkdown(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = markdown.split(/\r?\n/);
  const listItems: string[] = [];
  const codeLines: string[] = [];
  let inCodeBlock = false;

  const flushList = () => {
    if (listItems.length > 0) { blocks.push({ type: "list", items: [...listItems] }); listItems.length = 0; }
  };
  const flushCode = () => {
    if (codeLines.length > 0) { blocks.push({ type: "code", text: codeLines.join("\n") }); codeLines.length = 0; }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) { if (inCodeBlock) flushCode(); inCodeBlock = !inCodeBlock; continue; }
    if (inCodeBlock) { codeLines.push(line); continue; }
    if (!trimmed) { flushList(); continue; }
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || /^\d+\.\s/.test(trimmed)) {
      listItems.push(trimmed.replace(/^[-*]\s/, "").replace(/^\d+\.\s/, ""));
      continue;
    }
    flushList();
    if (trimmed.startsWith("# "))       blocks.push({ type: "h1", text: trimmed.slice(2).trim() });
    else if (trimmed.startsWith("## ")) blocks.push({ type: "h2", text: trimmed.slice(3).trim() });
    else                                blocks.push({ type: "p",  text: trimmed });
  }
  flushList(); flushCode();
  return blocks;
}

function createMarkdownFilename(markdown: string) {
  const firstHeading = markdown.split(/\r?\n/).find((l) => l.trim().startsWith("# "))?.replace(/^#\s+/, "").trim();
  const slug = (firstHeading || "product-prd").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${slug || "product-prd"}.md`;
}

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
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("transcript");
  const plasmaRef = useRef<PlasmaRef>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const visualLevel =
    sessionState === "speaking"
      ? Math.max(remoteAudioLevel, 0.06)
      : Math.max(localAudioLevel, sessionState === "listening" ? 0.06 : 0.01);

  // Drive plasma intensity from audio levels in real time
  useEffect(() => {
    if (!plasmaRef.current) return;
    const cfg = plasmaConfigForState(appState, sessionState, visualLevel);
    plasmaRef.current.updateConfig(cfg);
  }, [appState, sessionState, visualLevel]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts]);

  // Auto-switch to PRD tab when ready
  useEffect(() => {
    if (appState === "result" || appState === "generating") setSidebarTab("prd");
    else setSidebarTab("transcript");
  }, [appState]);

  const markdownBlocks = useMemo(() => parseMarkdown(markdown), [markdown]);
  const markdownFilename = useMemo(() => createMarkdownFilename(markdown), [markdown]);

  const handlePrimaryAction = async () => {
    if (appState === "generating") return;
    if (connected) { await onEndSession(); return; }
    if (appState === "result" || appState === "error") { await onStartNewSession(); return; }
    await onStartSession();
  };

  const handleCopyMarkdown = async () => {
    if (!markdown) return;
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const handleCopyClaudePrompt = async () => {
    if (!markdown) return;
    const claudePrompt = `You are a staff software engineer at a top-tier tech company who writes clean, production-grade code. I have a PRD for a feature I need to build. Before you write any code, ask me every question you need answered to produce the best possible implementation. Once you have all the context, build the feature step by step.

Here is the PRD:

---

${markdown}

---

Please start by asking me any clarifying questions you need before implementation.`;

    await navigator.clipboard.writeText(claudePrompt);
    setCopiedPrompt(true);
    window.setTimeout(() => setCopiedPrompt(false), 1500);
  };

  const handleDownloadMarkdown = () => {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = markdownFilename; link.click();
    URL.revokeObjectURL(url);
  };

  const isActive = connected || appState === "generating";
  const hasPRD = appState === "generating" || appState === "result" || (appState === "error" && !!markdown);

  const primaryLabel = connected
    ? "End session"
    : appState === "generating"
      ? "Generating..."
      : appState === "result" || appState === "error"
        ? "New session"
        : "Start session";

  // Status indicator dot color
  const dotColor =
    appState === "error" ? "bg-red-500" :
    appState === "result" ? "bg-black" :
    appState === "generating" || sessionState === "processing" ? "bg-orange-400 animate-pulse" :
    sessionState === "listening" ? "bg-orange-500 animate-pulse" :
    sessionState === "speaking" ? "bg-black" :
    sessionState === "connecting" ? "bg-orange-300 animate-pulse" :
    "bg-black/20";

  return (
    <div className="flex h-screen overflow-hidden bg-white font-mono text-black">

      {/* Hidden audio element */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* ══════════════ LEFT — Main panel ══════════════ */}
      <div className="relative flex flex-1 flex-col overflow-hidden">

        {/* Dot grid texture */}
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Ambient orange wash when active */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              className="pointer-events-none absolute inset-0 z-0"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              style={{
                background: "radial-gradient(ellipse 60% 50% at 50% 10%, rgba(249,115,22,0.07) 0%, transparent 70%)",
              }}
            />
          )}
        </AnimatePresence>

        {/* ── Header ── */}
        <header className="relative z-10 flex items-center justify-between px-8 pt-7 pb-0">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-black/45 font-mono shadow-card hover:border-black/20 hover:text-black/70 transition"
            >
              <ArrowLeft className="h-3 w-3" />
              Home
            </Link>
            <div>
              <p className="text-[10px] uppercase tracking-[0.42em] text-black/30 font-mono">Voice AI Hack</p>
              <h1 className="mt-0.5 text-xl font-medium tracking-tight text-black font-mono">
                Talk your idea into a PRD
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-3.5 py-1.5 shadow-card">
            <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
            <span className="text-[11px] text-black/40 font-mono">{transportState}</span>
          </div>
        </header>

        {/* ── Plasma visualizer ── */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-8 py-4">
          <div className="relative w-full max-w-lg">
            {/* Subtle outer ring — pulses when active */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ margin: "-32px" }}
              animate={isActive ? {
                boxShadow: [
                  "0 0 0px 0px rgba(249,115,22,0.0)",
                  "0 0 60px 12px rgba(249,115,22,0.12)",
                  "0 0 0px 0px rgba(249,115,22,0.0)",
                ],
              } : {}}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Plasma canvas container */}
            <div className="relative aspect-square w-full overflow-hidden rounded-full border border-black/8 bg-white shadow-card">
              <Plasma
                ref={plasmaRef}
                className="h-full w-full"
                powerPreference="high-performance"
                alpha={false}
                antialias
                initialConfig={{
                  useCustomColors: true,
                  color1: "#F97316",
                  color2: "#0A0A0A",
                  color3: "#FED7AA",
                  backgroundColor: "#ffffff",
                  intensity: 0.28,
                  plasmaSpeed: 0.18,
                  audioEnabled: false,
                  ringCount: 5,
                  ringThickness: 0.018,
                  lerpSpeed: 0.06,
                }}
                fallbackContent={<PlasmaFallback />}
              />

              {/* Center icon overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <AnimatePresence mode="wait">
                  {appState === "generating" || sessionState === "connecting" ? (
                    <motion.div key="spin" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}>
                      <Loader2 className="h-10 w-10 animate-spin text-orange-500/70" />
                    </motion.div>
                  ) : sessionState === "speaking" ? (
                    <motion.div key="vol" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}>
                      <Volume2 className="h-10 w-10 text-black/40" />
                    </motion.div>
                  ) : appState === "result" ? (
                    <motion.div key="done" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}>
                      <Sparkles className="h-10 w-10 text-orange-400/80" />
                    </motion.div>
                  ) : appState === "error" || sessionState === "error" ? (
                    <motion.div key="err" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}>
                      <AlertCircle className="h-10 w-10 text-red-400/70" />
                    </motion.div>
                  ) : sessionState === "listening" ? (
                    <motion.div key="mic" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}>
                      <Mic className="h-10 w-10 text-orange-500/70" />
                    </motion.div>
                  ) : (
                    <motion.div key="idle" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}>
                      <PhoneOff className="h-10 w-10 text-black/18" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* ── Status text ── */}
        <div className="relative z-10 px-8 pb-2 text-center">
          <motion.p
            key={statusCopy(appState, sessionState)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-medium tracking-tight text-black font-mono"
          >
            {statusCopy(appState, sessionState)}
          </motion.p>
          <p className="mt-1.5 text-sm text-black/40 font-mono">
            {statusDetail(appState, connected)}
          </p>
          {errorMessage && (
            <p className="mt-2 text-sm text-red-500 font-mono">{errorMessage}</p>
          )}
        </div>

        {/* ── Waveform bars ── */}
        <div className="relative z-10 flex justify-center px-8 py-3">
          <div className="flex h-10 items-end gap-[3px]">
            {Array.from({ length: 28 }, (_, i) => {
              const scale = 0.2 + ((i % 7) / 7) * 0.85;
              const h = Math.max(4, 10 + visualLevel * 90 * scale);
              const barColor =
                sessionState === "listening" ? "bg-orange-500" :
                sessionState === "speaking" || appState === "result" ? "bg-black/60" :
                appState === "generating" || sessionState === "processing" ? "bg-orange-400" :
                "bg-black/10";
              return (
                <motion.div
                  key={i}
                  className={cn("w-[3px] rounded-full", barColor)}
                  animate={{ height: h, opacity: isActive ? [0.5, 1, 0.5] : 0.25 }}
                  transition={{ duration: 0.32, repeat: Infinity, repeatType: "mirror", delay: i * 0.025, ease: "easeInOut" }}
                />
              );
            })}
          </div>
        </div>

        {/* ── Bottom action bar ── */}
        <footer className="relative z-10 px-8 pb-8 pt-2">
          <div className="flex flex-col items-center gap-3">
            <WaveButton
              disabled={appState === "generating"}
              onClick={() => void handlePrimaryAction()}
              className={cn(
                "rounded-full px-8 py-3 text-sm font-medium tracking-wide transition-all duration-200 font-mono disabled:cursor-not-allowed disabled:opacity-50",
                connected
                  ? "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                  : appState === "result" || appState === "error"
                    ? "border border-black/12 bg-white text-black shadow-card hover:border-black/25"
                    : "border border-black bg-black text-white hover:bg-black/85",
              )}
            >
              {primaryLabel}
            </WaveButton>

            {/* Audio debug controls */}
            <div className="flex items-center gap-3">
              <WaveButton
                onClick={() => void onResumeAudio()}
                className="rounded-full border border-black/10 bg-white px-4 py-1.5 text-xs text-black/45 transition hover:border-orange-200 hover:text-orange-600 font-mono shadow-card"
              >
                Play AI Audio
              </WaveButton>
              {audioErrorMessage && (
                <span className="text-xs text-orange-600 font-mono">{audioErrorMessage}</span>
              )}
            </div>
          </div>
        </footer>
      </div>

      {/* ══════════════ RIGHT — Sidebar ══════════════ */}
      <aside className="flex w-[380px] shrink-0 flex-col border-l border-black/8 bg-white">

        {/* Sidebar header + tabs */}
        <div className="flex items-center gap-0 border-b border-black/8 px-5 pt-5 pb-0">
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.38em] text-black/30 font-mono mb-3">
              Session panel
            </p>
          </div>
        </div>

        {/* Tab row */}
        <div className="flex border-b border-black/8">
          <button
            type="button"
            onClick={() => setSidebarTab("transcript")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium font-mono transition-colors border-b-2",
              sidebarTab === "transcript"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-black/35 hover:text-black/60",
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Transcript
          </button>
          <button
            type="button"
            onClick={() => setSidebarTab("prd")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium font-mono transition-colors border-b-2 relative",
              sidebarTab === "prd"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-black/35 hover:text-black/60",
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            PRD
            {hasPRD && sidebarTab !== "prd" && (
              <span className="absolute right-3 top-2.5 h-1.5 w-1.5 rounded-full bg-orange-500" />
            )}
          </button>
        </div>

        {/* ── Transcript tab ── */}
        {sidebarTab === "transcript" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {transcripts.length === 0 ? (
                <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-black/10">
                  <p className="text-sm text-black/25 font-mono text-center px-6">
                    Transcript bubbles will appear here once the session starts.
                  </p>
                </div>
              ) : (
                transcripts.map((bubble) => (
                  <motion.div
                    key={bubble.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 font-mono",
                      bubble.speaker === "user"
                        ? "ml-auto bg-orange-50 border border-orange-100 text-black"
                        : "bg-black/[0.03] border border-black/6 text-black/75",
                      !bubble.final && "ring-1 ring-black/5",
                    )}
                  >
                    <div className="mb-0.5 text-[9px] uppercase tracking-[0.22em] text-black/28">
                      {bubble.speaker === "user" ? "You" : "Strategist"}
                    </div>
                    {bubble.text}
                  </motion.div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>

            {/* Debug section at bottom of transcript tab */}
            <div className="border-t border-black/6 px-4 py-3 space-y-2">
              <p className="text-[9px] uppercase tracking-[0.3em] text-black/25 font-mono mb-2">Debug</p>
              <div className="rounded-xl bg-black/[0.03] px-3 py-2 text-[11px] text-black/40 font-mono space-y-0.5">
                <div>app: {appState}</div>
                <div>session: {sessionState}</div>
                <div>transport: {transportState}</div>
              </div>
              {timings.length > 0 && (
                <div className="rounded-xl bg-black/[0.03] px-3 py-2 text-[11px] text-black/40 font-mono">
                  <div className="text-[9px] uppercase tracking-[0.2em] text-black/25 mb-1">
                    latest event
                  </div>
                  <div>{timings[timings.length - 1]?.type}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PRD tab ── */}
        {sidebarTab === "prd" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* PRD action buttons */}
            {appState === "result" && (
              <div className="border-b border-black/6 px-4 py-3 flex flex-wrap gap-2">
                <WaveButton
                  onClick={() => void handleCopyMarkdown()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-black/60 hover:border-black/20 hover:text-black font-mono shadow-card transition"
                >
                  {copied ? "Copied!" : "Copy MD"}
                </WaveButton>
                <WaveButton
                  onClick={() => void handleCopyClaudePrompt()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs text-orange-700 hover:bg-orange-100 font-mono transition"
                >
                  {copiedPrompt ? "Copied!" : "Claude Prompt"}
                </WaveButton>
                <WaveButton
                  onClick={handleDownloadMarkdown}
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-black/60 hover:border-black/20 hover:text-black font-mono shadow-card transition"
                >
                  Download
                </WaveButton>
                <WaveButton
                  onClick={() => void onStartNewSession()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-black bg-black px-3 py-1.5 text-xs text-white hover:bg-black/80 font-mono transition"
                >
                  New Session
                </WaveButton>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {appState === "generating" ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-8 text-sm text-orange-700 font-mono">
                  <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                  Generating your PRD...
                </div>
              ) : markdown ? (
                <div className="space-y-3.5">
                  {markdownBlocks.map((block, index) => {
                    if (block.type === "h1") return (
                      <h1 key={index} className="text-lg font-medium tracking-tight text-black font-mono">{block.text}</h1>
                    );
                    if (block.type === "h2") return (
                      <h2 key={index} className="pt-2 text-[11px] font-medium uppercase tracking-[0.2em] text-orange-600 font-mono">{block.text}</h2>
                    );
                    if (block.type === "list") return (
                      <ul key={index} className="space-y-1.5 pl-0.5 text-xs leading-6 text-black/65 font-mono">
                        {block.items.map((item, ii) => (
                          <li key={`${index}-${ii}`} className="flex gap-2.5">
                            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-orange-400" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    );
                    if (block.type === "code") return (
                      <pre key={index} className="overflow-x-auto rounded-xl border border-black/8 bg-black/[0.03] p-3 text-[11px] leading-5 text-black/60 font-mono">
                        <code>{block.text}</code>
                      </pre>
                    );
                    return (
                      <p key={index} className="text-xs leading-6 text-black/60 font-mono">{block.text}</p>
                    );
                  })}
                </div>
              ) : !hasPRD ? (
                <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-black/10">
                  <p className="text-sm text-black/25 font-mono text-center px-6">
                    PRD will appear here after the session ends.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-red-200 bg-red-50 px-4 py-5 text-xs text-red-600 font-mono">
                  PRD generation failed before markdown was returned.
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
