export const SITE_NAME =
  'بيئة تعلم قائمة على تطبيقات الذكاء الاصطناعي لتنمية التفكير التصميمي ومهارات إنتاج المعرفة لدى مختلفي مستوى تحمل الغموض';

export const STRUCTURED_PATH_THRESHOLD = 60;
export const OPEN_PATH_THRESHOLD = 80;

export type LearningPath = 'structured' | 'guided' | 'open';

export function getLearningPath(score: number): LearningPath {
  if (score < STRUCTURED_PATH_THRESHOLD) return 'structured';
  if (score < OPEN_PATH_THRESHOLD) return 'guided';
  return 'open';
}
