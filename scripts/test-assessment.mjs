import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { calculateAssessmentScore, hasCompleteAssessmentResponses } from '../artifacts/masar-learning/src/lib/assessment.ts';
import { appendAttempt, getPreviousAttempt, getScoreDifference } from '../artifacts/masar-learning/src/lib/attempts.ts';
import { getLearningPath } from '../artifacts/masar-learning/src/lib/config.ts';

const { questions } = JSON.parse(
  readFileSync(new URL('../artifacts/masar-learning/src/data/assessment.json', import.meta.url), 'utf8'),
);

function responsesFor(effectiveRatings) {
  return Object.fromEntries(questions.map((question, index) => [
    question.id,
    question.reverse ? 6 - effectiveRatings[index] : effectiveRatings[index],
  ]));
}

test('lowest effective ratings score 0% and choose the structured path', () => {
  const responses = responsesFor(questions.map(() => 1));
  const score = calculateAssessmentScore(questions, responses);

  assert.equal(score, 0);
  assert.equal(getLearningPath(score), 'structured');
});

test('highest effective ratings score 100% and choose the open path', () => {
  const responses = responsesFor(questions.map(() => 5));
  const score = calculateAssessmentScore(questions, responses);

  assert.equal(score, 100);
  assert.equal(getLearningPath(score), 'open');
});

test('mixed effective ratings score in range and choose the guided path', () => {
  const ratings = [4, 4, 3, 4, 4, 3, 4, 4, 3, 4, 4, 4];
  const responses = responsesFor(ratings);
  const score = calculateAssessmentScore(questions, responses);

  assert.equal(score, 69);
  assert.equal(getLearningPath(score), 'guided');
});

test('neutral answers score 50%, not 60%', () => {
  const responses = responsesFor(questions.map(() => 3));

  assert.equal(calculateAssessmentScore(questions, responses), 50);
});

test('all literal 1 answers are low and structured after reverse scoring', () => {
  const responses = Object.fromEntries(questions.map(question => [question.id, 1]));
  const score = calculateAssessmentScore(questions, responses);

  assert.equal(score, 50);
  assert.equal(getLearningPath(score), 'structured');
});

test('missing and out-of-range answers cannot be scored', () => {
  const responses = responsesFor(questions.map(() => 4));
  delete responses[questions[0].id];

  assert.equal(hasCompleteAssessmentResponses(questions, responses), false);
  assert.throws(() => calculateAssessmentScore(questions, responses), /requires one response/);
  assert.equal(hasCompleteAssessmentResponses(questions, { ...responses, [questions[0].id]: 6 }), false);
});

test('attempt history retains only the newest five attempts in order', () => {
  const history = Array.from({ length: 5 }, (_, index) => ({
    date: `attempt-${index + 1}`,
    score: 40 + index,
    path: 'structured',
  }));
  const next = { date: 'attempt-6', score: 80, path: 'open' };
  const updated = appendAttempt(history, next);

  assert.equal(updated.length, 5);
  assert.deepEqual(updated.map(attempt => attempt.date), [
    'attempt-2', 'attempt-3', 'attempt-4', 'attempt-5', 'attempt-6',
  ]);
  assert.equal(getPreviousAttempt(updated)?.date, 'attempt-5');
  assert.equal(getScoreDifference(next.score, history.at(-1).score), 36);
});
