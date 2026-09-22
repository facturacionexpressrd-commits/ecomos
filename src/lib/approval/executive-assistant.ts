import { ExecutiveAssistantInput } from "./types";
import { verify, factsFromData, type Fact, type ClaimedAnswer } from "@/lib/ai/verify";

export class WithheldExplanationError extends Error {
  constructor(readonly violations: string[]) {
    super(`Executive explanation withheld: ${violations.join("; ")}`);
  }
}

export class ExecutiveAssistant {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "claude-opus-5") {
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Throws WithheldExplanationError if the model states a figure it can't
   * back with a fact this codebase actually computed, rather than returning
   * unverified prose about money.
   */
  async generateExplanation(input: ExecutiveAssistantInput): Promise<string> {
    const facts = buildFacts(input);
    const prompt = this.buildExecutivePrompt(input, facts);
    const answer = await this.callClaude(prompt);

    const result = verify(answer, facts);
    if (!result.ok) throw new WithheldExplanationError(result.violations);
    return answer.text;
  }

  private buildExecutivePrompt(input: ExecutiveAssistantInput, facts: Fact[]): string {
    const timelineImpact = input.estimatedImpact.timelineImpact
      ? `Timeline: ${input.estimatedImpact.timelineImpact}`
      : "";

    const factList = facts.map((f) => `- ${f.id}: ${f.label} = ${f.value}`).join("\n");

    return `You are an Executive Assistant. Explain this business recommendation to the CEO/CFO in clear, concise language.

Recommendation: ${input.title}
Action Type: ${input.actionType}
Description: ${input.description}
Reasoning: ${input.reasoning}
${timelineImpact}

Known facts — the ONLY numbers you may state (cite each by id, do not compute new ones):
${factList}

Write a 2-3 sentence explanation that:
1. Summarizes what action is being recommended
2. Explains the business value or impact
3. Highlights any risks or concerns

Use business language. Be direct and actionable. Focus on the "why" not the "how".

Respond with ONLY this JSON shape, no other text:
{"explanation": "...", "citations": [{"factId": "...", "value": ...}]}
List one citation per fact your explanation states a number for.`;
  }

  private async callClaude(prompt: string): Promise<ClaimedAnswer> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Claude API error: ${error.error?.message || "Unknown error"}`
      );
    }

    const data = await response.json();
    const content = data.content?.[0];

    if (!content || content.type !== "text") {
      throw new Error("Invalid response from Claude API");
    }

    let parsed: { explanation?: unknown; citations?: unknown };
    try {
      parsed = JSON.parse(content.text);
    } catch {
      throw new Error("Claude did not return valid JSON");
    }
    if (typeof parsed.explanation !== "string" || !Array.isArray(parsed.citations)) {
      throw new Error("Claude's response is missing explanation or citations");
    }

    return { text: parsed.explanation, citations: parsed.citations as ClaimedAnswer["citations"] };
  }
}

function buildFacts(input: ExecutiveAssistantInput): Fact[] {
  const facts: Fact[] = [
    { id: "confidence_pct", label: "confidence, as a percent", value: Math.round(input.confidenceScore * 100) },
  ];
  if (input.estimatedImpact.financialImpact !== undefined) {
    facts.push({ id: "financial_impact", label: "financial impact in USD", value: input.estimatedImpact.financialImpact });
  }
  facts.push(...factsFromData(input.data));
  return facts;
}
