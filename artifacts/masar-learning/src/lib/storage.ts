import type { LearningPath } from './config';

export const storageKeys = {
  result: 'masar-result',
  answers: 'masar-ambiguity-responses',
  attempts: 'masar-ambiguity-attempts',
  ambiguityStartedAt: 'masar-ambiguity-started-at',
  done: 'masar-completed-lessons',
  theme: 'masar-theme',
  skillsResult: 'masar-skills-test-result',
  skillsAnswers: 'masar-skills-test-responses',
  skillsStartedAt: 'masar-skills-test-started-at',
  skillsAttempts: 'masar-skills-test-attempts',
};

export type AssessmentResult = {
  version: 2;
  score: number;
  path: LearningPath;
  responses: Record<string, number>;
};

export type SkillsTestResult = {
  score: number;
  dimensionScores: Record<string, number>;
  date: string;
  timedOut?: boolean;
};

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The app continues to work for the current session if storage is unavailable.
  }
}

export function removeStorage(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // The app continues to work for the current session if storage is unavailable.
  }
}

export function readAssessmentResult(): AssessmentResult | null {
  const result = readStorage<AssessmentResult | null>(storageKeys.result, null);
  if (!result || result.version !== 2 || !Number.isFinite(result.score)
    || result.score < 20 || result.score > 100
    || !['structured', 'guided', 'open'].includes(result.path)) return null;
  return result;
}

export function readSkillsTestResult(): SkillsTestResult | null {
  const result = readStorage<SkillsTestResult | null>(storageKeys.skillsResult, null);
  if (!result || !Number.isFinite(result.score) || result.score < 0 || result.score > 25
    || !result.dimensionScores || typeof result.dimensionScores !== 'object') return null;
  return result;
}
