import { ExecutiveAssistantInput } from "./types";

export class ExecutiveAssistant {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "claude-opus-5") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateExplanation(
    input: ExecutiveAssistantInput
  ): Promise<string> {
    const prompt = this.buildExecutivePrompt(input);
    return this.callClaude(prompt);
  }

  private buildExecutivePrompt(input: ExecutiveAssistantInput): string {
    const financialImpact = input.estimatedImpact.financialImpact
      ? `Financial Impact: ${input.estimatedImpact.financialImpact > 0 ? "+" : ""}$${input.estimatedImpact.financialImpact.toFixed(2)}`
      : "";

    const timelineImpact = input.estimatedImpact.timelineImpact
      ? `Timeline: ${input.estimatedImpact.timelineImpact}`
      : "";

    const dataContext = Object.entries(input.data)
      .map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`)
      .join("\n");

    return `You are an Executive Assistant. Explain this business recommendation to the CEO/CFO in clear, concise language.

Recommendation: ${input.title}
Action Type: ${input.actionType}
Confidence: ${(input.confidenceScore * 100).toFixed(0)}%
Priority: ${input.priority}
Risk Level: ${input.estimatedImpact.riskLevel}

${financialImpact}
${timelineImpact}

Description: ${input.description}

Reasoning: ${input.reasoning}

Data:
${dataContext}

Write a 2-3 sentence explanation that:
1. Summarizes what action is being recommended
2. Explains the business value or impact
3. Highlights any risks or concerns

Use business language. Be direct and actionable. Focus on the "why" not the "how".`;
  }

  private async callClaude(prompt: string): Promise<string> {
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

    return content.text;
  }
}
