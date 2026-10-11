import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseAssessmentSource } from './build-assessments.ts';
import { calculateAssessmentScore, hasCompleteAssessmentResponses } from '../artifacts/masar-learning/src/lib/assessment.ts';
import { appendAttempt, appendSkillsAttempt, getPreviousAttempt, getScoreDifference } from '../artifacts/masar-learning/src/lib/attempts.ts';
import { AMBIGUITY_TIMER_MINUTES, HIGH_MIN, LOW_MAX, REVERSE_ITEMS, SHOW_ANSWER_REVIEW, SKILLS_TEST_TIMER_MINUTES, getLearningPath } from '../artifacts/masar-learning/src/lib/config.ts';
import { calculateSkillsTestScores } from '../artifacts/masar-learning/src/lib/skills-test.ts';

const scale = JSON.parse(readFileSync(new URL('../artifacts/masar-learning/src/data/assessment-ambiguity.json', import.meta.url), 'utf8'));
const skills = JSON.parse(readFileSync(new URL('../artifacts/masar-learning/src/data/assessment-design-thinking.json', import.meta.url), 'utf8'));
const scaleSource = readFileSync(new URL('../content/source/ambiguity-scale.md', import.meta.url), 'utf8');
const skillsSource = readFileSync(new URL('../content/source/design-thinking-test.md', import.meta.url), 'utf8');

function responsesFor(effectiveRatings) {
  return Object.fromEntries(scale.questions.map((question, index) => [
    question.id,
    question.reverse ? 6 - effectiveRatings[index] : effectiveRatings[index],
  ]));
}

function responsesForTotal(total) {
  assert.ok(total >= 20 && total <= 100);
  const ratings = Array(20).fill(1);
  let remaining = total - 20;
  for (let index = 0; index < ratings.length && remaining > 0; index += 1) {
    const addition = Math.min(4, remaining);
    ratings[index] += addition;
    remaining -= addition;
  }
  return responsesFor(ratings);
}

function skillsResponses(correctQuestions) {
  const correct = new Set(correctQuestions);
  return Object.fromEntries(skills.questions.map(question => {
    const key = skills.answerKey[String(question.number)];
    return [question.id, correct.has(question.number) ? key : key === 'أ' ? 'ب' : 'أ'];
  }));
}

test('the source parser yields 20 scale statements and exactly ten configured reverse items', () => {
  assert.equal(scale.questions.length, 20);
  assert.deepEqual(scale.questions.filter(question => question.reverse).map(question => question.number), [...REVERSE_ITEMS]);
  assert.deepEqual(scale.responseOptions.map(option => option.value), [5, 4, 3, 2, 1]);
  assert.equal(AMBIGUITY_TIMER_MINUTES, 20);
  assert.equal(scale.questions.every(question => question.prompt.trim().length > 0), true);
});

test('neutral answers score 60 and use the guided path', () => {
  const score = calculateAssessmentScore(scale.questions, responsesFor(Array(20).fill(3)));
  assert.equal(score, 60);
  assert.equal(getLearningPath(score), 'guided');
});

test('extreme effective responses score 20 structured and 100 open', () => {
  assert.equal(calculateAssessmentScore(scale.questions, responsesFor(Array(20).fill(1))), 20);
  assert.equal(getLearningPath(20), 'structured');
  assert.equal(calculateAssessmentScore(scale.questions, responsesFor(Array(20).fill(5))), 100);
  assert.equal(getLearningPath(100), 'open');
});

test('selecting agree for every statement scores 60 after reverse scoring', () => {
  const allAgree = Object.fromEntries(scale.questions.map(question => [question.id, 5]));
  assert.equal(calculateAssessmentScore(scale.questions, allAgree), 60);
});

test('path score boundaries are raw totals: 59, 79, and 80', () => {
  assert.equal(LOW_MAX, 60);
  assert.equal(HIGH_MIN, 80);
  const score59 = calculateAssessmentScore(scale.questions, responsesForTotal(59));
  const score79 = calculateAssessmentScore(scale.questions, responsesForTotal(79));
  const score80 = calculateAssessmentScore(scale.questions, responsesForTotal(80));
  assert.equal(score59, 59);
  assert.equal(getLearningPath(score59), 'structured');
  assert.equal(score79, 79);
  assert.equal(getLearningPath(score79), 'guided');
  assert.equal(score80, 80);
  assert.equal(getLearningPath(score80), 'open');
});

