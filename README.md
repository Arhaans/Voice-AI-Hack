# Voice AI Recruiter

Real-time local demo of an AI recruiter running a natural screening conversation over voice.

The product is intentionally narrow:

- thin Next.js frontend
- Python Pipecat backend
- low-latency browser-to-bot audio with SmallWebRTC
- streaming STT, LLM, and TTS
- premium single-screen voice UI

## Demo

The current use case is a recruiter-style screening conversation.

The bot is designed to:

- sound warm, confident, and conversational
- ask one question at a time
- ask relevant follow-up questions
- maintain context across the conversation
- make at least one natural memory callback
- stay concise enough for a strong 60-90 second recording

## Stack

- Frontend: Next.js + TypeScript + Tailwind
- Backend: Python + Pipecat
- Transport: SmallWebRTC
- STT: Deepgram Nova-3 streaming over WebSocket
- LLM: Anthropic Claude via configurable model ID
- TTS: ElevenLabs Flash streaming

## Project Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── client_events.py
│   │   ├── config.py
│   │   ├── instrumentation.py
│   │   ├── pipeline.py
│   │   └── prompts.py
│   ├── bot.py
│   └── pyproject.toml
├── frontend/
│   ├── src/app/
│   ├── src/components/ui/
│   ├── src/hooks/
│   ├── src/lib/
│   └── package.json
└── README.md
```

## How It Works

1. The browser opens the Next.js app and requests microphone access.
2. The frontend connects to the Pipecat backend over SmallWebRTC.
3. User audio streams to Deepgram for real-time transcription.
4. Pipecat maintains conversation state and sends the transcript to Anthropic.
5. Anthropic streams the recruiter response.
6. ElevenLabs starts speaking the response as soon as useful text is available.
7. Audio returns to the browser over WebRTC while transcript and timing events update the UI.

## Requirements

- macOS or Linux
- `conda`
- `pnpm`
- API keys for:
  - Deepgram
  - Anthropic
  - ElevenLabs

## Backend Setup

Always use a dedicated conda environment for the backend.

```bash
conda create -n voice-interviewer-demo python=3.12
conda activate voice-interviewer-demo
pip install -e ./backend
```

Create the backend env file:

```bash
cp backend/.env.example backend/.env
```

Required values:

```bash
DEEPGRAM_API_KEY=...
ANTHROPIC_API_KEY=...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...
```

Optional overrides:

```bash
ANTHROPIC_MODEL=claude-3-haiku-20240307
DEEPGRAM_MODEL=nova-3
ELEVENLABS_MODEL=eleven_flash_v2_5
```

Notes:

- `ELEVENLABS_VOICE_ID` must be a voice ID that actually exists for the ElevenLabs account behind your API key.
- `ANTHROPIC_MODEL` should be set to a model ID your Anthropic account can access.

Run the backend:

```bash
conda activate voice-interviewer-demo
cd /Users/arhaan/Demo/backend
python bot.py -t webrtc --host 127.0.0.1 --port 7860
```

The Pipecat runner serves:

- `http://127.0.0.1:7860/api/offer`
- `http://127.0.0.1:7860/client`

## Frontend Setup

Create the frontend env file if needed:

```bash
cd /Users/arhaan/Demo/frontend
cp .env.local.example .env.local
```

Install and run:

```bash
cd /Users/arhaan/Demo/frontend
pnpm install
pnpm dev
```

Open:

```bash
http://localhost:3000
```

The frontend uses `http://localhost:7860` by default.

## Recording Notes

For the best demo take:

- keep candidate answers short and concrete
- let the recruiter finish one question before answering
- aim for 4-6 total turns
- use a real ElevenLabs voice from your account
- use an Anthropic model that your account can access

## Latency Notes

The demo is tuned for low perceived latency:

- streaming STT with interim handling
- interruption-friendly turn detection
- streaming LLM output
- token-level TTS aggregation
- backend timing instrumentation for STT, LLM, and TTS stages

## Development Notes

- The backend owns prompt behavior, orchestration, timing, and transport.
- The frontend stays intentionally thin and mostly renders session state.
- Use-case swaps are mostly isolated to `backend/app/prompts.py` and a small amount of UI copy.
