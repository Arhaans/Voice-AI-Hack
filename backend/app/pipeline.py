from __future__ import annotations

import asyncio

from loguru import logger

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.frames.frames import TTSSpeakFrame
from pipecat.observers.user_bot_latency_observer import UserBotLatencyObserver
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.services.anthropic.llm import AnthropicLLMService
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.elevenlabs.tts import ElevenLabsTTSService
from pipecat.services.tts_service import TextAggregationMode

from app.client_events import send_server_event
from app.config import Settings
from app.instrumentation import TurnTimingProbe
from app.prompts import INTERVIEWER_SYSTEM_PROMPT, OPENING_GREETING


async def run_voice_pipeline(transport, settings: Settings) -> None:
    stt = DeepgramSTTService(
        api_key=settings.deepgram_api_key,
        settings=DeepgramSTTService.Settings(
            model=settings.deepgram_model,
            interim_results=True,
            punctuate=True,
            smart_format=True,
            endpointing=120,
        ),
    )

    llm = AnthropicLLMService(
        api_key=settings.anthropic_api_key,
        settings=AnthropicLLMService.Settings(
            model=settings.anthropic_model,
            system_instruction=INTERVIEWER_SYSTEM_PROMPT,
            max_tokens=180,
            temperature=0.3,
        ),
    )

    tts = ElevenLabsTTSService(
        api_key=settings.elevenlabs_api_key,
        settings=ElevenLabsTTSService.Settings(
            voice=settings.elevenlabs_voice_id,
            model=settings.elevenlabs_model,
            speed=1.08,
            stability=0.25,
            similarity_boost=0.8,
        ),
        auto_mode=False,
        text_aggregation_mode=TextAggregationMode.TOKEN,
    )

    context = LLMContext(messages=[])
    context_aggregator = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(
            user_turn_stop_timeout=0.45,
        ),
    )

    timing_probe = TurnTimingProbe()
    latency_observer = UserBotLatencyObserver()

    pipeline = Pipeline(
        [
            transport.input(),
            stt,
            timing_probe,
            context_aggregator.user(),
            llm,
            tts,
            transport.output(),
            context_aggregator.assistant(),
        ]
    )

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            allow_interruptions=True,
            audio_in_sample_rate=16000,
            audio_out_sample_rate=24000,
            enable_metrics=True,
            enable_usage_metrics=True,
            report_only_initial_ttfb=False,
        ),
        observers=[latency_observer],
    )

    async def emit_server_event(event_type: str, payload: dict) -> None:
        await send_server_event(task, event_type, payload)

    timing_probe.bind_sink(emit_server_event)

    @task.rtvi.event_handler("on_client_ready")
    async def on_client_ready(_rtvi) -> None:
        await task.queue_frame(TTSSpeakFrame(OPENING_GREETING))

    @task.event_handler("on_pipeline_error")
    async def on_pipeline_error(_task, frame) -> None:
        logger.error("Pipeline error: {}", getattr(frame, "error", frame))
        await emit_server_event(
            "pipeline_error",
            {"message": str(getattr(frame, "error", "Unknown pipeline error"))},
        )

    @latency_observer.event_handler("on_latency_measured")
    async def on_latency_measured(_observer, latency_seconds: float) -> None:
        logger.info("LATENCY user_to_first_bot_speech_ms={}", round(latency_seconds * 1000, 1))
        await emit_server_event(
            "latency_summary",
            {"user_to_first_bot_speech_ms": round(latency_seconds * 1000, 1)},
        )

    @latency_observer.event_handler("on_latency_breakdown")
    async def on_latency_breakdown(_observer, breakdown) -> None:
        await timing_probe.emit_latency_breakdown(breakdown)

    runner = PipelineRunner()
    await runner.run(task)


def build_vad_analyzer() -> SileroVADAnalyzer:
    return SileroVADAnalyzer(
        sample_rate=16000,
        params=VADParams(
            confidence=0.7,
            start_secs=0.1,
            stop_secs=0.2,
            min_volume=0.45,
        ),
    )
