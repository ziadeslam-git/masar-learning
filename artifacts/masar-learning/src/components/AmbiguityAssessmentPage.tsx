import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, ArrowRight, Check, CircleHelp, Target } from 'lucide-react';
import assessmentData from '@/data/assessment-ambiguity.json';
import { getLearningPath, AMBIGUITY_TIMER_MINUTES, LOW_MAX, HIGH_MIN } from '@/lib/config';
import { calculateAssessmentScore, hasCompleteAssessmentResponses, isValidLikertResponse } from '@/lib/assessment';
import { appendAttempt, type AssessmentAttempt } from '@/lib/attempts';
import { formatRemainingTime, remainingSeconds } from '@/lib/skills-test';
import { readStorage, removeStorage, storageKeys, writeStorage, type AssessmentResult } from '@/lib/storage';
import { Link } from 'wouter';

const questions = assessmentData.questions;
const durationSeconds = AMBIGUITY_TIMER_MINUTES * 60;

function readAttempts(): AssessmentAttempt[] {
  const stored = readStorage<unknown>(storageKeys.attempts, []);
  if (!Array.isArray(stored)) return [];
  return stored.filter((item): item is AssessmentAttempt => {
    if (item === null || typeof item !== 'object') return false;
    const attempt = item as Record<string, unknown>;
    return typeof attempt.date === 'string'
      && Number.isFinite(attempt.score)
      && (attempt.score as number) >= 20
      && (attempt.score as number) <= 100
      && (attempt.path === 'structured' || attempt.path === 'guided' || attempt.path === 'open');
  }).slice(-5);
}

