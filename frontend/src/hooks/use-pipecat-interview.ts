"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { PipecatClient } from "@pipecat-ai/client-js";

import { createPipecatClient, getBackendBaseUrl } from "@/lib/pipecat";
import type {
  InterviewState,
  SessionState,
  TimingEvent,
  TranscriptBubble,
} from "@/types/interview";

function capTranscriptHistory(items: TranscriptBubble[]) {
  return items.slice(-8);
}

function upsertLiveBubble(
  items: TranscriptBubble[],
  id: string,
  speaker: "user" | "ai",
  text: string,
  final: boolean,
) {
  const next = [...items];
  const existingIndex = next.findIndex((item) => item.id === id);
  if (!text.trim()) {
    return existingIndex >= 0 ? next.filter((item) => item.id !== id) : next;
  }

  const bubble: TranscriptBubble = { id, speaker, text, final };
  if (existingIndex >= 0) {
    next[existingIndex] = bubble;
  } else {
    next.push(bubble);
  }

  return capTranscriptHistory(next);
}

function commitLiveBubble(items: TranscriptBubble[], liveId: string, finalId: string) {
  return capTranscriptHistory(
    items.map((item) => (item.id === liveId ? { ...item, id: finalId, final: true } : item)),
  );
}

export function usePipecatInterview() {
  const [state, setState] = useState<InterviewState>({
    sessionState: "idle",
    connected: false,
    transportState: "disconnected",
    localAudioLevel: 0,
    remoteAudioLevel: 0,
    transcripts: [],
    timings: [],
    errorMessage: null,
  });
  const clientRef = useRef<PipecatClient | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentAiTranscriptRef = useRef("");
  const turnRef = useRef(0);

  const setSessionState = (sessionState: SessionState, errorMessage?: string | null) => {
    setState((current) => ({
      ...current,
      sessionState,
      errorMessage: errorMessage === undefined ? current.errorMessage : errorMessage,
    }));
  };

  const ensureClient = () => {
    if (clientRef.current) {
      return clientRef.current;
    }

    const client = createPipecatClient({
      onConnected: () => {
        setState((current) => ({ ...current, connected: true, errorMessage: null }));
      },
      onDisconnected: () => {
        currentAiTranscriptRef.current = "";
        setState((current) => ({
          ...current,
          connected: false,
          sessionState: "disconnected",
          transportState: "disconnected",
          localAudioLevel: 0,
          remoteAudioLevel: 0,
        }));
      },
      onTransportStateChanged: (transportState) => {
        setState((current) => ({ ...current, transportState }));
      },
      onBotReady: () => {
        setSessionState("listening", null);
      },
      onUserStartedSpeaking: () => {
        turnRef.current += 1;
        setSessionState("listening");
      },
      onUserStoppedSpeaking: () => {
        setSessionState("processing");
      },
      onBotStartedSpeaking: () => {
        setSessionState("speaking");
      },
      onBotStoppedSpeaking: () => {
        const finalId = `ai-${Date.now()}`;
        setState((current) => ({
          ...current,
          sessionState: current.connected ? "listening" : current.sessionState,
          transcripts: commitLiveBubble(current.transcripts, "ai-live", finalId),
        }));
        currentAiTranscriptRef.current = "";
      },
      onLocalAudioLevel: (level) => {
        setState((current) => ({ ...current, localAudioLevel: level }));
      },
      onRemoteAudioLevel: (level) => {
        setState((current) => ({ ...current, remoteAudioLevel: level }));
      },
      onUserTranscript: (data) => {
        const liveId = data.final ? `user-${Date.now()}` : "user-live";
        setState((current) => ({
          ...current,
          transcripts: upsertLiveBubble(
            current.transcripts,
            liveId,
            "user",
            data.text,
            Boolean(data.final),
          ),
        }));
      },
      onBotOutput: (data) => {
        const nextText = typeof data.text === "string" ? data.text : "";
        if (!nextText.trim()) {
          return;
        }

        if (data.aggregated_by === "word") {
          currentAiTranscriptRef.current = `${currentAiTranscriptRef.current} ${nextText}`.trim();
        } else {
          currentAiTranscriptRef.current = nextText;
        }

        setState((current) => ({
          ...current,
          transcripts: upsertLiveBubble(
            current.transcripts,
            "ai-live",
            "ai",
            currentAiTranscriptRef.current,
            false,
          ),
        }));
      },
      onTrackStarted: async (track) => {
        if (track.kind !== "audio" || !audioRef.current) {
          return;
        }
        const mediaStream = new MediaStream([track]);
        audioRef.current.srcObject = mediaStream;
        await audioRef.current.play().catch(() => undefined);
      },
      onTrackStopped: (track) => {
        if (track.kind === "audio" && audioRef.current) {
          audioRef.current.srcObject = null;
        }
      },
      onServerMessage: (data: Record<string, unknown>) => {
        const type = typeof data.type === "string" ? data.type : "timing";
        const timing: TimingEvent = {
          type: type as TimingEvent["type"],
          payload: data,
        };
        setState((current) => ({
          ...current,
          timings: [...current.timings.slice(-9), timing],
        }));
      },
      onDeviceError: (error) => {
        setSessionState("error", error.message);
      },
      onError: (message: unknown) => {
        const maybeData =
          typeof message === "object" && message !== null && "data" in message
            ? (message as { data?: { message?: unknown } }).data
            : undefined;
        const errorMessage =
          typeof maybeData?.message === "string" ? maybeData.message : "Voice session error";
        setSessionState("error", errorMessage);
      },
    });

    clientRef.current = client;
    return client;
  };

  const connect = async () => {
    const client = ensureClient();
    setSessionState("connecting", null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      await client.connect({
        webrtcUrl: `${getBackendBaseUrl()}/api/offer`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to connect voice session";
      setSessionState("error", message);
    }
  };

  const disconnect = async () => {
    const client = clientRef.current;
    if (!client) {
      setSessionState("disconnected");
      return;
    }

    await client.disconnect().catch(() => undefined);
    setSessionState("disconnected");
  };

  useEffect(() => {
    return () => {
      const client = clientRef.current;
      if (!client) {
        return;
      }
      void client.disconnect().catch(() => undefined);
    };
  }, []);

  return useMemo(
    () => ({
      ...state,
      remoteAudioRef: audioRef,
      connect,
      disconnect,
      toggleConnection: state.connected ? disconnect : connect,
    }),
    [state],
  );
}
