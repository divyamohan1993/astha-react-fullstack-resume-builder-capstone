/**
 * Jaccard Similarity
 *
 * Citation: Jaccard, P. (1901). "Distribution de la flore alpine dans le bassin
 * des Dranses et dans quelques regions voisines." Bulletin de la Societe Vaudoise
 * des Sciences Naturelles, 37, 241-272.
 *
 * Standard set-overlap measure: |A ∩ B| / |A ∪ B|.
 * Used by open-source ATS: srbhr/Resume-Matcher, indiser/Beat-The-ATS.
 */

/**
 * Compute Jaccard similarity coefficient between two sets.
 * Returns 0 when both sets are empty (no overlap possible).
 */
export function jaccard(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 0;

  let intersectionSize = 0;
  // Iterate the smaller set for O(min(|A|,|B|)) amortized
  const [smaller, larger] = setA.size <= setB.size ? [setA, setB] : [setB, setA];
  for (const item of smaller) {
    if (larger.has(item)) intersectionSize++;
  }

  // |A ∪ B| = |A| + |B| - |A ∩ B|
  const unionSize = setA.size + setB.size - intersectionSize;
  return intersectionSize / unionSize;
}
