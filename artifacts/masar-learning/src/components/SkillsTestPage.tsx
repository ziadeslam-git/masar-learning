import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, ArrowRight, Check, CircleHelp, Target } from 'lucide-react';
import assessmentData from '@/data/assessment-design-thinking.json';
import { SHOW_ANSWER_REVIEW, SKILLS_TEST_TIMER_MINUTES } from '@/lib/config';
import { calculateSkillsTestScores, formatRemainingTime, remainingSeconds } from '@/lib/skills-test';
import { appendSkillsAttempt, type SkillsTestAttempt } from '@/lib/attempts';
import { readAssessmentResult, readStorage, removeStorage, storageKeys, writeStorage, type SkillsTestResult } from '@/lib/storage';

const questions = assessmentData.questions;
const durationSeconds = SKILLS_TEST_TIMER_MINUTES * 60;

function readAttempts(): SkillsTestAttempt[] {
  const stored = readStorage<unknown>(storageKeys.skillsAttempts, []);
  if (!Array.isArray(stored)) return [];
  return stored.filter((item): item is SkillsTestAttempt => {
    if (item === null || typeof item !== 'object') return false;
    const attempt = item as Record<string, unknown>;
    return typeof attempt.date === 'string'
      && Number.isFinite(attempt.score)
      && (attempt.score as number) >= 0
      && (attempt.score as number) <= 25
      && Boolean(attempt.dimensionScores && typeof attempt.dimensionScores === 'object');
  }).slice(-5);
}

