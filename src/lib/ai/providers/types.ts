export interface ImageGenerationInput {
  productTitle: string;
  productCategory?: string;
  concept: string; // "minimalist", "lifestyle", "product-focus", etc.
  style?: string; // "modern", "vintage", "professional", etc.
  aspectRatio?: "1:1" | "4:3" | "16:9"; // default 1:1
}

export interface GeneratedImage {
  url: string;
  concept: string;
  style: string;
  aspectRatio: string;
  prompt: string; // the actual prompt sent to generator
}

export interface VideoGenerationInput {
  productTitle: string;
  productCategory?: string;
  concept: string; // "unboxing", "demo", "lifestyle", "testimonial"
  duration: number; // seconds (15, 30, 60)
  style?: string;
}

export interface GeneratedVideo {
  url: string;
  concept: string;
  duration: number;
  prompt: string;
  thumbnailUrl?: string;
}

export interface HeadlineIdea {
  text: string;
  hook: string; // emotional trigger or curiosity hook
  cta: string; // call-to-action style
}

export interface CreativeIdea {
  headline: HeadlineIdea;
  concepts: {
    image: string;
    video: string;
  };
  targetAudience: string;
  emotionalApeals: string[];
}

export interface ImageGenerationProvider {
  name: string;
  generateImage(input: ImageGenerationInput): Promise<GeneratedImage>;
  supportedConcepts: string[];
  supportedStyles: string[];
}

export interface VideoGenerationProvider {
  name: string;
  generateVideo(input: VideoGenerationInput): Promise<GeneratedVideo>;
  supportedConcepts: string[];
  supportedDurations: number[];
}

export interface CreativeConceptProvider {
  name: string;
  generateConcepts(input: {
    productTitle: string;
    productDescription?: string;
    productCategory?: string;
    targetAudience?: string;
  }): Promise<CreativeIdea[]>;
}
