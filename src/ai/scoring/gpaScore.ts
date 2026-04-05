/**
 * GPA Scoring
 *
 * Citation: NACE Job Outlook 2024 -- 38.3% of employers use GPA as screening
 * criterion, median cutoff = 3.0/4.0.
 * https://www.naceweb.org/job-market/trends-and-predictions/percentage-of-employers-screening-college-graduates-by-gpa-drops-sharply/
 *
 * Linear scale: (GPA - 2.0) / 2.0, clamped to [0, 1].
 * 2.0 -> 0.0, 3.0 -> 0.5, 4.0 -> 1.0
 * Null GPA -> 0.5 (neutral, no penalty per NACE recommendation).
 */

/**
 * Compute GPA score on a linear scale above the 3.0 cutoff.
 *
 * Formula (from spec section 6.8):
 *   If GPA not provided: score = 0.5 (neutral)
 *   If GPA >= 3.0: score = min(1.0, (GPA - 2.0) / 2.0)
 *   If GPA < 3.0: score = max(0.0, (GPA - 2.0) / 2.0)
 *
 * Citation: NACE Job Outlook 2024, 38.3% use 3.0 cutoff
 */
export function gpaScore(gpa: number | null): number {
  // No GPA provided: neutral score (NACE 2024 -- not a hard gate)
  if (gpa === null || gpa === undefined) return 0.5;

  // Linear scale: (GPA - 2.0) / 2.0, clamped [0, 1]
  return Math.max(0, Math.min(1, (gpa - 2.0) / 2.0));
}