test('all agree answers produce the required guided threshold score', () => {
  assert.equal(calculateAssessmentScore(scale.questions, Object.fromEntries(scale.questions.map(question => [question.id, 5]))), 60);
});

test('incomplete and out-of-range scale responses cannot be submitted or scored', () => {
  const responses = responsesFor(Array(20).fill(4));
  delete responses[scale.questions[0].id];
  assert.equal(hasCompleteAssessmentResponses(scale.questions, responses), false);
  assert.throws(() => calculateAssessmentScore(scale.questions, responses), /requires one response/);
  assert.equal(hasCompleteAssessmentResponses(scale.questions, { ...responses, [scale.questions[0].id]: 6 }), false);
});

test('the skills test source has 25 validated questions, four options each, and a 30-minute limit', () => {
  assert.equal(skills.questions.length, 25);
  assert.equal(Object.keys(skills.answerKey).length, 25);
  assert.equal(skills.questions.every(question => question.options.length === 4), true);
  assert.equal(SKILLS_TEST_TIMER_MINUTES, 30);
  assert.equal(SHOW_ANSWER_REVIEW, false);
});

test('all correct skills answers score 25 with five points in each dimension', () => {
  const answers = skillsResponses(skills.questions.map(question => question.number));
  const result = calculateSkillsTestScores(skills.questions, skills.answerKey, skills.dimensions, answers);
  assert.equal(result.score, 25);
  assert.deepEqual(Object.values(result.dimensionScores), [5, 5, 5, 5, 5]);
});

test('all incorrect skills answers score zero in every dimension', () => {
  const result = calculateSkillsTestScores(skills.questions, skills.answerKey, skills.dimensions, skillsResponses([]));
  assert.equal(result.score, 0);
  assert.deepEqual(Object.values(result.dimensionScores), [0, 0, 0, 0, 0]);
});

test('one correct answer in each dimension scores five total and one per dimension', () => {
  const onePerDimension = skills.dimensions.map(dimension => skills.questions.find(question => question.dimension === dimension.name).number);
  const result = calculateSkillsTestScores(skills.questions, skills.answerKey, skills.dimensions, skillsResponses(onePerDimension));
  assert.equal(result.score, 5);
  assert.deepEqual(Object.values(result.dimensionScores), [1, 1, 1, 1, 1]);
});

test('missing skills responses count as incorrect', () => {
  const result = calculateSkillsTestScores(skills.questions, skills.answerKey, skills.dimensions, {});
  assert.equal(result.score, 0);
});

test('parser rejects a source with a dropped scale statement', () => {
  const headers = [...scaleSource.matchAll(/^###\s*س\s*[0-9٠-٩]+\s*$/gmu)];
  assert.equal(headers.length, 20);
  const incompleteSource = scaleSource.replace(headers.at(-1)[0], '');
  assert.throws(() => parseAssessmentSource(incompleteSource), /expected 20 questions/);
});

test('parser validates skill answer-key entries against each question answer', () => {
  const corruptedSource = skillsSource.replace(/- الإجابة الصحيحة:\s*[أإآابجد]/u, '- الإجابة الصحيحة: أ');
  assert.throws(() => parseAssessmentSource(corruptedSource), /answer key mismatch/);
});

test('assessment attempt history retains only the five most recent results', () => {
  const history = Array.from({ length: 5 }, (_, index) => ({
    date: `attempt-${index + 1}`,
    score: 40 + index,
    path: 'guided',
  }));
  const next = { date: 'attempt-6', score: 80, path: 'open' };
  const updated = appendAttempt(history, next);
  assert.equal(updated.length, 5);
  assert.deepEqual(updated.map(attempt => attempt.date), ['attempt-2', 'attempt-3', 'attempt-4', 'attempt-5', 'attempt-6']);
  assert.equal(getPreviousAttempt(updated)?.date, 'attempt-5');
  assert.equal(getScoreDifference(next.score, history.at(-1).score), 36);
});

test('skills-test attempt history retains the last five submissions', () => {
  const history = Array.from({ length: 5 }, (_, index) => ({ date: `skills-${index + 1}`, score: index, dimensionScores: {} }));
  const updated = appendSkillsAttempt(history, { date: 'skills-6', score: 5, dimensionScores: {} });
  assert.equal(updated.length, 5);
  assert.deepEqual(updated.map(attempt => attempt.date), ['skills-2', 'skills-3', 'skills-4', 'skills-5', 'skills-6']);
});
