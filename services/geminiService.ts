
import { GoogleGenAI, Type, Schema, ThinkingLevel } from "@google/genai";
import { AspectRatio, ImageSize, AIModel, JsonPromptData, OptimizationMode } from "../types";

const fileToPart = async (file: File | Blob): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const base64Data = reader.result.split(',')[1];
        const mimeType = file.type || 'image/png';
        resolve({
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        });
      } else {
        reject(new Error("读取数据失败"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * 严格遵循官方针对 gemini-3-pro-image-preview 提供的标准比例字符串
 */
const mapToOfficialRatio = (ratio: AspectRatio): string => {
  switch (ratio) {
    case AspectRatio.Square: return "1:1";
    case AspectRatio.Ratio_21_9: return "21:9";
    case AspectRatio.Ratio_16_9: return "16:9";
    case AspectRatio.Ratio_4_3: return "4:3";
    case AspectRatio.Ratio_3_2: return "3:2";
    case AspectRatio.Ratio_5_4: return "5:4";
    case AspectRatio.Ratio_9_16: return "9:16";
    case AspectRatio.Ratio_3_4: return "3:4";
    case AspectRatio.Ratio_2_3: return "2:3";
    case AspectRatio.Ratio_4_5: return "4:5";
    case AspectRatio.Ratio_9_21: return "9:21";
    case AspectRatio.Ratio_16_10: return "16:9";
    case AspectRatio.Ratio_10_16: return "9:16";
    default: return "1:1";
  }
};

/**
 * Nano Banana Pro Prompt Optimizer 核心规范 System Prompt
 * 遵循官方 Prompt Compiler 规范，将用户原始提示词编译为高质量、面向 Nano Banana Pro 的纯正英文 Prompt。
 */
const NANO_BANANA_PRO_OPTIMIZER_SYS = `
You are the official Prompt Optimizer for Nano Banana Pro (Gemini 3 Pro Image / Nano Banana Pro engine).
Your role is a prompt compiler, NOT a general conversational assistant.

PURPOSE:
Optimize an existing user-provided image prompt or creative draft into a final high-performance English prompt that can be sent directly to Nano Banana Pro.

OUTPUT POLICY:
1. The final output must be an English prompt ready for Nano Banana Pro.
2. Default output ONLY the optimized prompt in plain text inside the JSON schema. Do not output explanations, analysis, or optimization reasoning.
3. No conversational preamble or postscript.

MODES:
1. Standard Optimization (Default):
   - Preserve the user's original visual concept closely.
   - You may rewrite sentences completely, reorganize information by priority, eliminate redundancy, resolve contradictions, clarify vague visual language, add professional camera and lighting logic, improve material descriptions, and add useful quality constraints.
   - Do NOT substantially change the user's concept.

2. Aggressive Optimization:
   - Preserve the core creative goal and all explicit constraints, but allow significantly greater reconstruction of:
     composition, visual hierarchy, camera setup, lighting design, material treatment, environmental details, presentation strategy, and rendering approach.
   - Explicit user constraints still remain strictly protected.

INTENT LOCK (PROTECTED CONSTRAINTS):
Treat the following as locked when explicitly specified by the user:
- Main subject & product identity
- Number of subjects, poses, and actions
- Colors, materials, and physical structure
- Environment and scene setting
- Viewpoint, camera angle, and framing
- Time of day and lighting direction
- Visible text (keep exact words in quotation marks)
- Logo or typography requirements
- Reference image relationships, @mentions, and roles
Never casually replace explicit instructions with something that merely looks aesthetically pleasing. Improve around them.

INSTRUCTION PRIORITY:
1. Explicit user intent
2. Explicit preservation requirements
3. Reference-image fidelity requirements
4. Core task objective
5. Structural and physical coherence
6. Style direction
7. Quality enhancement
8. Inferred details
9. Decorative embellishment

AUTOMATIC TASK CLASSIFICATION & ADAPTATION:
Identify the primary task type and activate corresponding optimization logic:
- Photorealistic Photography: Use real optical concepts (camera position, height, focal length, depth of field, natural highlight rolloff, shadow behavior, believable subtle surface microtextures) rather than empty realism buzzwords.
- Commercial Product Photography: Immediate product recognition, accurate proportions, clear silhouette, controlled reflections, material readability, refined highlights, intentional shadow design, clean subject-background separation, commercial advertising finish.
- Product Design Visualization: Functional geometry, realistic dimensions, manufacturing plausibility, coherent joints/transitions. Convert abstract ergonomic words into visible geometry (e.g. grip zones, finger support, waist curvature).
- High-End 3D Rendering: Coherent geometry, precision bevels, material shaders, roughness, translucency, subsurface scattering, contact shadows.
- Graphic Design & Typography: Layout hierarchy, typography, alignment, negative space, exact text in quotation marks (e.g. Headline: "TEXT", Subhead: "TEXT"), crisp and fully legible lettering.
- Image Editing: Use explicit 4-part structure: Core Edit Goal, Changes to Make, Preserve (explicitly lock unchanged parts), Visual Integration, Reference Priority.
- Multi-Reference / Reference Images: When reference images are attached or referenced via @mentions, explicitly assign non-conflicting roles (e.g. Reference image 1 / @file is primary truth for geometry/proportions; Reference image 2 for surface material texture).
- Character Consistency: Facial identity, proportions, hairstyle, age, defining features.

BANNED CLICHÉS & FILLER WORDS:
- NEVER output generic prompt incantations: "masterpiece", "best quality", "award winning", "insane detail", "trending on ArtStation", "ultimate quality", "super quality", "8K masterpiece", "ultra mega detailed", "ultra HD".
- Translate vague words ("luxury", "futuristic", "cinematic", "premium", "elegant", "beautiful") into concrete visible characteristics (e.g. controlled studio rim light, brushed titanium finish, disciplined negative space).
- Parameter Discipline: Do not treat aspect ratio or resolution as prompt prose tricks. (If aspect ratio affects composition, express as compositional framing e.g. "composed for a wide panoramic framing with generous negative space").

PROMPT ARCHITECTURE:
- The optimized prompt should normally begin with one concise sentence defining the image objective (e.g., "Create a premium commercial product photograph of...").
- Organize remaining information into light semantic sections when helpful:
  Core Intent:
  Subject and Design:
  Scene and Composition:
  Materials and Surface Details:
  Camera and Lighting:
  Style and Visual Finish:
  Text Rendering:
  Reference Priority:
  Preserve:
  Changes to Make:
  Final Quality Constraints:
- Simple tasks should remain compact and direct. Complex tasks should become more structured.
`;

const nanoBananaOptimizerSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    optimized_prompt: {
      type: Type.STRING,
      description: "The compiled, high-performance English prompt ready to be sent directly to Nano Banana Pro. Plain text, starting with a concise objective sentence, followed by light semantic sections if applicable. No markdown code blocks, no analysis."
    },
    detected_task: {
      type: Type.STRING,
      description: "Identified primary task category (e.g. Commercial Product Photography, Photorealistic Photography, 3D Rendering, Image Editing, Graphic Design & Typography, etc.)"
    },
    file_name_cn: {
      type: Type.STRING,
      description: "Short clean slug or title for the image in Chinese or English (2-4 words)."
    },
    prompt_translation_cn: {
      type: Type.STRING,
      description: "Clear Chinese summary of the visual construction and creative intent."
    }
  },
  required: ["optimized_prompt", "detected_task", "file_name_cn", "prompt_translation_cn"]
};

/**
 * 独立的 Prompt Optimizer 编译函数，供 UI 一键优化调用
 */
export const optimizePromptStandalone = async (
  prompt: string = "",
  files: File[] = [],
  optimizationMode: OptimizationMode = 'standard',
  thinkingLevel: 'HIGH' | 'LOW' = 'HIGH'
): Promise<{
  optimizedPrompt: string;
  detectedTask: string;
  fileName: string;
  promptTranslation: string;
  structuraData: JsonPromptData;
}> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const safePrompt = prompt || "";

  const parts: any[] = [];
  if (files.length > 0) {
    const imageParts = await Promise.all(files.map(fileToPart));
    parts.push(...imageParts);
  }

  const userContentText = `
[OPTIMIZATION MODE]: ${optimizationMode === 'aggressive' ? 'Aggressive Optimization (深度重构模式)' : 'Standard Optimization (标准优化模式)'}

[USER RAW PROMPT]:
${safePrompt || "(Create an artistic image based on the provided reference images)"}

[ATTACHED REFERENCE IMAGES]:
${files.length > 0 ? files.map((f, idx) => `Reference image ${idx + 1}: "${f.name}" (${f.type || 'image/png'})`).join('\n') : "None"}

[COMPILE DIRECTIVE]:
Compile this into a high-performance English prompt specifically for Nano Banana Pro following the ${optimizationMode === 'aggressive' ? 'Aggressive' : 'Standard'} Optimization rules.
Output valid JSON strictly adhering to the schema.
`;

  parts.push({ text: userContentText });

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: { parts },
    config: {
      systemInstruction: NANO_BANANA_PRO_OPTIMIZER_SYS,
      responseMimeType: "application/json",
      responseSchema: nanoBananaOptimizerSchema,
      seed: Math.floor(Math.random() * 2147483647),
      thinkingConfig: { thinkingLevel: thinkingLevel === 'HIGH' ? ThinkingLevel.HIGH : ThinkingLevel.LOW }
    }
  });

  const data = JSON.parse(response.text || "{}");
  const optimizedPrompt = (data.optimized_prompt || safePrompt).trim();
  const detectedTask = data.detected_task || "General Visual";
  const fileName = data.file_name_cn || "NanoArt";
  const promptTranslation = data.prompt_translation_cn || "优化成功";

  const structuraData: JsonPromptData = {
    optimized_prompt: optimizedPrompt,
    detected_task: detectedTask,
    mode: optimizationMode,
    file_name_cn: fileName,
    prompt_translation_cn: promptTranslation
  };

  return {
    optimizedPrompt,
    detectedTask,
    fileName,
    promptTranslation,
    structuraData
  };
};

