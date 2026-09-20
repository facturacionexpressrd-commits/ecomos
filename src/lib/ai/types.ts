export interface AIGeneratedContent {
  headline: string;
  description: string;
  bulletPoints: string[];
  seoKeywords: string[];
  confidence: number; // 0-1 confidence score
}

export interface AIProvider {
  name: string;
  generateProductCopy(input: {
    productTitle: string;
    productDescription?: string;
    productCategory?: string;
    targetAudience?: string;
    toneOfVoice?: string;
  }): Promise<AIGeneratedContent>;

  generateHeadline(input: {
    productTitle: string;
    productCategory?: string;
  }): Promise<string>;

  generateDescription(input: {
    productTitle: string;
    features?: string[];
    benefits?: string[];
    targetAudience?: string;
  }): Promise<string>;
}

export interface AIProviderConfig {
  provider: string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}
