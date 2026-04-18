from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv


load_dotenv()


@dataclass(frozen=True)
class Settings:
    deepgram_api_key: str
    anthropic_api_key: str
    elevenlabs_api_key: str
    elevenlabs_voice_id: str
    anthropic_model: str = "claude-3-haiku-20240307"
    deepgram_model: str = "nova-3"
    elevenlabs_model: str = "eleven_flash_v2_5"

    @classmethod
    def from_env(cls) -> "Settings":
        values = {
            "deepgram_api_key": os.getenv("DEEPGRAM_API_KEY", "").strip(),
            "anthropic_api_key": os.getenv("ANTHROPIC_API_KEY", "").strip(),
            "elevenlabs_api_key": os.getenv("ELEVENLABS_API_KEY", "").strip(),
            "elevenlabs_voice_id": os.getenv("ELEVENLABS_VOICE_ID", "").strip(),
            "anthropic_model": os.getenv("ANTHROPIC_MODEL", "claude-3-haiku-20240307").strip()
            or "claude-3-haiku-20240307",
            "deepgram_model": os.getenv("DEEPGRAM_MODEL", "nova-3").strip() or "nova-3",
            "elevenlabs_model": os.getenv("ELEVENLABS_MODEL", "eleven_flash_v2_5").strip()
            or "eleven_flash_v2_5",
        }
        required_keys = {
            "deepgram_api_key",
            "anthropic_api_key",
            "elevenlabs_api_key",
            "elevenlabs_voice_id",
        }
        missing = [name.upper() for name, value in values.items() if name in required_keys and not value]
        if missing:
            raise RuntimeError(
                "Missing required backend env vars: " + ", ".join(sorted(missing))
            )

        return cls(**values)
