import { ClaudeAIProvider } from "./claude";
import { CreativeConceptProvider, CreativeIdea, HeadlineIdea } from "./types";

export class ClaudeCreativeProvider
  extends ClaudeAIProvider
  implements CreativeConceptProvider
{
  name = "claude-creative";

  async generateConcepts(input: {
    productTitle: string;
    productDescription?: string;
    productCategory?: string;
    targetAudience?: string;
  }): Promise<CreativeIdea[]> {
    const prompt = this.buildCreativeConceptPrompt(input);
    const response = await this.callClaude(prompt);
    return this.parseCreativeConceptResponse(response);
  }

  private buildCreativeConceptPrompt(input: {
    productTitle: string;
    productDescription?: string;
    productCategory?: string;
    targetAudience?: string;
  }): string {
    const category = input.productCategory || "product";
    const audience = input.targetAudience || "general audience";
    const description = input.productDescription || "";

    return `Generate 3 creative concepts for marketing "${input.productTitle}".

Category: ${category}
Target Audience: ${audience}
Description: ${description || "Not provided"}

For each concept, provide:
1. An attention-grabbing headline with a hook
2. Emotional appeals that resonate with the audience
3. Visual concept ideas (image and video themes)

Return a JSON array with exactly 3 concepts:
[
  {
    "headline": {
      "text": "Main headline (max 10 words)",
      "hook": "The emotional or curiosity hook",
      "cta": "Call to action style (e.g., 'urgency', 'curiosity', 'benefit')"
    },
    "concepts": {
      "image": "Visual concept for image (e.g., 'minimalist product shot on white background')",
      "video": "Visual concept for video (e.g., 'lifestyle unboxing with person enjoying product')"
    },
    "targetAudience": "Specific audience segment this resonates with",
    "emotionalApeals": ["appeal1", "appeal2", "appeal3"]
  }
]

Return ONLY the JSON array, no markdown or extra text.`;
  }

  private parseCreativeConceptResponse(response: string): CreativeIdea[] {
    try {
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

      if (!Array.isArray(parsed)) {
        throw new Error("Expected JSON array");
      }

      return parsed.map((concept) => ({
        headline: {
          text: concept.headline?.text || "",
          hook: concept.headline?.hook || "",
          cta: concept.headline?.cta || "",
        },
        concepts: {
          image: concept.concepts?.image || "",
          video: concept.concepts?.video || "",
        },
        targetAudience: concept.targetAudience || "",
        emotionalApeals: Array.isArray(concept.emotionalApeals)
          ? concept.emotionalApeals
          : [],
      }));
    } catch {
      throw new Error(`Failed to parse creative concepts: ${response}`);
    }
  }

}
