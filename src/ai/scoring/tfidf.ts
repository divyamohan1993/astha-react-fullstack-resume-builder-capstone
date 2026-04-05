/**
 * TF-IDF Vectorizer + Cosine Similarity
 *
 * Citation: Salton, G. (1975). "A Theory of Indexing." CBMS-NSF Regional
 * Conference Series in Applied Mathematics. SIAM.
 * Cosine similarity: scikit-learn.org/stable/modules/metrics.html#cosine-similarity
 *
 * Pure TypeScript, zero dependencies. Mirrors scikit-learn TfidfVectorizer behavior:
 * TF = term frequency in document, IDF = log(N / df) + 1 (smooth IDF).
 */

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

export class TfIdfVectorizer {
  private idf: Map<string, number> = new Map();
  private vocabulary: Set<string> = new Set();
  private docCount = 0;

  /**
   * Fit the vectorizer on a corpus of documents.
   * Computes IDF weights: log(N / df_t) + 1 (scikit-learn smooth IDF variant).
   */
  fit(docs: string[]): void {
    this.docCount = docs.length;
    const df = new Map<string, number>();

    for (const doc of docs) {
      const seen = new Set(tokenize(doc));
      for (const term of seen) {
        this.vocabulary.add(term);
        df.set(term, (df.get(term) ?? 0) + 1);
      }
    }

    this.idf = new Map();
    for (const [term, freq] of df) {
      // Smooth IDF: log(N / df) + 1, matching scikit-learn default
      this.idf.set(term, Math.log(this.docCount / freq) + 1);
    }
  }

  /**
   * Transform a single document into a TF-IDF vector (sparse, as Map).
   * TF = raw count / total terms. TF-IDF = TF * IDF. L2-normalized.
   */
  transform(doc: string): Map<string, number> {
    const tokens = tokenize(doc);
    if (tokens.length === 0) return new Map();

    // Term frequency
    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) ?? 0) + 1);
    }

    // TF-IDF = (count / total) * IDF
    const tfidf = new Map<string, number>();
    for (const [term, count] of tf) {
      const idfVal = this.idf.get(term);
      if (idfVal !== undefined) {
        tfidf.set(term, (count / tokens.length) * idfVal);
      }
    }

    // L2 normalization
    let norm = 0;
    for (const val of tfidf.values()) norm += val * val;
    norm = Math.sqrt(norm);

    if (norm > 0) {
      for (const [term, val] of tfidf) {
        tfidf.set(term, val / norm);
      }
    }

    return tfidf;
  }
}

/**
 * Cosine similarity between two sparse vectors represented as Maps.
 *
 * cos(a, b) = (a . b) / (||a|| * ||b||)
 *
 * Since TfIdfVectorizer.transform() already L2-normalizes, this simplifies
 * to just the dot product for pre-normalized vectors. We compute the full
 * formula for correctness with arbitrary inputs.
 *
 * Citation: scikit-learn.org/stable/modules/metrics.html#cosine-similarity
 */
export function cosineSimilarity(
  a: Map<string, number>,
  b: Map<string, number>
): number {
  if (a.size === 0 || b.size === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  // Iterate smaller map, lookup in larger
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
  for (const [term, valSmall] of smaller) {
    const valLarge = larger.get(term);
    if (valLarge !== undefined) dot += valSmall * valLarge;
  }

  for (const val of a.values()) normA += val * val;
  for (const val of b.values()) normB += val * val;

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
