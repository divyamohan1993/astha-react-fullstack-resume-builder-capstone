/**
 * Gemma 4 E2B Integration via @huggingface/transformers
 *
 * Loads google/gemma-4-E2B-it (effective 2B params, Q4F16 quantized) directly
 * in the browser via Transformers.js + WebGPU. Falls back to WASM for CPU.
 *
 * Model: onnx-community/gemma-4-E2B-it-ONNX
 * Size: ~1.5GB Q4 quantized, cached in browser after first download
 * Context: 128K tokens
 * License: Apache 2.0
 *
 * Source: https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX
 * Blog: https://huggingface.co/blog/gemma4
 * Google: https://blog.google/innovation-and-ai/technology/developers-tools/gemma-4/
 *
 * Why Gemma 4 E2B over Gemma 3 1B:
 * - Newer (April 2026), more capable reasoning at same parameter class
 * - Official ONNX export by onnx-community (no MLC compilation needed)
 * - Native Transformers.js support with WebGPU + WASM backends
 * - Per-Layer Embeddings (PLE) for better parameter efficiency on device
 * - 128K context (vs 8K for Gemma 3 1B)
 */

// Types for the pipeline -- Transformers.js is dynamically imported
interface TextGenerationOutput {
  generated_text: string;
}

type TextGenerationPipeline = (
  prompt: string,
  options?: Record<string, unknown>,
) => Promise<TextGenerationOutput[]>;

let pipelineInstance: TextGenerationPipeline | null = null;
let loadingPromise: Promise<TextGenerationPipeline> | null = null;

export type ProgressCallback = (report: {
  progress: number;
  text: string;
}) => void;

/**
 * Detect whether WebGPU is available for fast inference.
 */
async function hasWebGPU(): Promise<boolean> {
  try {
    if (!('gpu' in navigator)) return false;
    const gpu = (navigator as { gpu?: { requestAdapter(): Promise<unknown | null> } }).gpu;
    if (!gpu) return false;
    const adapter = await gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

/**
 * Get or create the Gemma 4 E2B text generation pipeline.
 * Model is downloaded on first use (~1.5GB Q4), cached in browser storage.
 *
 * Progressive: WebGPU (fast) -> WASM (slower, works everywhere).
 */
export async function getOrCreateEngine(
  onProgress?: ProgressCallback,
): Promise<TextGenerationPipeline> {
  if (pipelineInstance) return pipelineInstance;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    onProgress?.({ progress: 0, text: 'Loading Gemma 4 E2B...' });

    // Dynamic import to keep Transformers.js out of main bundle
    const { pipeline, env } = await import('@huggingface/transformers');

    // Allow remote models from HuggingFace Hub
    env.allowRemoteModels = true;
    env.allowLocalModels = false;

    const webgpu = await hasWebGPU();
    const device = webgpu ? 'webgpu' : 'wasm';
    const dtype = webgpu ? 'q4f16' : 'q4';

    onProgress?.({
      progress: 0.1,
      text: `Using ${device.toUpperCase()} backend. Downloading model...`,
    });

    const pipe = (await pipeline('text-generation', 'onnx-community/gemma-4-E2B-it-ONNX', {
      device,
      dtype,
      progress_callback: (event: { progress?: number; status?: string }) => {
        if (event.progress !== undefined) {
          onProgress?.({
            progress: 0.1 + event.progress * 0.9,
            text: event.status ?? `Downloading: ${Math.round(event.progress * 100)}%`,
          });
        }
      },
    })) as unknown as TextGenerationPipeline;

    pipelineInstance = pipe;
    loadingPromise = null;

    onProgress?.({ progress: 1, text: 'Gemma 4 E2B ready.' });
    return pipe;
  })();

  return loadingPromise;
}

/**
 * Generate a response from Gemma 4 E2B.
 * Returns the generated text (system + user prompt -> model response).
 */
export async function generate(
  pipe: TextGenerationPipeline,
  prompt: string,
  maxTokens = 2048,
): Promise<string> {
  const fullPrompt = `<start_of_turn>user
You are an expert ATS resume analyst. Respond only in valid JSON. Be precise and concise.

${prompt}<end_of_turn>
<start_of_turn>model
`;

  const outputs = await pipe(fullPrompt, {
    max_new_tokens: maxTokens,
    temperature: 0.1,
    do_sample: true,
    return_full_text: false,
  });

  return outputs[0]?.generated_text ?? '';
}

/**
 * Check if the pipeline is loaded and ready.
 */
export function isEngineReady(): boolean {
  return pipelineInstance !== null;
}

/**
 * Unload the pipeline to free memory.
 */
export async function unloadEngine(): Promise<void> {
  if (pipelineInstance) {
    // Transformers.js pipelines don't have an explicit unload
    // but we can null the reference to allow GC
    pipelineInstance = null;
  }
}
