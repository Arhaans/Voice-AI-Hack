"use client";

import { useMemo, useState } from "react";

import { VoiceChat } from "@/components/ui/voice-chat";
import { usePipecatInterview } from "@/hooks/use-pipecat-interview";

export default function Page() {
  const interview = usePipecatInterview();
  const [prdMarkdown, setPrdMarkdown] = useState("");
  const [generationState, setGenerationState] = useState<"idle" | "generating" | "result" | "error">(
    "idle",
  );
  const [generationError, setGenerationError] = useState<string | null>(null);

  const appState = useMemo(() => {
    if (generationState !== "idle") {
      return generationState;
    }

    if (interview.connected) {
      return "connected" as const;
    }

    if (interview.errorMessage) {
      return "error" as const;
    }

    return "idle" as const;
  }, [generationState, interview.connected, interview.errorMessage]);

  const handleStartSession = async () => {
    setPrdMarkdown("");
    setGenerationError(null);
    setGenerationState("idle");
    interview.clearFullTranscript();
    await interview.connect();
  };

  const handleEndSession = async () => {
    setGenerationError(null);

    await interview.disconnect();
    const transcript = interview.getFullTranscript().trim();

    if (!transcript) {
      setGenerationState("error");
      setGenerationError("No transcript was captured for this session.");
      return;
    }

    setGenerationState("generating");

    try {
      const response = await fetch("/api/generate-prd", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcript }),
      });

      const data = (await response.json()) as { error?: string; markdown?: string };
      if (!response.ok || !data.markdown) {
        throw new Error(data.error ?? "Unable to generate PRD markdown.");
      }

      setPrdMarkdown(data.markdown);
      setGenerationState("result");
    } catch (error) {
      setGenerationState("error");
      setGenerationError(error instanceof Error ? error.message : "Unable to generate PRD markdown.");
    }
  };

  const handleStartNewSession = async () => {
    setPrdMarkdown("");
    setGenerationError(null);
    setGenerationState("idle");
    interview.clearFullTranscript();
    await interview.connect();
  };

  return (
    <VoiceChat
      appState={appState}
      sessionState={interview.sessionState}
      connected={interview.connected}
      transportState={interview.transportState}
      localAudioLevel={interview.localAudioLevel}
      remoteAudioLevel={interview.remoteAudioLevel}
      remoteAudioActive={interview.remoteAudioActive}
      transcripts={interview.transcripts}
      timings={interview.timings}
      markdown={prdMarkdown}
      errorMessage={generationError ?? interview.errorMessage}
      audioErrorMessage={interview.audioErrorMessage}
      onStartSession={handleStartSession}
      onEndSession={handleEndSession}
      onStartNewSession={handleStartNewSession}
      onResumeAudio={interview.resumeRemoteAudio}
      remoteAudioRef={interview.remoteAudioRef}
    />
  );
}
