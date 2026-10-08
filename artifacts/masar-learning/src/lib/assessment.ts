export type AssessmentQuestion = {
  id: string;
  reverse: boolean;
};

export type AssessmentResponses = Record<string, number>;

export function isValidLikertResponse(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 5;
}

export function hasCompleteAssessmentResponses(
  questions: AssessmentQuestion[],
  responses: AssessmentResponses,
): boolean {
  return questions.length > 0 && questions.every(question => isValidLikertResponse(responses[question.id]));
}

export function calculateAssessmentScore(
  questions: AssessmentQuestion[],
  responses: AssessmentResponses,
): number {
  if (!hasCompleteAssessmentResponses(questions, responses)) {
    throw new Error('Every assessment question requires one response from 1 to 5.');
  }

  const adjustedTotal = questions.reduce((total, question) => {
    const response = responses[question.id];
    return total + (question.reverse ? 6 - response : response);
  }, 0);
  const minimumTotal = questions.length;
  const maximumTotal = questions.length * 5;

  return Math.round(((adjustedTotal - minimumTotal) / (maximumTotal - minimumTotal)) * 100);
}