export function AmbiguityAssessmentPage() {
  const [, setLocation] = useLocation();
  const freshStart = new URLSearchParams(window.location.search).get('fresh') === '1';
  const [answers, setAnswers] = useState<Record<string, number>>(() => freshStart ? {} : readStorage(storageKeys.answers, {}));
  const [startedAt, setStartedAt] = useState<number | null>(() => freshStart ? null : readStorage(storageKeys.ambiguityStartedAt, null));
  const [index, setIndex] = useState(() => {
    if (freshStart) return 0;
    const saved = readStorage<Record<string, number>>(storageKeys.answers, {});
    const first = questions.findIndex(question => !isValidLikertResponse(saved[question.id]));
    return first < 0 ? 0 : first;
  });
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const savedStart = freshStart ? null : readStorage<number | null>(storageKeys.ambiguityStartedAt, null);
    return savedStart === null ? durationSeconds : remainingSeconds(savedStart, AMBIGUITY_TIMER_MINUTES);
  });
  const answeredCount = questions.filter(question => isValidLikertResponse(answers[question.id])).length;
  const question = questions[index];

  useEffect(() => {
    if (!freshStart) return;
    removeStorage(storageKeys.answers);
    removeStorage(storageKeys.ambiguityStartedAt);
    setAnswers({});
    setStartedAt(null);
    setIndex(0);
    setLocation('/assessment');
  }, [freshStart, setLocation]);

  useEffect(() => {
    if (startedAt === null) return;
    const update = () => setSecondsLeft(remainingSeconds(startedAt, AMBIGUITY_TIMER_MINUTES));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [startedAt]);

  const start = () => {
    const startTime = Date.now();
    const emptyAnswers = {};
    setAnswers(emptyAnswers);
    setIndex(0);
    setSecondsLeft(durationSeconds);
    setStartedAt(startTime);
    writeStorage(storageKeys.answers, emptyAnswers);
    writeStorage(storageKeys.ambiguityStartedAt, startTime);
  };

  const setAnswer = (value: number) => {
    if (!question) return;
    const next = { ...answers, [question.id]: value };
    setAnswers(next);
    writeStorage(storageKeys.answers, next);
  };

  const finish = () => {
    if (!hasCompleteAssessmentResponses(questions, answers)) return;
    const score = calculateAssessmentScore(questions, answers);
    const result: AssessmentResult = { version: 2, score, path: getLearningPath(score), responses: answers };
    const attempt: AssessmentAttempt = { date: new Date().toISOString(), score, path: result.path };
    writeStorage(storageKeys.attempts, appendAttempt(readAttempts(), attempt));
    writeStorage(storageKeys.result, result);
    removeStorage(storageKeys.ambiguityStartedAt);
    setLocation('/result');
  };

  if (startedAt === null) return <div className="page-wrap max-w-3xl py-6 pb-24 sm:py-16 sm:pb-16">
    <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary" data-testid="link-assessment-home"><ArrowRight size={17} />العودة للرئيسية</Link>
    <div className="soft-card rounded-[28px] p-5 sm:p-9" dir="rtl">
      <p className="text-sm font-bold text-primary">مقياس تحديد مسار التعلّم</p>
      <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold">مقياس تحمّل الغموض</h1>
      <section className="mt-6 space-y-4 text-sm leading-8 text-muted-foreground" aria-label="تعليمات الاختبار">
        {assessmentData.instructionIntro.map((paragraph, paragraphIndex) => <p key={`intro-${paragraphIndex}`}>{paragraph}</p>)}
      </section>
      <section className="mt-6 rounded-2xl bg-muted/60 p-4 sm:p-5" aria-label="تعليمات المقياس">
        <h2 className="font-bold text-foreground">تعليمات المقياس</h2>
        <ul className="mt-3 list-inside list-disc space-y-2 text-sm leading-7 text-muted-foreground">
          {assessmentData.instructions.map((instruction, instructionIndex) => <li key={instructionIndex}>{instruction}</li>)}
        </ul>
        <p className="mt-4 text-sm font-semibold text-foreground">الوقت المقترح: {AMBIGUITY_TIMER_MINUTES} دقيقة.</p>
      </section>
      <button type="button" onClick={start} className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-bold text-primary-foreground transition hover:opacity-90 w-full sm:w-auto" data-testid="button-start-assessment">ابدأ<Target size={17} /></button>
    </div>
  </div>;

  if (!question) return <div className="page-wrap py-12"><div className="soft-card rounded-3xl p-8 text-center"><h1 className="text-2xl font-bold">التقييم غير متاح</h1><p className="mt-3 text-muted-foreground">تعذّر العثور على العبارة الحالية. أعد تحميل الصفحة أو ابدأ من جديد.</p></div></div>;

  const selectedValue = answers[question.id];
  return <div className="page-wrap max-w-3xl py-6 pb-24 sm:py-16 sm:pb-16">
    <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary" data-testid="link-assessment-home"><ArrowRight size={17} />العودة للرئيسية</Link>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-sm font-bold text-primary">مقياس تحديد مسار التعلّم</p><h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold">تحمّل الغموض</h1></div>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-muted px-3.5 py-1.5 text-xs sm:text-sm font-bold" data-testid="text-assessment-count">{index + 1} من {questions.length}</span>
        <span className={`rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-bold tabular-nums ${secondsLeft <= 120 ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-muted text-foreground'}`} role="timer" aria-label="الوقت المتبقي" data-testid="text-assessment-timer">{formatRemainingTime(secondsLeft)}</span>
      </div>
    </div>
    <div className="mb-6 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${(answeredCount / questions.length) * 100}%` }} /></div>
    {secondsLeft === 0 && <p className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-semibold text-amber-800 dark:text-amber-200" role="status" data-testid="text-assessment-time-expired">انتهى الوقت المقترح. يمكنك متابعة الإجابة وإرسالها بعد الإجابة على جميع العبارات.</p>}
    <div className="soft-card rounded-[28px] p-5 sm:p-9" key={question.id}>
      <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><CircleHelp size={20} /></span><div className="min-w-0 flex-1"><span className="inline-flex rounded-full bg-secondary/10 px-3 py-1 text-xs font-bold text-secondary">عبارة {question.number}</span><h2 className="mt-3 sm:mt-4 min-h-0 sm:min-h-[80px] text-lg sm:text-2xl font-bold leading-8 sm:leading-9" data-testid={`text-question-${question.id}`}>{question.prompt}</h2></div></div>
      <div className="mt-6 sm:mt-7 grid gap-2.5" role="radiogroup" aria-label="اختر درجة موافقتك">
        {assessmentData.responseOptions.map(option => <button key={option.value} type="button" role="radio" aria-checked={selectedValue === option.value} onClick={() => setAnswer(option.value)} className={`flex min-h-12 sm:min-h-14 items-center justify-between rounded-2xl border px-3.5 py-3 sm:px-4 text-start transition ${selectedValue === option.value ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/40 hover:bg-muted/40'}`} data-testid={`answer-${question.id}-${option.value}`}><span className="font-semibold text-sm sm:text-base">{option.label}</span><span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${selectedValue === option.value ? 'border-primary bg-primary text-white' : 'border-muted-foreground/40'}`}>{selectedValue === option.value && <Check size={13} />}</span></button>)}
      </div>
      <p className="mt-5 text-center text-xs leading-6 text-muted-foreground">اختر إجابة واحدة لكل عبارة. لا توجد إجابة افتراضية.</p>
    </div>
    <div className="mt-5 flex items-center justify-between gap-3">
      <button type="button" onClick={() => setIndex(current => Math.max(0, current - 1))} disabled={index === 0} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border px-4 sm:px-5 text-sm sm:text-base font-bold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-assessment-previous"><ArrowRight size={17} />السابق</button>
      {index < questions.length - 1
        ? <button type="button" onClick={() => setIndex(current => current + 1)} disabled={!isValidLikertResponse(selectedValue)} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 sm:px-6 text-sm sm:text-base font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-assessment-next">التالي<ArrowLeft size={17} /></button>
        : <button type="button" onClick={finish} disabled={!hasCompleteAssessmentResponses(questions, answers)} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 sm:px-6 text-sm sm:text-base font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-assessment-finish">اعرض درجتي<Target size={17} /></button>}
    </div>
    <p className="mt-4 text-center text-xs text-muted-foreground">الحدود: المنظّم أقل من {LOW_MAX} · الموجّه من {LOW_MAX} إلى {HIGH_MIN - 1} · المفتوح {HIGH_MIN} فأعلى</p>
  </div>;
}
