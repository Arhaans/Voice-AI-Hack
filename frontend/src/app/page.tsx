"use client";

import { VoiceChat } from "@/components/ui/voice-chat";
import { usePipecatInterview } from "@/hooks/use-pipecat-interview";

export default function Page() {
  const interview = usePipecatInterview();

  return (
    <VoiceChat
      sessionState={interview.sessionState}
      connected={interview.connected}
      transportState={interview.transportState}
      localAudioLevel={interview.localAudioLevel}
      remoteAudioLevel={interview.remoteAudioLevel}
      transcripts={interview.transcripts}
      timings={interview.timings}
      errorMessage={interview.errorMessage}
      onToggleConnection={interview.toggleConnection}
      remoteAudioRef={interview.remoteAudioRef}
    />
  );
}
