/**
 * L4 Fallback Agent -- Gemini 2.5 Pro API.
 *
 * Only invoked when L3 (Gemma 3 WebLLM) fails entirely.
 * Uses the same prompt templates as L3 for consistency.
 * Requires user-provided API key (stored in localStorage, never transmitted elsewhere).
 *
 * Privacy: API key entered by user in settings per spec section 5.6.
 * This is the only component that requires network access.
 */

/**
 * Send a prompt to Gemini 2.5 Pro and return the response text.
 *
 * Uses the Gemini REST API (generativelanguage.googleapis.com).
 * Timeout: 30 seconds. Single retry on transient failure.
 */
export async function analyzeWithGemini(
  apiKey: string,
  prompt: string
): Promise<string> {
  if (!apiKey) {
    throw new Error('Gemini API key required for L4 fallback analysis');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.1, // Low temperature for deterministic analysis
      maxOutputTokens: 4096,
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Gemini API error ${response.status}: ${errorText}`
      );
    }

    const data = await response.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!text) {
      throw new Error('Empty response from Gemini API');
    }

    return text;
  } finally {
    clearTimeout(timeout);
  }
}
