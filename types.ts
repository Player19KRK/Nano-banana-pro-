
export enum AspectRatio {
  Square = "1:1",
  Ratio_3_2 = "3:2",
  Ratio_2_3 = "2:3",
  Ratio_4_3 = "4:3",
  Ratio_3_4 = "3:4",
  Ratio_4_5 = "4:5",
  Ratio_5_4 = "5:4",
  Ratio_16_9 = "16:9",
  Ratio_9_16 = "9:16",
  Ratio_16_10 = "16:10",
  Ratio_10_16 = "10:16",
  Ratio_21_9 = "21:9",
  Ratio_9_21 = "9:21",
  Custom = "custom",
}

export enum ImageSize {
  Size_1K = "1K",
  Size_2K = "2K",
  Size_4K = "4K",
}

export enum AIModel {
  Standard = "gemini-2.5-flash-image",
  NanoBanana2 = "gemini-3.1-flash-image-preview",
  Pro = "gemini-3-pro-image-preview",
}

export interface GenerationStep {
  id: string;
  name: string;
  duration: number | null;
  status: 'pending' | 'active' | 'done';
}

// JsonPromptMaker System Interfaces
export interface PromptSource {
  value?: string;
  allowed_sources?: string[];
  source_policy?: string;
}

export interface JsonPromptPayload {
  task: string;
  reference_image_policy: {
    used: boolean;
    represents: string;
    instructions: string[];
  };
  subject: {
    type: string;
    identity_lock?: Record<string, string>;
    pose: PromptSource;
    expression: PromptSource;
    gaze?: PromptSource;
  };
  appearance?: {
    clothing?: PromptSource;
    colors?: { primary_palette: PromptSource };
  };
  environment: {
    location: PromptSource;
    details: PromptSource;
    time_of_day: PromptSource;
    weather?: PromptSource;
  };
  camera: {
    framing: PromptSource;
    angle: PromptSource;
    lens_feel: PromptSource;
  };
  lighting: {
    type: PromptSource;
    direction: PromptSource;
    intensity: PromptSource;
  };
  style: {
    render_type: PromptSource;
  };
  quality_controls: {
    forbidden_changes: string[];
  };
}

export type OptimizationMode = 'standard' | 'aggressive';

export interface JsonPromptData {
  prompt_payload?: JsonPromptPayload;
  optimized_prompt?: string;
  detected_task?: string;
  mode?: OptimizationMode;
  file_name_cn: string;
  prompt_translation_cn: string;
}

export interface GeneratedImage {
  id: string;
  batchId: string;
  url: string;
  prompt: string;
  refinedPrompt?: string; // Stores the JSON string used for generation
  promptTranslation?: string; // Stores the Chinese translation
  structuraData?: JsonPromptData; // Stores the full structured object
  filename: string;
  timestamp: number;
  totalDuration: number;
  thoughtLog: GenerationStep[];
  costRMB: number;
  costUSD: number;
}

export interface GeneratedBatch {
  id: string;
  images: GeneratedImage[];
  timestamp: number;
  totalCostRMB: number;
  totalCostUSD: number;
}

export interface EditingImage {
  url: string;
  name: string;
  type: 'generated' | 'local';
}

export type Currency = 'RMB' | 'USD';