export function SkillsTestPage() {
  const [, setLocation] = useLocation();
  const hasAmbiguityResult = readAssessmentResult() !== null;
  const [startedAt, setStartedAt] = useState<number | null>(() => readStorage(storageKeys.skillsStartedAt, null));
  const [answers, setAnswers] = useState<Record<string, string>>(() => readStorage(storageKeys.skillsAnswers, {}));
  const [testResult, setTestResult] = useState<SkillsTestResult | null>(() => readStorage(storageKeys.skillsResult, null));
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const start = readStorage<number | null>(storageKeys.skillsStartedAt, null);
    return start === null ? durationSeconds : remainingSeconds(start, SKILLS_TEST_TIMER_MINUTES);
  });
  const submitted = useRef(false);
  const answeredCount = questions.filter(question => Boolean(answers[question.id])).length;
  const firstUnanswered = questions.findIndex(question => !answers[question.id]);
  const [index, setIndex] = useState(() => {
    const savedStart = readStorage<number | null>(storageKeys.skillsStartedAt, null);
    if (savedStart === null) return 0;
    return firstUnanswered < 0 ? questions.length - 1 : firstUnanswered;
  });
  const question = questions[index];

  useEffect(() => {
    if (!hasAmbiguityResult) setLocation('/assessment');
  }, [hasAmbiguityResult, setLocation]);

  const finish = (timedOut = false) => {
    if (submitted.current || startedAt === null) return;
    submitted.current = true;
    const scores = calculateSkillsTestScores(questions, assessmentData.answerKey, assessmentData.dimensions, answers);
    const date = new Date().toISOString();
    const result: SkillsTestResult = { ...scores, date, timedOut };
    const attempt: SkillsTestAttempt = { ...scores, date };
    writeStorage(storageKeys.skillsAttempts, appendSkillsAttempt(readAttempts(), attempt));
    writeStorage(storageKeys.skillsResult, result);
    removeStorage(storageKeys.skillsStartedAt);
    setTestResult(result);
    setStartedAt(null);
    setSecondsLeft(0);
  };

  useEffect(() => {
    if (startedAt === null || testResult !== null) return;
    const update = () => setSecondsLeft(remainingSeconds(startedAt, SKILLS_TEST_TIMER_MINUTES));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [startedAt, testResult]);

  useEffect(() => {
    if (startedAt !== null && secondsLeft === 0 && testResult === null) finish(true);
  }, [secondsLeft, startedAt, testResult, answers]);

  const begin = () => {
    const startTime = Date.now();
    const emptyAnswers = {};
    submitted.current = false;
    setAnswers(emptyAnswers);
    setIndex(0);
    setTestResult(null);
    setSecondsLeft(durationSeconds);
    setStartedAt(startTime);
    writeStorage(storageKeys.skillsAnswers, emptyAnswers);
    writeStorage(storageKeys.skillsStartedAt, startTime);
    removeStorage(storageKeys.skillsResult);
  };

  const setAnswer = (key: string) => {
    if (!question) return;
    const next = { ...answers, [question.id]: key };
    setAnswers(next);
    writeStorage(storageKeys.skillsAnswers, next);
  };

  if (!hasAmbiguityResult) return <div className="page-wrap py-12"><div className="soft-card rounded-3xl p-8 text-center"><p className="text-muted-foreground">نحوّل إلى مقياس تحديد المسار أولاً.</p></div></div>;

  if (testResult && startedAt === null) return <div className="page-wrap max-w-4xl py-10 sm:py-14" dir="rtl">
    <Link href="/progress" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"><ArrowRight size={17} />لوحة التقدم</Link>
    <div className="mb-7 text-center"><p className="text-sm font-bold text-secondary">اكتمل اختبار مهارات التفكير التصميمي</p><h1 className="mt-2 text-3xl font-extrabold">نتيجتك</h1></div>
    <section className="soft-card rounded-[28px] p-6 sm:p-9">
      {testResult.timedOut && <p className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-semibold text-amber-800 dark:text-amber-200" role="status" data-testid="text-skills-time-expired">انتهى الوقت وتم تسليم إجاباتك</p>}
      <div className="text-center">
        <p className="text-sm font-semibold text-muted-foreground">الدرجة الكلية</p>
        <p className="mt-2 text-5xl font-extrabold" data-testid="text-skills-total">{testResult.score} <span className="text-2xl text-muted-foreground">/ 25</span></p>
        <p className="mt-2 text-sm text-muted-foreground" data-testid="text-skills-percent">{Math.round(testResult.score / 25 * 100)}%</p>
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {assessmentData.dimensions.map(dimension => {
          const score = testResult.dimensionScores[dimension.name] ?? 0;
          return <article key={dimension.name} className="rounded-2xl border border-border bg-card p-4" data-testid={`card-skills-dimension-${dimension.items[0]}`}>
            <div className="flex items-center justify-between gap-3"><h2 className="font-bold">{dimension.name}</h2><span className="text-sm font-extrabold tabular-nums">{score} / 5</span></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${score / 5 * 100}%` }} /></div>
            <p className="mt-2 text-xs text-muted-foreground">{Math.round(score / 5 * 100)}%</p>
          </article>;
        })}
      </div>
    </section>
    {SHOW_ANSWER_REVIEW && <div className="sr-only" aria-hidden="true" />}
    <div className="mt-6 flex flex-wrap justify-center gap-3">
      <button type="button" onClick={() => { setTestResult(null); removeStorage(storageKeys.skillsResult); removeStorage(storageKeys.skillsAnswers); removeStorage(storageKeys.skillsStartedAt); setAnswers({}); setStartedAt(null); setIndex(0); submitted.current = false; }} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 font-bold text-primary-foreground" data-testid="button-skills-retake">إعادة الاختبار<Target size={17} /></button>
      <Link href="/progress" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border px-6 font-bold hover:bg-muted">العودة إلى لوحة التقدم<ArrowRight size={17} /></Link>
    </div>
  </div>;

  if (startedAt === null) return <div className="page-wrap max-w-3xl py-10 sm:py-16" dir="rtl">
    <Link href="/" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"><ArrowRight size={17} />العودة للرئيسية</Link>
    <div className="soft-card rounded-[28px] p-5 sm:p-9">
      <p className="text-sm font-bold text-primary">اختبار مستقل عن تحديد المسار</p>
      <h1 className="mt-2 text-3xl font-extrabold">{assessmentData.title}</h1>
      <section className="mt-6 space-y-4 text-sm leading-8 text-muted-foreground" aria-label="تعليمات الاختبار">
        {assessmentData.instructions.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
      </section>
      <p className="mt-5 rounded-2xl bg-muted/60 p-4 text-sm font-semibold">عدد الأسئلة: {questions.length} · الوقت: {SKILLS_TEST_TIMER_MINUTES} دقيقة · لا يتم خلط ترتيب الأسئلة.</p>
      <button type="button" onClick={begin} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 font-bold text-primary-foreground transition hover:opacity-90" data-testid="button-start-skills-test">ابدأ الاختبار<Target size={17} /></button>
    </div>
  </div>;

  if (!question) return <div className="page-wrap py-12"><div className="soft-card rounded-3xl p-8 text-center"><h1 className="text-2xl font-bold">الاختبار غير متاح</h1><p className="mt-3 text-muted-foreground">تعذّر العثور على السؤال الحالي.</p></div></div>;

  const selectedKey = answers[question.id];
  return <div className="page-wrap max-w-3xl py-10 sm:py-16" dir="rtl">
    <Link href="/progress" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"><ArrowRight size={17} />لوحة التقدم</Link>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-sm font-bold text-primary">اختبار مهارات التفكير التصميمي</p><h1 className="mt-2 text-3xl font-extrabold">السؤال {index + 1}</h1></div>
      <div className="flex items-center gap-2"><span className="rounded-full bg-muted px-4 py-2 text-sm font-bold" data-testid="text-skills-count">{index + 1} من {questions.length}</span><span className={`rounded-full px-4 py-2 text-sm font-bold tabular-nums ${secondsLeft <= 120 ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-muted text-foreground'}`} role="timer" aria-label="الوقت المتبقي" data-testid="text-skills-timer">{formatRemainingTime(secondsLeft)}</span></div>
    </div>
    <div className="mb-6 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${answeredCount / questions.length * 100}%` }} /></div>
    <div className="soft-card rounded-[28px] p-5 sm:p-9" key={question.id}>
      <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><CircleHelp size={20} /></span><div className="min-w-0"><span className="inline-flex rounded-full bg-secondary/10 px-3 py-1 text-xs font-bold text-secondary">{question.dimension}</span><h2 className="mt-4 min-h-[90px] text-xl font-bold leading-9 sm:text-2xl" data-testid={`text-skills-question-${question.id}`}>{question.prompt}</h2></div></div>
      <div className="mt-7 grid gap-2.5" role="radiogroup" aria-label="اختر إجابة واحدة">
        {question.options.map(option => <button key={option.key} type="button" role="radio" aria-checked={selectedKey === option.key} onClick={() => setAnswer(option.key)} className={`flex min-h-14 items-start justify-between gap-4 rounded-2xl border px-4 py-4 text-start transition ${selectedKey === option.key ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/40 hover:bg-muted/40'}`} data-testid={`answer-skills-${question.id}-${option.key}`}><span className="font-semibold leading-7"><bdi className="me-2">{option.key})</bdi>{option.text}</span><span className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${selectedKey === option.key ? 'border-primary bg-primary text-white' : 'border-muted-foreground/40'}`}>{selectedKey === option.key && <Check size={13} />}</span></button>)}
      </div>
    </div>
    <div className="mt-5 flex items-center justify-between gap-3">
      <button type="button" onClick={() => setIndex(current => Math.max(0, current - 1))} disabled={index === 0} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border px-5 font-bold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"><ArrowRight size={17} />السابق</button>
      {index < questions.length - 1
        ? <button type="button" onClick={() => setIndex(current => current + 1)} disabled={!selectedKey} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">التالي<ArrowLeft size={17} /></button>
        : <button type="button" onClick={() => finish()} disabled={answeredCount !== questions.length} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-submit-skills-test">تسليم الاختبار<Target size={17} /></button>}
    </div>
  </div>;
}
