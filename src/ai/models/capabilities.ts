/**
 * Device Capability Detection
 *
 * Detects WebGPU, WASM, and RAM availability to determine which AI layers
 * can run on the user's device (spec section 7.4 Progressive Enhancement).
 *
 * | Capability     | Enables                                    |
 * |----------------|---------------------------------------------|
 * | JS only        | Student mode, form, preview, templates      |
 * | WASM           | L1 NLP + L2 MiniLM (ONNX WASM)             |
 * | WebGPU         | L3 Gemma 3 at full speed                    |
 * | WASM (no GPU)  | L3 Gemma 3 via CPU fallback (30-60s)        |
 * | Online + key   | L4 Gemini API, Google Maps Distance         |
 */

export interface DeviceCapabilities {
  /** WebGPU available and adapter obtained */
  hasWebGPU: boolean;
  /** WebAssembly supported */
  hasWASM: boolean;
  /** Estimated device RAM in GB (from navigator.deviceMemory or heuristic) */
  ramGB: number;
  /** Whether the device can run Gemma 3 (needs WebGPU or WASM + enough RAM) */
  canRunL3: boolean;
  /** Whether ONNX WASM runtime is feasible (needs WASM) */
  canRunL2: boolean;
  /** Online status */
  isOnline: boolean;
}

/**
 * Detect WebGPU availability.
 * Requests an adapter to confirm the GPU is actually usable.
 */
async function detectWebGPU(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined') return false;
    if (!('gpu' in navigator)) return false;

    const gpu = (navigator as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    if (!gpu) return false;

    const adapter = await gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

/**
 * Detect WebAssembly support.
 */
function detectWASM(): boolean {
  try {
    if (typeof WebAssembly === 'undefined') return false;
    // Validate a minimal WASM module
    const module = new WebAssembly.Module(
      new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00])
    );
    return module instanceof WebAssembly.Module;
  } catch {
    return false;
  }
}

/**
 * Estimate device RAM.
 *
 * Uses navigator.deviceMemory (Chrome/Edge) when available.
 * Falls back to a conservative 2GB estimate for other browsers.
 */
function estimateRAM(): number {
  try {
    if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
      return (navigator as { deviceMemory?: number }).deviceMemory ?? 2;
    }
  } catch {
    // Fall through
  }
  return 2; // Conservative default
}

/**
 * Detect all device capabilities for AI pipeline layer selection.
 *
 * Call once on app init. Results inform which UI to show:
 * - canRunL2 = false: show "Basic analysis only"
 * - canRunL3 = false: show "For deep AI reasoning, use a browser with WebGPU support"
 *   (per spec section 7.4)
 */
export async function detectCapabilities(): Promise<DeviceCapabilities> {
  const [hasWebGPU, hasWASM, ramGB] = await Promise.all([
    detectWebGPU(),
    Promise.resolve(detectWASM()),
    Promise.resolve(estimateRAM()),
  ]);

  const isOnline =
    typeof navigator !== 'undefined' ? navigator.onLine : false;

  // L2 (ONNX MiniLM): needs WASM
  const canRunL2 = hasWASM;

  // L3 (Gemma 3 1B Q4 ~600MB): needs WebGPU or WASM + at least 2GB RAM
  // WebGPU = full speed. WASM CPU = 30-60s per analysis (spec section 7.4)
  const canRunL3 = (hasWebGPU || hasWASM) && ramGB >= 2;

  return {
    hasWebGPU,
    hasWASM,
    ramGB,
    canRunL3,
    canRunL2,
    isOnline,
  };
}