export const analyzeAndName = async (
  prompt: string = "", 
  files: File[], 
  isSmartAnalysis: boolean,
  batchIndex: number = 0,
  totalBatch: number = 1,
  thinkingLevel: 'HIGH' | 'LOW' = 'HIGH',
  optimizationMode: OptimizationMode = 'standard'
): Promise<{ structuraData: JsonPromptData | null, refinedPrompt: string, fileName: string, promptTranslation: string }> => {
  const safePrompt = prompt || "";

  if (!isSmartAnalysis) {
    return {
      structuraData: null,
      refinedPrompt: safePrompt,
      fileName: `Direct-${Date.now()}`,
      promptTranslation: "直接生成（未启用优化）"
    };
  }

  try {
    const result = await optimizePromptStandalone(safePrompt, files, optimizationMode, thinkingLevel);
    return {
      structuraData: result.structuraData,
      refinedPrompt: result.optimizedPrompt,
      fileName: `${result.fileName}-${batchIndex + 1}`,
      promptTranslation: result.promptTranslation
    };
  } catch (e) {
    console.error("Nano Banana Pro Prompt Optimizer Failed:", e);
    return { 
      structuraData: null, 
      refinedPrompt: safePrompt, 
      fileName: `Error-${batchIndex + 1}`, 
      promptTranslation: "优化服务暂时异常，回退至原始提示词" 
    };
  }
};

export const generateSingleImage = async (
  prompt: string = "",
  inputFiles: (File | Blob)[],
  aspectRatio: AspectRatio,
  imageSize: ImageSize,
  model: AIModel,
  thinkingLevel: 'HIGH' | 'LOW' = 'HIGH'
): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [];
  
  if (inputFiles.length > 0) {
    const imageParts = await Promise.all(inputFiles.map(fileToPart));
    parts.push(...imageParts);
  }

  parts.push({ text: prompt });

  const apiRatio = mapToOfficialRatio(aspectRatio);

  const config: any = {
    imageConfig: {
      aspectRatio: apiRatio,
      ...(model !== AIModel.Standard ? { imageSize: imageSize } : {})
    },
    seed: Math.floor(Math.random() * 2147483647),
  };

  if (model === AIModel.NanoBanana2) {
    config.thinkingConfig = { thinkingLevel: thinkingLevel === 'HIGH' ? ThinkingLevel.HIGH : ThinkingLevel.LOW };
  }

  const response = await ai.models.generateContent({
    model: model,
    contents: { parts },
    config
  });

  const urls: string[] = [];
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData?.data) {
        urls.push(`data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`);
      }
    }
  }
  return urls;
};
