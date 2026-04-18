"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PipecatClient } from "@pipecat-ai/client-js";

import { createPipecatClient, getBackendBaseUrl } from "@/lib/pipecat";
import type {
  InterviewState,
  SessionState,
  TimingEvent,
  TranscriptBubble,
} from "@/types/interview";

interface FullTranscriptTurn {
  id: string;
  speaker: "user" | "ai";
  text: string;
}

function capTranscriptHistory(items: TranscriptBubble[]) {
  return items.slice(-8);
}

function appendFullTranscriptTurn(
  items: FullTranscriptTurn[],
  id: string,
  speaker: "user" | "ai",
  text: string,
) {
  if (!text.trim()) {
    return items;
  }

  return [...items, { id, speaker, text }];
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

function formatTranscript(turns: FullTranscriptTurn[]) {
  return turns.map((turn) => `${turn.speaker === "user" ? "User" : "AI Product Strategist"}: ${turn.text}`).join("\n\n");
}

export function usePipecatInterview() {
  const [state, setState] = useState<InterviewState>({
    sessionState: "idle",
    connected: false,
    transportState: "disconnected",
    localAudioLevel: 0,
    remoteAudioLevel: 0,
    remoteAudioActive: false,
    transcripts: [],
    timings: [],
    errorMessage: null,
    audioErrorMessage: null,
  });
  const clientRef = useRef<PipecatClient | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingTrackRef = useRef<MediaStreamTrack | null>(null);
  const currentAiTranscriptRef = useRef("");
  const fullTranscriptRef = useRef<FullTranscriptTurn[]>([]);
  const turnRef = useRef(0);

  // Helper to safely play audio with retry logic for autoplay policies
  const safePlayAudio = useCallback(async (audioElement: HTMLAudioElement) => {
    try {
      // Ensure the element is ready for playback
      audioElement.muted = false;
      audioElement.volume = 1;
      await audioElement.play();
      setState((current) => ({ ...current, audioErrorMessage: null }));
      return true;
    } catch (error) {
      // If play fails due to autoplay policy, we'll try again on user interaction
      const message = error instanceof Error ? error.message : "Unknown browser audio playback error.";
      console.warn("Audio autoplay blocked, will retry on interaction:", message);
      return false;
    }
  }, []);

  // Attach pending track to audio element when ref becomes available
  const attachPendingTrack = useCallback(async () => {
    if (!pendingTrackRef.current || !audioRef.current) {
      return;
    }

    const track = pendingTrackRef.current;
    const audio = audioRef.current;

    // Clear the pending track
    pendingTrackRef.current = null;

    const mediaStream = new MediaStream([track]);
    audio.srcObject = mediaStream;

    setState((current) => ({
      ...current,
      remoteAudioActive: true,
      audioErrorMessage: null,
    }));

    const played = await safePlayAudio(audio);
    if (!played) {
      setAudioErrorMessage(
        "Browser blocked audio autoplay. Click 'Play AI Audio' or interact with the page to enable sound.",
      );
    }
  }, [safePlayAudio]);

  const setSessionState = (sessionState: SessionState, errorMessage?: string | null) => {
    setState((current) => ({
      ...current,
      sessionState,
      errorMessage: errorMessage === undefined ? current.errorMessage : errorMessage,
    }));
  };

  const setAudioErrorMessage = (audioErrorMessage: string | null) => {
    setState((current) => ({
      ...current,
      audioErrorMessage,
    }));
  };

  const clearFullTranscript = () => {
    currentAiTranscriptRef.current = "";
    fullTranscriptRef.current = [];
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
    }
    setState((current) => ({
      ...current,
      remoteAudioActive: false,
      transcripts: [],
      timings: [],
      audioErrorMessage: null,
    }));
  };

  const getFullTranscript = () => {
    const liveTurns = state.transcripts
      .filter((bubble) => !bubble.final)
      .map((bubble) => ({
        id: bubble.id,
        speaker: bubble.speaker,
        text: bubble.text,
      }))
      .filter((bubble) => bubble.text.trim());

    return formatTranscript([...fullTranscriptRef.current, ...liveTurns]);
  };

  const ensureClient = () => {
    if (clientRef.current) {
      return clientRef.current;
    }

    const client = createPipecatClient({
      onConnected: () => {
        setState((current) => ({
          ...current,
          connected: true,
          errorMessage: null,
          audioErrorMessage: null,
        }));
      },
      onDisconnected: () => {
        currentAiTranscriptRef.current = "";
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.srcObject = null;
        }
        setState((current) => ({
          ...current,
          connected: false,
          sessionState: "disconnected",
          transportState: "disconnected",
          localAudioLevel: 0,
          remoteAudioLevel: 0,
          remoteAudioActive: false,
        }));
      },
      onTransportStateChanged: (transportState) => {
        setState((current) => ({ ...current, transportState }));
        
        // When we reach "ready" state, check if bot audio track is already available
        if (transportState === "ready" && clientRef.current && audioRef.current) {
          const tracks = clientRef.current.tracks();
          const botAudioTrack = tracks?.bot?.audio;
          if (botAudioTrack && !audioRef.current.srcObject) {
            console.log("[Audio Debug] Bot audio track found on ready, attaching...");
            const mediaStream = new MediaStream([botAudioTrack]);
            audioRef.current.srcObject = mediaStream;
          }
        }
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
        
        // Workaround: SmallWebRTCTransport only fires onTrackStarted when track "unmutes"
        // But the track may already be there. Poll for it when bot starts speaking.
        const tryAttachBotAudio = () => {
          if (!clientRef.current || !audioRef.current) return;
          
          const tracks = clientRef.current.tracks();
          const botAudioTrack = tracks?.bot?.audio;
          
          if (botAudioTrack && audioRef.current.srcObject === null) {
            console.log("[Audio Debug] Found bot audio track via polling, attaching...");
            const mediaStream = new MediaStream([botAudioTrack]);
            audioRef.current.srcObject = mediaStream;
            audioRef.current.muted = false;
            audioRef.current.volume = 1;
            audioRef.current.play().catch((err) => {
              console.warn("[Audio Debug] Play failed:", err);
            });
            setState((current) => ({
              ...current,
              remoteAudioActive: true,
              audioErrorMessage: null,
            }));
          }
        };
        
        // Try immediately and then poll a few times
        tryAttachBotAudio();
        setTimeout(tryAttachBotAudio, 100);
        setTimeout(tryAttachBotAudio, 300);
        setTimeout(tryAttachBotAudio, 500);
      },
      onBotStoppedSpeaking: () => {
        const finalId = `ai-${Date.now()}`;
        setState((current) => ({
          ...current,
          sessionState: current.connected ? "listening" : current.sessionState,
          transcripts: commitLiveBubble(current.transcripts, "ai-live", finalId),
        }));
        fullTranscriptRef.current = appendFullTranscriptTurn(
          fullTranscriptRef.current,
          finalId,
          "ai",
          currentAiTranscriptRef.current,
        );
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
        if (data.final) {
          fullTranscriptRef.current = appendFullTranscriptTurn(
            fullTranscriptRef.current,
            liveId,
            "user",
            data.text,
          );
        }
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
        console.log("[Audio Debug] onTrackStarted called, track kind:", track.kind);
        
        if (track.kind !== "audio") {
          return;
        }

        console.log("[Audio Debug] Audio track received, audioRef.current:", !!audioRef.current);

        // Store the track - if audioRef isn't ready yet, we'll attach later
        if (!audioRef.current) {
          console.log("[Audio Debug] Audio ref not ready, storing track for later attachment");
          pendingTrackRef.current = track;
          return;
        }

        console.log("[Audio Debug] Attaching audio track to element");
        const mediaStream = new MediaStream([track]);
        audioRef.current.srcObject = mediaStream;

        setState((current) => ({
          ...current,
          remoteAudioActive: true,
          audioErrorMessage: null,
        }));

        console.log("[Audio Debug] Attempting to play audio...");
        const played = await safePlayAudio(audioRef.current);
        console.log("[Audio Debug] Play result:", played);
        
        if (!played) {
          setAudioErrorMessage(
            "Browser blocked audio autoplay. Click 'Play AI Audio' or interact with the page to enable sound.",
          );
        }
      },
      onTrackStopped: (track) => {
        console.log("[Audio Debug] onTrackStopped called, track kind:", track.kind);
        if (track.kind === "audio") {
          pendingTrackRef.current = null;
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.srcObject = null;
          }
          setState((current) => ({
            ...current,
            remoteAudioActive: false,
          }));
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
    clearFullTranscript();
    setState((current) => ({
      ...current,
      sessionState: "connecting",
      errorMessage: null,
    }));

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

  const resumeRemoteAudio = async () => {
    // If there's a pending track, try to attach it first
    if (pendingTrackRef.current && audioRef.current) {
      await attachPendingTrack();
      return;
    }

    if (!audioRef.current) {
      setAudioErrorMessage("Remote audio element is not available yet.");
      return;
    }

    // If we have a srcObject, try to play
    if (audioRef.current.srcObject) {
      const played = await safePlayAudio(audioRef.current);
      if (played) {
        setAudioErrorMessage(null);
      } else {
        setAudioErrorMessage(
          "Could not play audio. Check that sound is allowed for this tab and that your output device is correct.",
        );
      }
    } else {
      setAudioErrorMessage("No audio stream available. Wait for the AI to respond.");
    }
  };

  // Effect to attach pending track when audioRef becomes available
  useEffect(() => {
    if (pendingTrackRef.current && audioRef.current) {
      void attachPendingTrack();
    }
  });

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
      getFullTranscript,
      clearFullTranscript,
      resumeRemoteAudio,
      toggleConnection: state.connected ? disconnect : connect,
    }),
    [state],
  );
}
