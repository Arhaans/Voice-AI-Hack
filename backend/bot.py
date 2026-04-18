from __future__ import annotations

from loguru import logger

from pipecat.runner.run import main
from pipecat.runner.types import RunnerArguments, SmallWebRTCRunnerArguments
from pipecat.transports.base_transport import TransportParams
from pipecat.transports.smallwebrtc.transport import SmallWebRTCTransport

from app.config import Settings
from app.pipeline import build_vad_analyzer, run_voice_pipeline


async def bot(runner_args: RunnerArguments) -> None:
    if not isinstance(runner_args, SmallWebRTCRunnerArguments):
        raise RuntimeError(f"Unsupported runner args for local demo: {type(runner_args)}")

    settings = Settings.from_env()

    transport = SmallWebRTCTransport(
        webrtc_connection=runner_args.webrtc_connection,
        params=TransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            vad_analyzer=build_vad_analyzer(),
        ),
    )

    logger.info("Deepgram streaming STT is implemented in backend/app/pipeline.py via DeepgramSTTService.")
    await run_voice_pipeline(transport, settings)


if __name__ == "__main__":
    main()
