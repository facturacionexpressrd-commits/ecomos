import { AIProvider, AIGeneratedContent } from "../types";

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export class ClaudeAIProvider implements AIProvider {
  name = "claude";
  private apiKey: string;
  private model: string;
  private baseUrl: string = "https://api.anthropic.com/v1";

  constructor(apiKey: string, model: string = "claude-opus-5") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateProductCopy(input: {
    productTitle: string;
    productDescription?: string;
    productCategory?: string;
    targetAudience?: string;
    toneOfVoice?: string;
  }): Promise<AIGeneratedContent> {
    const prompt = this.buildProductCopyPrompt(input);
    const response = await this.callClaude(prompt);
    return this.parseProductCopyResponse(response);
  }

  async generateHeadline(input: {
    productTitle: string;
    productCategory?: string;
  }): Promise<string> {
    const prompt = `Generate a compelling, SEO-friendly headline for a ${input.productCategory || "product"} called "${input.productTitle}". The headline should be under 60 characters, engaging, and suitable for e-commerce product listings. Return only the headline.`;
    return this.callClaude(prompt);
  }

  async generateDescription(input: {
    productTitle: string;
    features?: string[];
    benefits?: string[];
    targetAudience?: string;
  }): Promise<string> {
    const featureList = input.features?.map((f) => `- ${f}`).join("\n") || "";
    const benefitList = input.benefits?.map((b) => `- ${b}`).join("\n") || "";
    const audience = input.targetAudience || "general audience";

    const prompt = `Write a compelling product description for "${input.productTitle}" aimed at ${audience}.

Features:
${featureList || "Not provided"}

Benefits:
${benefitList || "Not provided"}

Create a description that:
1. Starts with a hook about the main benefit
2. Covers key features
3. Addresses customer pain points
4. Includes a call-to-action
5. Is 150-200 words

Return only the description.`;

    return this.callClaude(prompt);
  }

  private buildProductCopyPrompt(input: {
    productTitle: string;
    productDescription?: string;
    productCategory?: string;
    targetAudience?: string;
    toneOfVoice?: string;
  }): string {
    const category = input.productCategory || "product";
    const audience = input.targetAudience || "general audience";
    const tone = input.toneOfVoice || "professional yet approachable";
    const existingDesc = input.productDescription
      ? `Existing description: ${input.productDescription}`
      : "";

    return `Generate e-commerce product copy for:
Product: "${input.productTitle}"
Category: ${category}
Target Audience: ${audience}
Tone: ${tone}
${existingDesc}

Return a JSON object with:
{
  "headline": "SEO-friendly headline (max 60 chars)",
  "description": "Product description (150-200 words)",
  "bulletPoints": ["Point 1", "Point 2", "Point 3"],
  "seoKeywords": ["keyword1", "keyword2", "keyword3"],
  "confidence": 0.85
}

Return ONLY valid JSON, no markdown formatting.`;
  }

  private parseProductCopyResponse(response: string): AIGeneratedContent {
    try {
      // Remove markdown code blocks if present
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith("```json")) {
        cleanedResponse = cleanedResponse.slice(7);
      }
      if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse.slice(3);
      }
      if (cleanedResponse.endsWith("```")) {
        cleanedResponse = cleanedResponse.slice(0, -3);
      }

      const parsed = JSON.parse(cleanedResponse.trim());
      return {
        headline: parsed.headline || "",
        description: parsed.description || "",
        bulletPoints: Array.isArray(parsed.bulletPoints)
          ? parsed.bulletPoints
          : [],
        seoKeywords: Array.isArray(parsed.seoKeywords)
          ? parsed.seoKeywords
          : [],
        confidence: typeof parsed.confidence === "number"
          ? parsed.confidence
          : 0.8,
      };
    } catch {
      throw new Error(`Failed to parse AI response: ${response}`);
    }
  }

  private async callClaude(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
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
      throw new Error(`Claude API error: ${error.error?.message || "Unknown error"}`);
    }

    const data = await response.json();
    const content = data.content?.[0];

    if (!content || content.type !== "text") {
      throw new Error("Invalid response from Claude API");
    }

    return content.text;
  }
}
