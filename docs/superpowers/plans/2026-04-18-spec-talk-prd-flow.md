# SpecTalk PRD Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adapt the existing voice recruiter demo into a voice product strategist that generates a markdown PRD after the session ends.

**Architecture:** Keep the existing Pipecat voice pipeline intact, swap the recruiter persona for a product strategist, preserve the live transcript UI, add a second full transcript buffer in the frontend hook, and add one Next.js server route that sends the full transcript to Anthropic and returns markdown. The existing single-screen UI remains the shell for both the call and the generated result.

**Tech Stack:** Next.js App Router, React, TypeScript, Python, Pipecat, Anthropic Messages API, Tailwind

---

### Task 1: Update backend strategist persona

**Files:**
- Modify: `backend/app/prompts.py`

- [ ] Replace recruiter-specific role context, system prompt, and greeting with a concise product strategist persona that asks one question at a time, follows up based on prior answers, and targets idea, users, pain point, MVP, metrics, and constraints.

### Task 2: Extend transcript handling in the existing frontend hook

**Files:**
- Modify: `frontend/src/hooks/use-pipecat-interview.ts`

- [ ] Keep the current capped transcript list for the live UI.
- [ ] Add a full transcript store with speaker labels that accumulates all final turns across the session.
- [ ] Expose `getFullTranscript()` and `clearFullTranscript()` from the hook.
- [ ] Reset transcript state when a new session starts without clearing it on disconnect before PRD generation.

### Task 3: Add PRD generation route

**Files:**
- Create: `frontend/src/app/api/generate-prd/route.ts`
- Modify: `frontend/.env.local.example`

- [ ] Add a server route that validates the transcript payload, calls Anthropic Haiku with a PRD-generation prompt, and returns `{ markdown }`.
- [ ] Reuse `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` env names so the provider pattern stays aligned with the backend.

### Task 4: Extend the existing UI for end-session generation and result display

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/components/ui/voice-chat.tsx`

- [ ] Add end-session handling that disconnects, gathers the full transcript, POSTs to `/api/generate-prd`, and tracks `idle`, `connected`, `generating`, `result`, and `error` UI states.
- [ ] Rebrand visible copy from recruiter language to product strategist language.
- [ ] Render the generated markdown in the existing screen and add copy, download, and start-new-session actions.

### Task 5: Verify the implementation

**Files:**
- Verify only

- [ ] Run `python -m compileall backend`
- [ ] Run `pnpm --dir frontend exec tsc --noEmit`
- [ ] Run `pnpm --dir frontend build`
- [ ] Review the diff and list any remaining env/setup requirements.
