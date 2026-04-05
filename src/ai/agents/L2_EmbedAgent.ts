/**
 * L2 Embedding Agent -- Semantic similarity via TF-IDF cosine proxy.
 *
 * Actual ONNX MiniLM-L6-v2 loading will be wired later (requires model files).
 * This stub uses TF-IDF cosine similarity as the embedding proxy, providing
 * document-level semantic matching without external dependencies.
 *
 * Citations:
 * - Salton, G. (1975). A Theory of Indexing. SIAM.
 * - Wang, W. et al. (2020). MiniLM: Deep Self-Attention Distillation for
 *   Task-Agnostic Compression of Pre-Trained Transformers. NeurIPS.
 * - scikit-learn cosine_similarity: scikit-learn.org/stable/modules/metrics.html
 */

import { TfIdfVectorizer, cosineSimilarity } from '../scoring/tfidf';

export interface L2Result {
  semanticScore: number;
  semanticMatches: string[];
}

/**
 * Extract meaningful phrases (2-3 word ngrams) that appear in both texts.
 * These represent semantic matches beyond single keyword overlap.
 */
function findSemanticMatches(resumeText: string, jdText: string): string[] {
  const normalize = (t: string) =>
    t
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const resumeNorm = normalize(resumeText);
  const jdNorm = normalize(jdText);

  const resumeWords = resumeNorm.split(' ');
  const jdBigrams = new Set<string>();
  const jdWords = jdNorm.split(' ');

  // Build bigrams from JD
  for (let i = 0; i < jdWords.length - 1; i++) {
    if (jdWords[i].length > 2 && jdWords[i + 1].length > 2) {
      jdBigrams.add(`${jdWords[i]} ${jdWords[i + 1]}`);
    }
  }

  // Find matching bigrams in resume
  const matches: string[] = [];
  for (let i = 0; i < resumeWords.length - 1; i++) {
    const bigram = `${resumeWords[i]} ${resumeWords[i + 1]}`;
    if (jdBigrams.has(bigram) && !matches.includes(bigram)) {
      matches.push(bigram);
    }
  }

  return matches.slice(0, 20); // Cap at 20 most relevant
}

/**
 * Analyze resume vs JD using L2 semantic embedding (TF-IDF proxy).
 *
 * When ONNX MiniLM-L6-v2 is wired in, this function will use actual
 * sentence embeddings. For now, TF-IDF cosine similarity serves as a
 * lightweight proxy that runs on any device with zero model download.
 *
 * Formula: cosine_similarity(tfidf(resume), tfidf(jd))
 * Citation: Salton (1975), scikit-learn cosine similarity
 */
export function analyzeL2(
  resumeText: string,
  jdText: string
): L2Result {
  // TF-IDF vectorization + cosine similarity as embedding proxy
  const vectorizer = new TfIdfVectorizer();
  vectorizer.fit([resumeText, jdText]);

  const resumeVec = vectorizer.transform(resumeText);
  const jdVec = vectorizer.transform(jdText);

  // Cosine similarity: angle between document vectors
  // Citation: scikit-learn.org/stable/modules/metrics.html#cosine-similarity
  const semanticScore = cosineSimilarity(resumeVec, jdVec);

  // Find phrase-level semantic matches
  const semanticMatches = findSemanticMatches(resumeText, jdText);

  return {
    semanticScore,
    semanticMatches,
  };
}
