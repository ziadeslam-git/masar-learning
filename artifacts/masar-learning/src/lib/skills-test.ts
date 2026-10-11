export type SkillsQuestion = {
  id: string;
  number: number;
  dimension: string;
};

export type SkillsTestScores = {
  score: number;
  dimensionScores: Record<string, number>;
};

export function calculateSkillsTestScores(
  questions: SkillsQuestion[],
  answerKey: Record<string, string>,
  dimensions: Array<{ name: string }>,
  responses: Record<string, string>,
): SkillsTestScores {
  const dimensionScores = Object.fromEntries(dimensions.map(dimension => [dimension.name, 0]));
  let score = 0;
  for (const question of questions) {
    if (responses[question.id] !== answerKey[String(question.number)]) continue;
    score += 1;
    if (question.dimension in dimensionScores) dimensionScores[question.dimension] += 1;
  }
  return { score, dimensionScores };
}

export function remainingSeconds(startedAt: number, durationMinutes: number, now = Date.now()) {
  return Math.max(0, durationMinutes * 60 - Math.floor((now - startedAt) / 1000));
}

export function formatRemainingTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}
