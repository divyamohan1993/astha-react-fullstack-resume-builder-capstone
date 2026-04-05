/**
 * ONNX Runtime Web -- MiniLM-L6-v2 Sentence Embeddings
 *
 * Loads all-MiniLM-L6-v2 ONNX model for 384-dim sentence embeddings.
 * Runs in WASM (any browser), no WebGPU required.
 * Model ~23MB quantized, cached in browser after first download.
 *
 * Citation:
 * - Wang, W. et al. (2020). "MiniLM: Deep Self-Attention Distillation for
 *   Task-Agnostic Compression of Pre-Trained Transformers." NeurIPS.
 * - Reimers, N. & Gurevych, I. (2019). "Sentence-BERT: Sentence Embeddings
 *   using Siamese BERT-Networks." EMNLP.
 * - ONNX Runtime Web: onnxruntime.ai
 */

import type { InferenceSession, Tensor } from 'onnxruntime-web';

// Model hosted on Hugging Face ONNX export
const MODEL_URL =
  'https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/onnx/model_quantized.onnx';
const TOKENIZER_URL =
  'https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/tokenizer.json';

let sessionInstance: InferenceSession | null = null;
let tokenizerData: TokenizerData | null = null;

interface TokenizerData {
  vocab: Record<string, number>;
  unkTokenId: number;
}

/**
 * Simple WordPiece tokenizer (subset of BERT tokenizer).
 * Handles basic tokenization for MiniLM.
 */
function tokenize(text: string, vocab: Record<string, number>, maxLen = 128): {
  inputIds: number[];
  attentionMask: number[];
} {
  const CLS = vocab['[CLS]'] ?? 101;
  const SEP = vocab['[SEP]'] ?? 102;
  const UNK = vocab['[UNK]'] ?? 100;
  const PAD = vocab['[PAD]'] ?? 0;

  // Basic pre-tokenization
  const words = text.toLowerCase().replace(/[^\w\s]/g, ' ').trim().split(/\s+/).filter(Boolean);

  const tokens: number[] = [CLS];

  for (const word of words) {
    if (tokens.length >= maxLen - 1) break;

    // Try whole word first
    if (vocab[word] !== undefined) {
      tokens.push(vocab[word]);
      continue;
    }

    // WordPiece: try subwords
    let remaining = word;
    let isFirst = true;
    while (remaining.length > 0 && tokens.length < maxLen - 1) {
      let found = false;
      for (let end = remaining.length; end > 0; end--) {
        const piece = isFirst ? remaining.slice(0, end) : '##' + remaining.slice(0, end);
        if (vocab[piece] !== undefined) {
          tokens.push(vocab[piece]);
          remaining = remaining.slice(end);
          isFirst = false;
          found = true;
          break;
        }
      }
      if (!found) {
        tokens.push(UNK);
        break;
      }
    }
  }

  tokens.push(SEP);

  // Pad to maxLen
  const inputIds = tokens.slice(0, maxLen);
  const attentionMask = inputIds.map(() => 1);

  while (inputIds.length < maxLen) {
    inputIds.push(PAD);
    attentionMask.push(0);
  }

  return { inputIds, attentionMask };
}

/**
 * Load the ONNX session and tokenizer. Cached after first load.
 */
export async function loadModel(): Promise<void> {
  if (sessionInstance && tokenizerData) return;

  const ort = await import('onnxruntime-web');

  // Set WASM paths
  ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

  // Load model and tokenizer in parallel
  const [session, tokenizerResponse] = await Promise.all([
    ort.InferenceSession.create(MODEL_URL, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    }),
    fetch(TOKENIZER_URL).then((r) => r.json()),
  ]);

  sessionInstance = session;

  // Parse tokenizer vocab
  const vocab: Record<string, number> = {};
  if (tokenizerResponse?.model?.vocab) {
    for (const [token, id] of Object.entries(tokenizerResponse.model.vocab)) {
      vocab[token] = id as number;
    }
  }

  tokenizerData = {
    vocab,
    unkTokenId: vocab['[UNK]'] ?? 100,
  };
}

/**
 * Generate a 384-dim embedding for a text string.
 * Model must be loaded first via loadModel().
 */
export async function embed(text: string): Promise<Float32Array> {
  if (!sessionInstance || !tokenizerData) {
    throw new Error('Model not loaded. Call loadModel() first.');
  }

  const ort = await import('onnxruntime-web');
  const { inputIds, attentionMask } = tokenize(text, tokenizerData.vocab);

  const inputIdsTensor = new ort.Tensor('int64', BigInt64Array.from(inputIds.map(BigInt)), [1, inputIds.length]);
  const attentionMaskTensor = new ort.Tensor('int64', BigInt64Array.from(attentionMask.map(BigInt)), [1, attentionMask.length]);
  const tokenTypeIds = new ort.Tensor('int64', new BigInt64Array(inputIds.length), [1, inputIds.length]);

  const feeds: Record<string, Tensor> = {
    input_ids: inputIdsTensor,
    attention_mask: attentionMaskTensor,
    token_type_ids: tokenTypeIds,
  };

  const results = await sessionInstance.run(feeds);

  // MiniLM outputs last_hidden_state [1, seq_len, 384]
  // Mean pooling over non-padding tokens
  const output = results['last_hidden_state'] ?? Object.values(results)[0];
  const data = output.data as Float32Array;
  const hiddenSize = 384;
  const seqLen = inputIds.length;

  // Mean pool: average over tokens where attention_mask = 1
  const embedding = new Float32Array(hiddenSize);
  let tokenCount = 0;

  for (let t = 0; t < seqLen; t++) {
    if (attentionMask[t] === 1) {
      tokenCount++;
      for (let h = 0; h < hiddenSize; h++) {
        embedding[h] += data[t * hiddenSize + h];
      }
    }
  }

  if (tokenCount > 0) {
    for (let h = 0; h < hiddenSize; h++) {
      embedding[h] /= tokenCount;
    }
  }

  // L2 normalize
  let norm = 0;
  for (let h = 0; h < hiddenSize; h++) {
    norm += embedding[h] * embedding[h];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let h = 0; h < hiddenSize; h++) {
      embedding[h] /= norm;
    }
  }

  return embedding;
}

/**
 * Cosine similarity between two embedding vectors.
 * Since embeddings are L2-normalized, this is just the dot product.
 */
export function embeddingCosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

/**
 * Check if the ONNX model is loaded.
 */
export function isModelLoaded(): boolean {
  return sessionInstance !== null && tokenizerData !== null;
}
