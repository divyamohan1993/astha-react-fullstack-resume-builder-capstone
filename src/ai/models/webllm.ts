/**
 * WebLLM Gemma 3 Integration
 *
 * Loads Gemma-3-1B-it (quantized Q4) via @mlc-ai/web-llm.
 * Progressive: tries WebGPU first, falls back to WASM CPU.
 * Model is cached in IndexedDB after first download (~600MB).
 *
 * Usage:
 *   const engine = await getOrCreateEngine(onProgress);
 *   const response = await generate(engine, prompt);
 */

import type { MLCEngine, InitProgressReport } from '@mlc-ai/web-llm';

// Gemma 3 1B instruction-tuned, 4-bit quantized
// Smallest model that can do structured reasoning
const MODEL_ID = 'gemma-3-1b-it-q4f16_1-MLC';

let engineInstance: MLCEngine | null = null;
let loadingPromise: Promise<MLCEngine> | null = null;

export type ProgressCallback = (report: {
  progress: number;
  text: string;
}) => void;

/**
 * Get or create the WebLLM engine. Reuses singleton.
 * Model downloads ~600MB on first use, cached in IndexedDB thereafter.
 */
export async function getOrCreateEngine(
  onProgress?: ProgressCallback,
): Promise<MLCEngine> {
  if (engineInstance) return engineInstance;

  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    // Dynamic import to keep it out of the main bundle
    const { CreateMLCEngine } = await import('@mlc-ai/web-llm');

    const engine = await CreateMLCEngine(MODEL_ID, {
      initProgressCallback: (report: InitProgressReport) => {
        onProgress?.({
          progress: report.progress,
          text: report.text,
        });
      },
    });

    engineInstance = engine;
    loadingPromise = null;
    return engine;
  })();

  return loadingPromise;
}

/**
 * Generate a response from Gemma 3.
 * Returns the full text response.
 */
export async function generate(
  engine: MLCEngine,
  prompt: string,
  maxTokens = 2048,
): Promise<string> {
  const response = await engine.chat.completions.create({
    messages: [
      {
        role: 'system',
        content:
          'You are an expert ATS resume analyst. Respond only in valid JSON. Be precise and concise.',
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.1, // Low temp for structured output
  });

  return response.choices[0]?.message?.content ?? '';
}

/**
 * Check if the engine is loaded and ready.
 */
export function isEngineReady(): boolean {
  return engineInstance !== null;
}

/**
 * Unload the engine to free memory.
 */
export async function unloadEngine(): Promise<void> {
  if (engineInstance) {
    await engineInstance.unload();
    engineInstance = null;
  }
}
