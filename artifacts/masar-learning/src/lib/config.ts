export const SITE_NAME =
  'بيئة تعلم قائمة على تطبيقات الذكاء الاصطناعي لتنمية التفكير التصميمي ومهارات إنتاج المعرفة لدى مختلفي مستوى تحمل الغموض';

export const LOW_MAX = 60;
export const HIGH_MIN = 80;
export const REVERSE_ITEMS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20] as const;
export const AMBIGUITY_TIMER_MINUTES = 20;
export const SKILLS_TEST_TIMER_MINUTES = 30;
export const SHOW_ANSWER_REVIEW = false;

export const STRUCTURED_PATH_THRESHOLD = LOW_MAX;
export const OPEN_PATH_THRESHOLD = HIGH_MIN;

export type LearningPath = 'structured' | 'guided' | 'open';

export function getLearningPath(score: number): LearningPath {
  if (score < LOW_MAX) return 'structured';
  if (score < HIGH_MIN) return 'guided';
  return 'open';
}
