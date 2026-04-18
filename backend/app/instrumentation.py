from __future__ import annotations

import time
from collections.abc import Awaitable, Callable
from typing import Any

from loguru import logger

from pipecat.frames.frames import (
    BotStartedSpeakingFrame,
    BotStoppedSpeakingFrame,
    Frame,
    InterimTranscriptionFrame,
    LLMTextFrame,
    TTSAudioRawFrame,
    TranscriptionFrame,
    UserStartedSpeakingFrame,
    VADUserStartedSpeakingFrame,
    VADUserStoppedSpeakingFrame,
)
from pipecat.observers.user_bot_latency_observer import LatencyBreakdown
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor


TimingSink = Callable[[str, dict[str, Any]], Awaitable[None]]


class TurnTimingProbe(FrameProcessor):
    def __init__(self) -> None:
        super().__init__(name="turn-timing-probe", enable_direct_mode=True)
        self._sink: TimingSink | None = None
        self._turn_started_at: float | None = None
        self._user_stopped_at: float | None = None
        self._first_interim_sent = False
        self._first_final_sent = False
        self._first_llm_sent = False
        self._first_tts_audio_sent = False

    def bind_sink(self, sink: TimingSink) -> None:
        self._sink = sink

    async def process_frame(self, frame: Frame, direction: FrameDirection) -> None:
        await super().process_frame(frame, direction)

        if direction == FrameDirection.DOWNSTREAM:
            await self._handle_downstream(frame)

        await self.push_frame(frame, direction)

    async def _handle_downstream(self, frame: Frame) -> None:
        now = time.perf_counter()

        if isinstance(frame, (UserStartedSpeakingFrame, VADUserStartedSpeakingFrame)):
            self._reset_turn(now)
            await self._emit("user_speech_started", now)
        elif isinstance(frame, VADUserStoppedSpeakingFrame):
            self._user_stopped_at = now
            await self._emit("user_speech_stopped", now)
        elif isinstance(frame, InterimTranscriptionFrame) and not self._first_interim_sent:
            self._first_interim_sent = True
            await self._emit("stt_first_interim", now)
        elif isinstance(frame, TranscriptionFrame) and not self._first_final_sent:
            self._first_final_sent = True
            await self._emit("stt_first_final", now)
        elif isinstance(frame, LLMTextFrame) and frame.text.strip() and not self._first_llm_sent:
            self._first_llm_sent = True
            await self._emit("llm_first_token", now)
        elif isinstance(frame, TTSAudioRawFrame) and not self._first_tts_audio_sent:
            self._first_tts_audio_sent = True
            await self._emit("tts_first_audio_chunk", now)
        elif isinstance(frame, BotStartedSpeakingFrame):
            await self._emit("bot_started_speaking", now)
        elif isinstance(frame, BotStoppedSpeakingFrame):
            await self._emit("bot_stopped_speaking", now)

    def _reset_turn(self, now: float) -> None:
        self._turn_started_at = now
        self._user_stopped_at = None
        self._first_interim_sent = False
        self._first_final_sent = False
        self._first_llm_sent = False
        self._first_tts_audio_sent = False

    async def emit_latency_breakdown(self, breakdown: LatencyBreakdown) -> None:
        payload = {
            "user_turn_secs": breakdown.user_turn_secs,
            "ttfb": [
                {
                    "processor": metric.processor,
                    "model": metric.model,
                    "duration_secs": metric.duration_secs,
                }
                for metric in breakdown.ttfb
            ],
            "text_aggregation_secs": (
                breakdown.text_aggregation.duration_secs
                if breakdown.text_aggregation is not None
                else None
            ),
        }
        logger.info("LATENCY breakdown={}", payload)
        if self._sink:
            await self._sink("latency_breakdown", payload)

    async def _emit(self, name: str, now: float) -> None:
        since_turn_start_ms = (
            round((now - self._turn_started_at) * 1000, 1) if self._turn_started_at else None
        )
        since_user_stop_ms = (
            round((now - self._user_stopped_at) * 1000, 1) if self._user_stopped_at else None
        )
        payload = {
            "name": name,
            "since_turn_start_ms": since_turn_start_ms,
            "since_user_stop_ms": since_user_stop_ms,
        }
        logger.info("TIMING {}", payload)
        if self._sink:
            await self._sink("timing", payload)
