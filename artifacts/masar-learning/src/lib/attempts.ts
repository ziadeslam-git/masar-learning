import type { LearningPath } from './config';

export type AssessmentAttempt = {
  date: string;
  score: number;
  path: LearningPath;
};

export const MAX_STORED_ATTEMPTS = 5;

export function appendAttempt(
  attempts: AssessmentAttempt[],
  next: AssessmentAttempt,
): AssessmentAttempt[] {
  return [...attempts, next].slice(-MAX_STORED_ATTEMPTS);
}

export function getPreviousAttempt(attempts: AssessmentAttempt[]): AssessmentAttempt | null {
  return attempts.length > 1 ? attempts[attempts.length - 2] : null;
}

export function getScoreDifference(currentScore: number, previousScore: number): number {
  return currentScore - previousScore;
}
