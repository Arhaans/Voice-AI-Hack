from __future__ import annotations

from typing import Any

from pipecat.processors.frameworks.rtvi import RTVIServerMessageFrame


async def send_server_event(task, event_type: str, payload: dict[str, Any]) -> None:
    await task.rtvi.push_frame(
        RTVIServerMessageFrame(
            data={
                "type": event_type,
                **payload,
            }
        )
    )
