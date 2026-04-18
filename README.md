# Talk Your Idea Into a PRD

> Voice-first product discovery. Talk to Vincent, your AI product strategist, and get an implementation-ready PRD in minutes.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.12-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)

## What is this?

A real-time voice AI that interviews you about your product idea — like talking to a sharp senior PM — then generates a professional Product Requirements Document you can hand directly to an engineer or paste into Claude/GPT for implementation.

**Built for the Pipecat Voice AI Hackathon.**

## Demo Flow

1. Click "Start Session" and describe your product idea
2. Vincent asks smart follow-up questions, challenges weak assumptions, and pushes for specifics
3. When you're done, click "End Session"
4. Get a beautifully formatted PRD with user stories, acceptance criteria, and technical constraints
5. One-click "Copy Claude Prompt" to continue building with AI

## Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15, React, TypeScript, Tailwind, Three.js (PlasmaVisualizer) |
| **Backend** | Python 3.12, Pipecat |
| **Transport** | SmallWebRTC (browser ↔ bot) |
| **STT** | Deepgram Nova-3 (streaming) |
| **LLM** | Anthropic Claude Haiku |
| **TTS** | Gradium / ElevenLabs Flash |
| **PRD Generation** | Anthropic Claude (async) |

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── config.py          # Environment & settings
│   │   ├── pipeline.py        # Pipecat pipeline (STT → LLM → TTS)
│   │   ├── prompts.py         # Vincent's system prompt
│   │   ├── client_events.py   # WebRTC event handling
│   │   └── instrumentation.py # Latency tracking
│   ├── bot.py                 # Entry point
│   └── pyproject.toml
├── frontend/
│   ├── src/app/
│   │   ├── page.tsx           # Home dashboard
│   │   ├── session/page.tsx   # Voice session page
│   │   └── api/generate-prd/  # PRD generation endpoint
│   ├── src/components/ui/
│   │   └── voice-chat.tsx     # Main UI component
│   └── src/hooks/
│       └── use-pipecat-interview.ts
└── README.md
```

## Quick Start

### Prerequisites

- macOS or Linux
- Python 3.12 (via conda)
- Node.js 18+ & pnpm
- API keys: Deepgram, Anthropic, ElevenLabs or Gradium

### 1. Backend Setup

```bash
# Create conda environment
conda create -n voice-ai-hack python=3.12
conda activate voice-ai-hack

# Install backend
pip install -e ./backend

# Create .env
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```bash
DEEPGRAM_API_KEY=your-key
ANTHROPIC_API_KEY=your-key

# Choose one TTS provider:
TTS_PROVIDER=gradium  # or "elevenlabs"

# If using Gradium:
GRADIUM_API_KEY=your-key
GRADIUM_VOICE_ID=your-voice-id

# If using ElevenLabs:
ELEVENLABS_API_KEY=your-key
ELEVENLABS_VOICE_ID=your-voice-id
```

Start the backend:

```bash
conda activate voice-ai-hack
python backend/bot.py -t webrtc --host 127.0.0.1 --port 7860
```

### 2. Frontend Setup

```bash
cd frontend
pnpm install

# Create .env.local
echo "NEXT_PUBLIC_PIPECAT_BASE_URL=http://localhost:7860" > .env.local
echo "ANTHROPIC_API_KEY=your-key" >> .env.local

pnpm dev
```

Open http://localhost:3000

## Features

### Vincent — Your AI Product Strategist

- **Sharp & Direct** — Challenges vague ideas, pushes for specifics
- **Anti-Form Behavior** — Never feels like a questionnaire
- **Natural Conversation** — Reacts with substance, not sycophancy
- **Structured Discovery** — Covers vision, product flow, and technical constraints

### PRD Generation

- **Anti-Compression** — Captures every detail, never summarizes away nuance
- **User Stories** — Decomposed into buildable pieces with acceptance criteria
- **Anti-Scope** — Explicitly lists what's NOT in the MVP
- **Claude-Ready** — One-click copy with implementation prompt

### Voice UI

- **PlasmaVisualizer** — Three.js reactive audio visualization
- **Live Transcript** — See the conversation in real-time
- **Debug Panel** — Timing events, latency breakdown
- **Download/Copy** — Export PRD as markdown

## Architecture

```
Browser                    Backend                      Services
┌─────────────┐           ┌─────────────┐              ┌──────────┐
│  Next.js    │◄─WebRTC──►│   Pipecat   │◄──────────►│ Deepgram │
│  Frontend   │           │   Pipeline  │              │  (STT)   │
└─────────────┘           └─────────────┘              └──────────┘
      │                         │                      ┌──────────┐
      │                         ├─────────────────────►│ Anthropic│
      │                         │                      │  (LLM)   │
      │                         │                      └──────────┘
      │                         │                      ┌──────────┐
      │                         └─────────────────────►│ Gradium/ │
      │                                                │ 11Labs   │
      │                                                │  (TTS)   │
      │                                                └──────────┘
      │
      ▼
┌─────────────┐
│ /api/       │◄─────────────────────────────────────►┌──────────┐
│ generate-prd│                                       │ Anthropic│
└─────────────┘                                       │  (PRD)   │
                                                      └──────────┘
```

## Configuration

### Backend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEEPGRAM_API_KEY` | ✅ | — | STT API key |
| `ANTHROPIC_API_KEY` | ✅ | — | LLM API key |
| `TTS_PROVIDER` | ✅ | `elevenlabs` | `gradium` or `elevenlabs` |
| `GRADIUM_API_KEY` | If gradium | — | Gradium TTS key |
| `GRADIUM_VOICE_ID` | If gradium | — | Gradium voice ID |
| `ELEVENLABS_API_KEY` | If elevenlabs | — | ElevenLabs key |
| `ELEVENLABS_VOICE_ID` | If elevenlabs | — | ElevenLabs voice ID |
| `ANTHROPIC_MODEL` | ❌ | `claude-3-haiku-20240307` | Model for voice |

### Frontend Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_PIPECAT_BASE_URL` | ✅ | Backend URL (default: `http://localhost:7860`) |
| `ANTHROPIC_API_KEY` | ✅ | For PRD generation |

## Team

Built by **Arhaan** and **Vishal** for the Pipecat Voice AI Hackathon 2026.

## License

MIT
