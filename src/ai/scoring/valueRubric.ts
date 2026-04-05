/**
 * AAC&U VALUE Rubric Scoring for Projects
 *
 * Citation: AAC&U (Association of American Colleges and Universities).
 * "VALUE Rubrics." https://www.aacu.org/value/rubrics
 * Used by 5,600+ organizations across 159 countries.
 *
 * Rubrics applied: "Problem Solving" and "Integrative and Applied Learning."
 *
 * Weight source: Hart Research Associates / AAC&U 2018 -- 93% of employers value
 * demonstrated capacity to solve complex problems over undergraduate major.
 */

export type RubricLevel = 'capstone' | 'milestone3' | 'milestone2' | 'benchmark';

/**
 * Rubric level scores per AAC&U VALUE framework (spec section 6.4):
 *
 * | Level        | Descriptor                                             | Score |
 * |------------- |--------------------------------------------------------|-------|
 * | Capstone (4) | Quantified outcome + tech stack + problem + methodology | 1.0   |
 * | Milestone 3  | Quantified outcome + tech stack, missing methodology   | 0.75  |
 * | Milestone 2  | Describes project with tech stack, no quantification   | 0.5   |
 * | Benchmark(1) | Vague description, no measurable outcome               | 0.25  |
 */
const RUBRIC_SCORES: Record<RubricLevel, number> = {
  capstone: 1.0,
  milestone3: 0.75,
  milestone2: 0.5,
  benchmark: 0.25,
};

// Patterns for detection
const QUANTIFICATION_PATTERN =
  /\d+%|\d+x|\d+\s*(users?|requests?|rps|ms|seconds?|minutes?|hours?|downloads?|stars?|views?|clients?|customers?|transactions?|records?|rows?|entries?|items?|endpoints?|apis?|pages?|uptime|improvement|reduction|increase|decrease|faster|slower|growth|revenue|sales|saves?|reduced|improved|increased|decreased|achieved|generated|processed|handled|served|built|deployed|managed|delivered)/i;

const TECH_STACK_PATTERN =
  /react|angular|vue|node|express|django|flask|spring|rails|laravel|next|nuxt|svelte|typescript|javascript|python|java|go|rust|c\+\+|swift|kotlin|sql|postgres|mysql|mongodb|redis|docker|kubernetes|aws|gcp|azure|tensorflow|pytorch|graphql|rest\s*api|websocket|firebase|supabase|tailwind|css|html|git|ci\/cd|jenkins|terraform|nginx|linux/i;

const METHODOLOGY_PATTERN =
  /agile|scrum|tdd|bdd|ci\/cd|devops|microservice|mvc|mvvm|clean\s*architecture|solid|design\s*pattern|unit\s*test|integration\s*test|a\/b\s*test|user\s*research|sprint|kanban|waterfall|iterative|peer\s*review|code\s*review|load\s*test|benchmark/i;

const PROBLEM_PATTERN =
  /solv(e|ed|ing)|address(ed|ing)?|fix(ed|ing)?|improv(e|ed|ing)|reduc(e|ed|ing)|eliminat(e|ed|ing)|automat(e|ed|ing)|streamlin(e|ed|ing)|optimiz(e|ed|ing)|migrat(e|ed|ing)|refactor(ed|ing)?|built\s+to|designed\s+to|created\s+to|developed\s+to/i;

/**
 * Classify a project description into an AAC&U VALUE rubric level.
 *
 * Detection criteria (per spec section 6.4):
 * - Capstone:    quantified outcome + tech stack + problem statement + methodology
 * - Milestone 3: quantified outcome + tech stack, missing methodology
 * - Milestone 2: tech stack present, no quantification
 * - Benchmark:   vague description, no measurable outcome
 */
export function classifyProject(description: string): RubricLevel {
  const hasQuantification = QUANTIFICATION_PATTERN.test(description);
  const hasTechStack = TECH_STACK_PATTERN.test(description);
  const hasMethodology = METHODOLOGY_PATTERN.test(description);
  const hasProblem = PROBLEM_PATTERN.test(description);

  // Capstone: all four criteria met
  if (hasQuantification && hasTechStack && hasMethodology && hasProblem) {
    return 'capstone';
  }

  // Milestone 3: quantified + tech stack (methodology or problem may be missing)
  if (hasQuantification && hasTechStack) {
    return 'milestone3';
  }

  // Milestone 2: tech stack present but no quantification
  if (hasTechStack) {
    return 'milestone2';
  }

  // Benchmark: vague, no measurable outcome
  return 'benchmark';
}

/**
 * Get the numeric score for a rubric level.
 * Citation: AAC&U VALUE Rubrics, aacu.org/value/rubrics
 */
export function rubricScore(level: RubricLevel): number {
  return RUBRIC_SCORES[level];
}
