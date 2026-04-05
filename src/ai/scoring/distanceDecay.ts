/**
 * Exponential Distance Decay
 *
 * Citation: Marinescu, I. & Rathelot, R. (2018). "Mismatch Unemployment and
 * the Geography of Job Search." American Economic Journal: Macroeconomics,
 * 10(3), 42-70. https://www.aeaweb.org/articles?id=10.1257/mac.20160312
 *
 * Finding: job seekers are 35% less likely to apply to a job 10 miles away.
 * Decay rate: 0.043 = -ln(0.65) / 10
 *
 * At  0 miles: 1.00
 * At 10 miles: 0.65
 * At 25 miles: 0.34
 * At 50 miles: 0.12
 */

/** Convert kilometers to miles. 1 mile = 1.60934 km. */
function kmToMiles(km: number): number {
  return km / 1.60934;
}

/**
 * Compute distance score using exponential decay.
 * Input is in miles. Returns score in [0, 1].
 *
 * Formula: exp(-0.043 * distance_miles)
 * Where 0.043 = -ln(0.65) / 10  (Marinescu & Rathelot 2018, AEJ:Macro 10(3):42-70)
 */
export function distanceScore(miles: number): number {
  if (miles < 0) return 1;
  // exp(-0.043 * d) -- 35% reduction at 10 miles per Marinescu & Rathelot (2018)
  return Math.exp(-0.043 * miles);
}

/**
 * Compute distance score from kilometers.
 * Converts km to miles, then applies Marinescu & Rathelot decay.
 */
export function distanceScoreFromKm(km: number): number {
  return distanceScore(kmToMiles(km));
}
