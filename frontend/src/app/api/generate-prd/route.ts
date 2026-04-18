import { NextResponse } from "next/server";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_ANTHROPIC_MODEL = "claude-3-haiku-20240307";

function createPrompt(transcript: string) {
  return `You are converting a product discovery conversation into a production-ready PRD. The PRD should be specific enough that a senior engineer could start building immediately without asking clarifying questions.

## TRANSCRIPT FROM DISCOVERY SESSION:
${transcript}

---

## OUTPUT FORMAT:

Generate a comprehensive PRD in markdown with the following sections. Be specific and concrete - avoid generic statements.

# [Product Name]
A clear, memorable name for the product/feature.

## Executive Summary
2-3 sentences. What is it, who is it for, and what's the core value proposition?

## Problem Statement
- What specific problem does this solve?
- Who experiences this problem and how often?
- What's the cost of not solving it (time, money, frustration)?

## Target Users
- Primary persona with specific characteristics
- Secondary personas if applicable
- Anti-personas (who is this NOT for)

## User Stories
Use the format: "As a [user type], I want [action] so that [benefit]"
- List 5-8 core user stories for MVP
- Prioritize: P0 (must have), P1 (should have), P2 (nice to have)

## MVP Scope
### In Scope
- Bullet list of specific features/capabilities included in v1
- Be precise about boundaries

### Out of Scope (for MVP)
- What are we explicitly NOT building in v1?
- Features to consider for v2+

## Functional Requirements
Specific, testable requirements. Use "The system shall..." format.
Group by feature area. Each requirement should be implementable without ambiguity.

Example:
- FR-1: The system shall allow users to create an account using email and password
- FR-2: The system shall send a verification email within 30 seconds of registration

## Non-Functional Requirements
- Performance: response times, throughput, concurrent users
- Security: authentication, authorization, data protection
- Scalability: expected load, growth projections
- Reliability: uptime requirements, error handling

## Data Model
Key entities and their relationships. Example:
- User: id, email, name, created_at
- Project: id, user_id (FK), title, description, status

## Key Screens / UI Flow
Describe the main screens and user flow. Be specific about what each screen shows and allows the user to do.

## Technical Recommendations
- Suggested tech stack with brief rationale
- Key architectural decisions
- Third-party services/APIs needed
- Infrastructure considerations

## Success Metrics
Specific, measurable KPIs. Example:
- 100 signups in first week
- 40% day-7 retention
- < 2 second page load time

## Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [specific risk] | High/Med/Low | High/Med/Low | [specific mitigation] |

## Open Questions
List any ambiguities from the transcript that need founder/stakeholder input before development.

## Implementation Prompt

Finally, generate a prompt that can be given to an AI coding assistant (like Claude) to implement this PRD. The prompt should:
- Set the role as a senior full-stack engineer
- Reference this PRD
- Instruct to build incrementally, starting with the core data model and working up to the UI
- Emphasize production-quality code with proper error handling, types, and tests

---

Remember: Be specific, not generic. Every requirement should be clear enough to implement without follow-up questions.`;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  const model = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ANTHROPIC_API_KEY for PRD generation." },
      { status: 500 },
    );
  }

  let body: { transcript?: unknown };

  try {
    body = (await request.json()) as { transcript?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
  if (!transcript) {
    return NextResponse.json({ error: "Transcript is required." }, { status: 400 });
  }

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        temperature: 0.3,
        system:
          "You are an elite product manager and technical architect. You transform product discovery conversations into comprehensive, implementation-ready PRDs. Your PRDs are known for being specific, actionable, and leaving no ambiguity for the engineering team. Output markdown only - no preamble or commentary.",
        messages: [
          {
            role: "user",
            content: createPrompt(transcript),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Anthropic request failed: ${response.status} ${errorText}` },
        { status: 500 },
      );
    }

    const data = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };

    const markdown = data.content
      ?.filter((item) => item.type === "text" && typeof item.text === "string")
      .map((item) => item.text?.trim() ?? "")
      .filter(Boolean)
      .join("\n\n");

    if (!markdown) {
      return NextResponse.json(
        { error: "Anthropic returned no markdown content." },
        { status: 500 },
      );
    }

    return NextResponse.json({ markdown });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected error while generating the PRD.",
      },
      { status: 500 },
    );
  }
}
