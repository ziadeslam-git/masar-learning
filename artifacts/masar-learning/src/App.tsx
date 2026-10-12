import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Logo } from '@/components/Logo';
import { estimateReadingMinutes, LessonMarkdown } from '@/components/LessonMarkdown';
import { AmbiguityAssessmentPage } from '@/components/AmbiguityAssessmentPage';
import { SkillsTestPage } from '@/components/SkillsTestPage';
import { Route, Switch, Link, useLocation, Router as WouterRouter } from 'wouter';
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, CheckCircle2, ChevronLeft, CircleHelp, Compass, Layers3, Moon, Sun, Target, TrendingUp } from 'lucide-react';
import curriculumData from '@/data/curriculum.json';
import studentPortrait from '@assets/hero-student_1791493499089.png';
import { MAIN_NAV_ITEMS, MobileBottomNav } from '@/components/MobileBottomNav';
import { DEVELOPER_CONTACT_URL, DEVELOPER_NAME, OPEN_PATH_THRESHOLD, SITE_NAME, STRUCTURED_PATH_THRESHOLD, type LearningPath } from '@/lib/config';
import { appendAttempt, getPreviousAttempt, getScoreDifference, type AssessmentAttempt } from '@/lib/attempts';
import { readAssessmentResult, readSkillsTestResult, readStorage, removeStorage, storageKeys, writeStorage, type AssessmentResult as Result } from '@/lib/storage';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type Lesson = { id: string; title: string; markdown: string };
type Chapter = { id: number; order: number; title: string; lessons: Lesson[] };
const chapters = (curriculumData as { chapters: Chapter[] }).chapters;
const orderedChapters = [...chapters].sort((a, b) => a.order - b.order);
const lessonFontSizeKey = 'masar-lesson-font-size';
const queryClient = new QueryClient();

function readLessonFontSize() {
  try {
    const saved = Number(localStorage.getItem(lessonFontSizeKey));
    return Number.isInteger(saved) && saved >= 16 && saved <= 22 ? saved : 18;
  } catch { return 18; }
}
function readAttempts(): AssessmentAttempt[] {
  const stored = readStorage<unknown>(storageKeys.attempts, []);
  if (!Array.isArray(stored)) return [];
  return stored.filter((item): item is AssessmentAttempt => {
    if (item === null || typeof item !== 'object') return false;
    const candidate = item as Record<string, unknown>;
    return typeof candidate.date === 'string'
      && Number.isFinite(candidate.score)
      && (candidate.score as number) >= 0
      && (candidate.score as number) <= 100
      && (candidate.path === 'structured' || candidate.path === 'guided' || candidate.path === 'open');
  }).slice(-5);
}
const pathInfo = {
  structured: { title: 'المسار المنظّم', subtitle: 'خطوة واضحة، ثم خطوة أخرى.', color: 'text-blue-600', bg: 'bg-blue-500/10', accent: '#3B82F6', description: 'تسلسل تعلّم ثابت يساعدك على بناء الفهم بثقة. أكمل كل درس قبل الانتقال إلى التالي.' },
  guided: { title: 'المسار الموجّه', subtitle: 'خريطة مرنة مع مساحة للاختيار.', color: 'text-teal-600', bg: 'bg-teal-500/10', accent: '#14B8A6', description: 'نقترح لك بداية مناسبة، ويمكنك استكشاف الدروس الأخرى متى أردت.' },
  open: { title: 'المسار المفتوح', subtitle: 'فضولك هو نقطة البداية.', color: 'text-orange-600', bg: 'bg-orange-500/10', accent: '#F97316', description: 'المحتوى كله متاح لك. ابدأ من السؤال الذي يشغلك واتبع اهتمامك.' },
};
const learningPaths: LearningPath[] = ['structured', 'guided', 'open'];

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><AppShell><Switch>
    <Route path="/" component={HomePage} />
    <Route path="/assessment" component={AmbiguityAssessmentPage} />
    <Route path="/result" component={ResultPage} />
    <Route path="/skills-test" component={SkillsTestPage} />
    <Route path="/chapters" component={ChaptersPage} />
    <Route path="/progress" component={ProgressPage} />
    <Route path="/path/:path" component={PathPage} />
    <Route path="/chapter/:n" component={ChapterPage} />
    <Route component={NotFound} />
  </Switch></AppShell></ErrorBoundary>;
}

function AppShell({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => readStorage(storageKeys.theme, 'light'));
  const [location] = useLocation();
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    writeStorage(storageKeys.theme, theme);
  }, [theme]);
  const result = readAssessmentResult();
  const activePath = location.startsWith('/path') ? location.split('/')[2] : result?.path;
  const hasResult = Boolean(result);

  return <div className="app-shell flex min-h-[100dvh] flex-col" dir="rtl">
    <header className="topbar">
      <div className="page-wrap flex min-h-[64px] sm:min-h-[72px] items-center justify-between gap-2 sm:gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-2.5 no-underline" data-testid="link-brand">
          <Logo size={32} className="shrink-0 sm:h-10 sm:w-10" />
          <span className="text-lg sm:text-[20px] font-bold leading-none text-foreground">مسار</span>
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <nav className="hidden md:flex items-center gap-1 sm:gap-2" aria-label="التنقل الرئيسي">
            {MAIN_NAV_ITEMS.filter(item => !item.showWhen || item.showWhen(hasResult)).map(item => {
              const active = item.isActive(location);
              const href = item.getHref ? item.getHref(activePath) : item.href;
              return (
                <Link
                  key={item.id}
                  href={href}
                  className={`nav-link rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  data-testid={item.testId}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            aria-label={theme === 'light' ? 'تفعيل الوضع الداكن' : 'تفعيل الوضع الفاتح'}
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="nav-link grid h-9 w-9 sm:h-10 sm:w-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-foreground hover:bg-muted"
            data-testid="button-theme"
          >
            {theme === 'light' ? <Moon size={17} className="sm:size-[18px]" /> : <Sun size={17} className="sm:size-[18px]" />}
          </button>
        </div>
      </div>
    </header>
    <main className="flex-1 pb-20 md:pb-0">{children}</main>
    <footer className="mt-16 sm:mt-20 border-t border-border/80 py-8 pb-24 md:pb-8">
      <div className="page-wrap flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
        <span className="flex items-center gap-3"><Logo size={36} className="shrink-0" /><span className="max-w-3xl text-center text-sm font-bold leading-6 text-foreground sm:text-start">{SITE_NAME}</span></span>
        <span className="shrink-0 text-center sm:text-end">بيئة تجريبية تحفظ تقدّمك على هذا الجهاز فقط.</span>
      </div>
      <div className="page-wrap mt-6 border-t border-border/50 pt-5 text-center text-xs text-muted-foreground sm:text-sm">
        <span>تم إنشاء وتطوير هذا الموقع بواسطة </span>
        <a
          href={DEVELOPER_CONTACT_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`التواصل مع المطوّر ${DEVELOPER_NAME} (يفتح في نافذة جديدة)`}
          className="group inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 transition-colors hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span>{DEVELOPER_NAME}</span>
          <ArrowUpRight size={15} className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </a>
        <span> للتواصل</span>
      </div>
    </footer>
    <MobileBottomNav location={location} activePath={activePath} hasResult={hasResult} />
  </div>;
}

function HomePage() {
  const result = readAssessmentResult();
  const [done, setDone] = useState<string[]>(() => readStorage<string[]>(storageKeys.done, []));
  const completedCount = done.length;
  return <div className="hero-grid overflow-hidden">
    <section className="page-wrap grid min-h-0 md:min-h-[570px] items-center gap-8 py-8 sm:py-12 md:py-16 md:grid-cols-[1.04fr_.96fr]">
      <div className="reveal order-2 max-w-[620px] md:order-1">
        <h1 className="text-[clamp(1.5rem,5.2vw,2.55rem)] font-extrabold leading-[1.38] tracking-tight text-foreground [text-wrap:balance]">
          بيئة تعلم قائمة على تطبيقات <span className="text-primary">الذكاء الاصطناعي</span> لتنمية <span className="text-primary">التفكير التصميمي</span> ومهارات <span className="text-primary">إنتاج المعرفة</span> لدى مختلفي مستوى تحمل الغموض
        </h1>
        <div className="mt-6 sm:mt-8 flex flex-col xs:flex-row sm:flex-row flex-wrap gap-3">
          <Link href={result ? `/path/${result.path}` : '/assessment'} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 font-bold text-primary-foreground shadow-[0_10px_22px_rgba(79,70,229,.18)] transition hover:-translate-y-0.5 w-full xs:w-auto sm:w-auto" data-testid="link-start-learning">{result ? 'متابعة المسار' : 'بدء التقييم'}<ArrowLeft size={18} /></Link>
          <Link href="/chapters" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card/80 px-5 py-3 font-semibold text-foreground transition hover:bg-muted w-full xs:w-auto sm:w-auto" data-testid="link-browse-home">استعراض المقرر<ChevronLeft size={17} /></Link>
        </div>
        <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-xs sm:text-sm text-muted-foreground"><span className="flex items-center gap-2 shrink-0"><CheckCircle2 size={17} className="text-secondary shrink-0" />محتوى المقرر الجامعي</span><span className="flex items-center gap-2 shrink-0"><BookOpen size={17} className="text-orange-500 shrink-0" />حفظ التقدم محليًا</span></div>
      </div>
      <div className="reveal-delay relative order-1 mx-auto flex h-[310px] sm:h-[380px] md:h-[460px] w-full max-w-[340px] sm:max-w-[420px] md:max-w-[480px] items-end justify-center md:order-2">
        <div className="absolute inset-x-4 bottom-2 sm:bottom-4 top-6 sm:top-8 rounded-[45%_45%_22%_22%] bg-gradient-to-br from-[#d8e9e6] via-[#e3e4f6] to-[#fce4cd] dark:from-[#263c43] dark:via-[#333252] dark:to-[#45382f]" />
        <div className="absolute left-4 top-12 hidden h-20 w-20 rounded-3xl border border-white/50 bg-white/35 backdrop-blur md:block" />
        <div className="absolute right-2 top-8 sm:top-14 md:right-1 md:top-28 grid h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 place-items-center rounded-2xl bg-card shadow-md md:shadow-lg"><BookOpen className="text-primary size-5 sm:size-5 md:size-6" /></div>
        <img src={studentPortrait} alt="طالب جامعي يستعد لرحلته التعليمية" className="relative z-10 h-[285px] sm:h-[355px] md:h-[455px] w-auto max-w-full object-contain object-bottom drop-shadow-[0_22px_24px_rgba(39,45,68,.18)]" data-testid="img-student-portrait" />
        <div className="absolute bottom-2 left-1 sm:bottom-4 sm:left-0 md:bottom-8 md:left-0 z-20 rounded-xl sm:rounded-2xl border border-border/70 bg-card/95 px-3 py-2 sm:px-4 sm:py-3 shadow-md md:shadow-lg backdrop-blur"><span className="block text-[11px] sm:text-xs text-muted-foreground">تعلّم جامعي</span><span className="mt-0.5 sm:mt-1 block text-xs sm:text-sm font-bold">من الفهم إلى التطبيق</span></div>
      </div>
    </section>
    <section className="page-wrap pb-12">
      <div className="soft-card grid gap-5 rounded-[28px] p-5 sm:grid-cols-3 sm:gap-0 sm:p-7">
        <Step number="01" title="أجب عن التقييم" description="تساعد الإجابات على تقدير مستوى تحمل الغموض." color="text-primary" />
        <Step number="02" title="راجع المسار المقترح" description="اختر بين التدرج، والإرشاد، وحرية الاستكشاف." color="text-secondary" />
        <Step number="03" title="تابع إنجاز الدروس" description="محتوى المقرر مع سجل تقدم محلي." color="text-orange-500" />
      </div>
      <section className="mt-8" aria-labelledby="learning-paths-heading">
        <div className="mb-5 max-w-2xl"><p className="text-sm font-bold text-secondary">أنماط تنظيم التعلّم</p><h2 id="learning-paths-heading" className="mt-1 text-2xl font-extrabold">المسارات التعليمية</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">تُعرض المسارات الثلاثة هنا، ويقترح التقييم نقطة بداية وفق الإجابات.</p></div>
        <div className="grid gap-4 md:grid-cols-3">
          {learningPaths.map(path => {
            const info = pathInfo[path];
            const isCurrent = result?.path === path;
            const href = !result ? '/assessment' : isCurrent ? `/path/${path}` : '/assessment?fresh=1';
            const action = !result ? 'ابدأ التقييم' : isCurrent ? 'عرض تفاصيل المسار' : 'أعد التقييم لاستكشافه';
            return <article key={path} className="soft-card flex flex-col rounded-[24px] p-5" data-testid={`card-path-${path}`} aria-current={isCurrent ? 'true' : undefined}>
              <div className="flex items-center justify-between gap-3"><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${info.bg} ${info.color}`}>{isCurrent ? 'المسار الحالي' : 'مسار تعلّم'}</span><PathAnimation path={path} className="h-11 w-20" /></div>
              <h3 className={`mt-4 text-lg font-extrabold ${info.color}`}>{info.title}</h3>
              <p className="mt-2 min-h-[72px] text-sm leading-6 text-muted-foreground">{info.description}</p>
              <Link href={href} className="mt-auto inline-flex items-center gap-2 pt-4 text-sm font-bold text-primary hover:underline" data-testid={`link-card-path-${path}`}>{action}<ArrowLeft size={15} /></Link>
            </article>;
          })}
        </div>
      </section>
      <div className="mt-7 flex flex-col justify-between gap-4 rounded-[26px] bg-[#252b49] p-6 text-white sm:flex-row sm:items-center sm:p-8">
        <div><p className="text-sm text-white/65">{result ? 'مرحبًا بعودتك' : 'دون حساب، ودون ضغط'}</p><h2 className="mt-1 text-xl font-bold">{result ? `مسارك الحالي: ${pathInfo[result.path].title}` : 'تقدّمك يبقى على جهازك'}</h2><p className="mt-2 text-sm text-white/65">{result ? `أكملت ${completedCount} درس${completedCount === 1 ? 'ًا' : 'ًا'} حتى الآن.` : 'إجاباتك وإنجازك لا تغادر متصفحك.'}</p></div>
        <Link href={result ? '/progress' : '/assessment'} className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#252b49] transition hover:-translate-y-0.5 sm:self-center" data-testid="link-journey-cta">{result ? 'عرض التقدّم' : 'ابدأ التقييم'}<ArrowLeft size={17} /></Link>
      </div>
    </section>
    <section className="page-wrap pb-8">
      <div className="mb-5 flex items-end justify-between gap-3"><div><p className="text-sm font-bold text-secondary">المقرر الدراسي</p><h2 className="mt-1 text-2xl font-extrabold">فصول المقرر</h2></div><Link href="/chapters" className="text-sm font-bold text-primary" data-testid="link-all-chapters">كل الفصول ←</Link></div>
      <div className="grid gap-3 sm:grid-cols-2">{orderedChapters.slice(0, 4).map((chapter, i) => <ChapterTeaser key={chapter.id} chapter={chapter} index={i} />)}</div>
    </section>
  </div>;
}

function PathAnimation({ path, className = '' }: { path: LearningPath; className?: string }) {
  return <svg
    aria-hidden="true"
    className={`path-animation ${className}`}
    focusable="false"
    role="presentation"
    style={{ color: pathInfo[path].accent }}
    viewBox="0 0 80 44"
    xmlns="http://www.w3.org/2000/svg"
  >
    {path === 'structured' && <>
      <path className="path-animation-track" d="M10 22 H70" />
      {[10, 22, 34, 46, 58, 70].map((x, index) => <circle
        key={x}
        className="path-animation-motion path-animation-structured-dot"
        cx={x}
        cy="22"
        r="3"
        style={{ animationDelay: `${index * 0.24}s` }}
      />)}
    </>}
    {path === 'guided' && <>
      <path className="path-animation-track" d="M8 32 C24 5 56 5 72 32" />
      <g className="path-animation-motion path-guided-traveler">
        <circle cx="0" cy="0" r="5.5" fill="none" opacity="0.28" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="0" cy="0" r="3.2" fill="currentColor" />
      </g>
    </>}
    {path === 'open' && <>
      <path className="path-animation-track" d="M40 22 C29 18 20 12 11 10 M40 22 C31 26 21 31 13 35 M40 22 C49 17 59 10 69 8 M40 22 C50 26 60 31 68 35 M40 22 C42 15 46 9 52 5 M40 22 C35 16 32 10 29 6" />
      <circle className="path-animation-motion path-animation-open-center" cx="40" cy="22" r="3.3" />
      {[[11, 10], [13, 35], [69, 8], [68, 35], [52, 5], [29, 6]].map(([x, y], index) => <circle
        key={`${x}-${y}`}
        className={`path-animation-motion path-animation-open-node path-animation-open-node-${index + 1}`}
        cx={x}
        cy={y}
        r="2.8"
        style={{ animationDelay: `${index * 0.3}s` }}
      />)}
    </>}
  </svg>;
}

function Step({ number, title, description, color }: { number: string; title: string; description: string; color: string }) {
  return <div className="flex gap-4 sm:px-5 sm:first:ps-0 sm:last:pe-0 sm:not(:last-child):border-e sm:not(:last-child):border-border"><span className={`mt-1 font-mono text-sm font-bold ${color}`}>{number}</span><div><h3 className="font-bold">{title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p></div></div>;
}
function ChapterTeaser({ chapter, index }: { chapter: Chapter; index: number }) {
  return <Link href={`/chapter/${chapter.order}`} className="soft-card group flex items-center gap-4 rounded-2xl p-4 transition hover:-translate-y-0.5 hover:border-primary/35" data-testid={`card-chapter-${chapter.order}`}>
    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl font-bold ${['bg-primary/10 text-primary', 'bg-teal-500/10 text-teal-600', 'bg-blue-500/10 text-blue-600', 'bg-orange-500/10 text-orange-600'][index % 4]}`}>{String(chapter.order).padStart(2, '0')}</span>
    <span className="min-w-0 flex-1"><span className="block truncate font-bold">{chapter.title}</span><span className="mt-1 block text-xs text-muted-foreground">{chapter.lessons.length} دروس · فصل {chapter.id} من المصدر</span></span>
    <ChevronLeft size={18} className="text-muted-foreground transition group-hover:-translate-x-1 group-hover:text-primary" />
  </Link>;
}

function ResultPage() {
  const result = readAssessmentResult();
  const [, setLocation] = useLocation();
  if (!result) return <Redirect to="/assessment" />;
  const info = pathInfo[result.path];
  const previousAttempt = getPreviousAttempt(readAttempts());
  const scoreDifference = previousAttempt ? getScoreDifference(result.score, previousAttempt.score) : null;
  const scoreDifferenceLabel = scoreDifference === null
    ? ''
    : scoreDifference > 0
      ? `ارتفعت النسبة ${scoreDifference} نقطة`
      : scoreDifference < 0
        ? `انخفضت النسبة ${Math.abs(scoreDifference)} نقطة`
        : 'لم تتغير النسبة';
  const formattedPreviousDate = previousAttempt && !Number.isNaN(Date.parse(previousAttempt.date))
    ? new Date(previousAttempt.date).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })
    : null;
  const beginRetake = () => {
    removeStorage(storageKeys.answers);
    removeStorage(storageKeys.ambiguityStartedAt);
    setLocation('/assessment?fresh=1');
  };
  return <div className="page-wrap max-w-4xl py-8 pb-24 sm:py-16 sm:pb-16">
    <div className="mb-8 text-center"><span className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-4 py-2 text-sm font-bold text-secondary"><CheckCircle2 size={17} />اكتمل الاستكشاف</span><h1 className="mt-5 text-3xl font-extrabold sm:text-4xl">هذه نقطة بداية جميلة.</h1><p className="mt-3 text-muted-foreground">لا توجد طريقة واحدة صحيحة للتعلّم. إليك ما قد يناسبك الآن.</p></div>
    <div className="soft-card relative overflow-hidden rounded-[30px] p-6 sm:p-10">
      <div className="absolute -left-10 -top-12 h-48 w-48 rounded-full opacity-10" style={{ background: info.accent }} />
     <div className="relative grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_250px]">
        <div><p className="text-sm font-bold text-muted-foreground">محاولتك الحالية · مؤشر الراحة مع الغموض</p><div className="mt-2 flex items-baseline gap-2"><span className="text-6xl font-extrabold tracking-tight" style={{ color: info.accent }} data-testid="text-result-score">{result.score}</span><span className="text-xl text-muted-foreground">/ 100</span></div><div className="mt-4 h-2.5 max-w-lg overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${result.score}%`, background: info.accent }} /></div><p className="mt-2 text-xs text-muted-foreground" data-testid="text-score-thresholds">منظّم: أقل من {STRUCTURED_PATH_THRESHOLD} · موجّه: {STRUCTURED_PATH_THRESHOLD}–{OPEN_PATH_THRESHOLD - 1} · مفتوح: {OPEN_PATH_THRESHOLD} فأعلى</p><h2 className={`mt-7 text-2xl font-extrabold ${info.color}`} data-testid="text-result-path">{info.title}</h2><p className="mt-2 max-w-xl leading-8 text-muted-foreground">{info.description}</p></div>
        {previousAttempt ? <aside className="rounded-2xl border border-border bg-card/90 p-5" data-testid="card-previous-attempt">
          <p className="text-sm font-bold text-muted-foreground">محاولتك السابقة</p>
          <p className="mt-3 flex items-baseline gap-2"><span className="text-4xl font-extrabold" data-testid="text-previous-score">{previousAttempt.score}</span><span className="text-sm text-muted-foreground">/ 100</span></p>
          <p className={`mt-2 font-bold ${pathInfo[previousAttempt.path].color}`} data-testid="text-previous-path">{pathInfo[previousAttempt.path].title}</p>
          {formattedPreviousDate && <p className="mt-2 text-xs text-muted-foreground">{formattedPreviousDate}</p>}
          <p className="mt-4 rounded-xl bg-muted/70 p-3 text-sm font-semibold" data-testid="text-score-difference">{scoreDifferenceLabel}</p>
        </aside> : <div className="mx-auto grid h-44 w-44 place-items-center rounded-full" style={{ background: `${info.accent}14` }}><div className="grid h-32 w-32 place-items-center rounded-full border-2" style={{ borderColor: `${info.accent}55` }}><div className="text-center"><Compass className="mx-auto" size={30} style={{ color: info.accent }} /><span className="mt-2 block text-sm font-bold">طريقك يبدأ هنا</span></div></div></div>}
      </div>
    </div>
    <div className="mt-6 grid gap-4 sm:grid-cols-3">
      <button onClick={() => setLocation(`/path/${result.path}`)} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-6 font-bold text-primary-foreground transition hover:-translate-y-0.5" data-testid="button-view-path">ابدأ {info.title}<ArrowLeft size={18} /></button>
      <Link href="/skills-test" className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-primary/25 bg-primary/5 px-4 text-center font-bold text-primary transition hover:-translate-y-0.5 hover:bg-primary/10" data-testid="link-skills-test-from-result">اختبار مهارات التفكير التصميمي<Target size={17} /></Link>
      <button type="button" onClick={beginRetake} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-border bg-card font-bold transition hover:bg-muted" data-testid="link-retake-assessment">أعد التقييم من جديد<TrendingUp size={17} /></button>
    </div>
    <p className="mt-6 text-center text-xs leading-6 text-muted-foreground">هذا التقييم التجريبي أداة للتأمل في تفضيلاتك وليس تشخيصًا أو حكمًا على قدراتك. يمكنك تغيير المسار في أي وقت.</p>
  </div>;
}

function Redirect({ to }: { to: string }) { const [, setLocation] = useLocation(); useEffect(() => { setLocation(to); }, [setLocation, to]); return <div className="page-wrap py-12"><Skeleton /></div>; }
function Skeleton() { return <div className="animate-pulse space-y-4"><div className="h-8 w-1/3 rounded-xl bg-muted" /><div className="h-48 rounded-3xl bg-muted" /><div className="h-8 w-2/3 rounded-xl bg-muted" /></div>; }

function PathPage({ params }: { params: { path?: string } }) {
  const result = readAssessmentResult();
  if (!result) return <Redirect to="/assessment" />;
  const path = params.path as Result['path'];
  const info = pathInfo[path];
  if (!info) return <NotFound />;
  const done = readStorage<string[]>(storageKeys.done, []);
  const isComplete = (lesson: Lesson) => done.includes(lesson.id);
  const isLocked = (chapterIndex: number, lessonIndex: number) => {
    if (path !== 'structured') return false;
    const lessons = orderedChapters.flatMap(c => c.lessons);
    const idx = lessons.findIndex(l => l.id === orderedChapters[chapterIndex]?.lessons[lessonIndex]?.id);
    return idx > 0 && !done.includes(lessons[idx - 1].id);
  };
  return <div className="page-wrap py-6 pb-24 sm:py-14 sm:pb-14">
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div><p className={`text-sm font-bold ${info.color}`}>رحلتك التعليمية</p><h1 className="mt-2 text-2xl sm:text-4xl font-extrabold" data-testid="text-path-title">{info.title}</h1><p className="mt-3 max-w-2xl leading-7 text-muted-foreground">{info.description}</p></div>
      <Link href="/result" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold" data-testid="link-path-result">نتيجتي <ChevronLeft size={16} /></Link>
    </div>
    <div className="mt-7 flex flex-wrap items-center gap-4 rounded-2xl p-4" style={{ background: `${info.accent}10` }}><PathAnimation path={path} className="h-11 w-20 shrink-0" /><div className="flex-1"><p className="font-bold">{info.subtitle}</p><p className="mt-1 text-sm text-muted-foreground">{path === 'structured' ? 'أكمل الدروس بالترتيب لفتح الخطوة التالية.' : path === 'guided' ? 'ابدأ بالمقترح أو اختر أي درس متاح.' : 'اختر أي فصل أو درس يناسب فضولك.'}</p></div><Link href="/progress" className="text-sm font-bold text-primary" data-testid="link-path-progress">تقدّمي ←</Link></div>
    <div className="mt-9 space-y-4">{orderedChapters.map((chapter, ci) => <section className="soft-card overflow-hidden rounded-3xl" key={chapter.id} data-testid={`section-path-chapter-${chapter.order}`}>
      <div className="flex items-center gap-4 border-b border-border p-5 sm:p-6"><span className={`grid h-12 w-12 place-items-center rounded-2xl font-extrabold ${info.bg} ${info.color}`}>{String(chapter.order).padStart(2, '0')}</span><div className="flex-1"><p className="text-xs text-muted-foreground">الفصل {chapter.order}</p><h2 className="mt-1 font-bold sm:text-lg">{chapter.title}</h2></div><span className="text-xs text-muted-foreground">{chapter.lessons.filter(isComplete).length}/{chapter.lessons.length} مكتمل</span></div>
      <div className="divide-y divide-border">{chapter.lessons.map((lesson, li) => {
        const locked = isLocked(ci, li);
        return <div key={lesson.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-6">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${isComplete(lesson) ? 'bg-secondary/10 text-secondary' : locked ? 'bg-muted text-muted-foreground' : 'bg-muted text-foreground'}`}>{isComplete(lesson) ? <Check size={17} /> : <BookOpen size={16} />}</span>
          <div className="min-w-0 flex-1"><p className={`truncate font-semibold ${locked ? 'text-muted-foreground' : ''}`}>{lesson.title}</p><p className="mt-1 text-xs text-muted-foreground">{isComplete(lesson) ? 'أكملت هذا الدرس' : locked ? 'يُفتح بعد إكمال الدرس السابق' : path === 'guided' && ci === 0 && li === 0 ? 'بداية مقترحة' : 'درس تعليمي'}</p></div>
          {locked ? <span className="rounded-lg bg-muted px-3 py-2 text-xs font-bold text-muted-foreground" aria-label="درس مقفل">مقفل</span> : <Link href={`/chapter/${chapter.order}?lesson=${encodeURIComponent(lesson.id)}`} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold text-primary hover:bg-primary/10" data-testid={`link-lesson-${lesson.id}`}>{isComplete(lesson) ? 'مراجعة' : 'ابدأ'}<ChevronLeft size={15} /></Link>}
        </div>;
      })}</div>
    </section>)}</div>
  </div>;
}

function ChaptersPage() {
  const result = readAssessmentResult();
  const done = readStorage<string[]>(storageKeys.done, []);
  return <div className="page-wrap py-6 pb-24 sm:py-14 sm:pb-14">
    <div className="max-w-2xl"><p className="text-sm font-bold text-secondary">مكتبة المقرر</p><h1 className="mt-2 text-2xl sm:text-4xl font-extrabold">محتوى تكنولوجيا التعليم</h1><p className="mt-3 leading-7 text-muted-foreground">أربعة فصول من المعرفة، مرتّبة لتتصفّحها بطريقتك. {result ? 'يمكنك متابعة مسارك أو استكشاف الفصول.' : 'ابدأ التقييم أولًا لفتح الدروس.'}</p></div>
    {!result && <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4"><p className="text-sm leading-6">لتجربة الدروس واختيار مسارك، ابدأ بتقييم تفضيلات التعلّم.</p><Link href="/assessment" className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground" data-testid="link-assessment-from-chapters">ابدأ التقييم</Link></div>}
    <div className="mt-8 grid gap-4 md:grid-cols-2">{orderedChapters.map((chapter, index) => {
      const completed = chapter.lessons.filter(l => done.includes(l.id)).length;
      return <article key={chapter.id} className="soft-card flex flex-col rounded-[26px] p-5 sm:p-6" data-testid={`card-chapter-list-${chapter.order}`}>
        <div className="flex items-start justify-between gap-3"><span className={`grid h-14 w-14 place-items-center rounded-2xl text-lg font-extrabold ${['bg-primary/10 text-primary', 'bg-teal-500/10 text-teal-600', 'bg-blue-500/10 text-blue-600', 'bg-orange-500/10 text-orange-600'][index]}`}>{String(chapter.order).padStart(2, '0')}</span><span className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">الفصل الأصلي {chapter.id}</span></div>
        <p className="mt-5 text-xs font-bold text-secondary">الفصل {chapter.order} · {chapter.lessons.length} دروس</p><h2 className="mt-1 text-xl font-extrabold leading-8">{chapter.title}</h2>
        <ul className="mt-4 space-y-2 border-t border-border pt-4">{chapter.lessons.slice(0, 3).map(l => <li key={l.id} className="flex items-center gap-2 text-sm text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-secondary" /><span className="line-clamp-1">{l.title}</span></li>)}</ul>
        <div className="mt-auto flex items-center justify-between pt-6"><span className="text-xs text-muted-foreground">{completed} من {chapter.lessons.length} مكتمل</span><Link href={result ? `/chapter/${chapter.order}` : '/assessment'} className="inline-flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/15" data-testid={`link-open-chapter-${chapter.order}`}>{result ? 'افتح الفصل' : 'ابدأ التقييم'}<ChevronLeft size={16} /></Link></div>
      </article>;
    })}</div>
  </div>;
}

function ChapterPage({ params }: { params: { n?: string } }) {
  const result = readAssessmentResult();
  const [location, setLocation] = useLocation();
  const chapterIndex = Number(params.n) - 1;
  const chapter = orderedChapters[chapterIndex];
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>(() => readStorage<string[]>(storageKeys.done, []));
  const [fontSize, setFontSize] = useState(readLessonFontSize);
  const [readingProgress, setReadingProgress] = useState(0);
  const readingContentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!result) { setLocation('/assessment'); return; }
    if (chapter) {
      const fromUrl = new URLSearchParams(window.location.search).get('lesson');
      setSelectedLessonId(fromUrl && chapter.lessons.some(l => l.id === fromUrl) ? fromUrl : chapter.lessons[0]?.id ?? null);
    }
  }, [chapter?.id, location, Boolean(result), setLocation]);
  const active = chapter?.lessons.find(l => l.id === selectedLessonId) ?? chapter?.lessons[0];
  useEffect(() => {
    try { localStorage.setItem(lessonFontSizeKey, String(fontSize)); } catch { /* Keep font controls usable when storage is unavailable. */ }
  }, [fontSize]);
  useEffect(() => {
    const update = () => {
      const content = readingContentRef.current;
      if (!content) { setReadingProgress(0); return; }
      const top = content.getBoundingClientRect().top + window.scrollY;
      const height = Math.max(content.offsetHeight, 1);
      const viewedThrough = window.scrollY + window.innerHeight - top;
      setReadingProgress(Math.max(0, Math.min(100, Math.round(viewedThrough / height * 100))));
    };
    let frame = 0;
    const scheduleUpdate = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(update);
    };
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleUpdate);
    if (readingContentRef.current) observer?.observe(readingContentRef.current);
    scheduleUpdate();
    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      observer?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [chapter?.id, active?.id, selectedLessonId]);
  if (!result) return <Redirect to="/assessment" />;
  if (!chapter) return <NotFound />;
  const path = result.path;
  const allLessons = orderedChapters.flatMap(c => c.lessons);
  const activeIndex = allLessons.findIndex(l => l.id === active?.id);
  const locked = path === 'structured' && activeIndex > 0 && !done.includes(allLessons[activeIndex - 1].id);
  const complete = active ? done.includes(active.id) : false;
  const markComplete = () => {
    if (!active || locked || complete) return;
    const next = [...done, active.id];
    writeStorage(storageKeys.done, next);
    setDone(next);
    const following = activeIndex < allLessons.length - 1 && !done.includes(active.id) ? allLessons[activeIndex + 1] : null;
    const followingChapter = following && orderedChapters.find(c => c.lessons.some(l => l.id === following.id));
    setLocation(following ? `/chapter/${followingChapter?.order}?lesson=${encodeURIComponent(following.id)}` : `/chapter/${chapter.order}`);
    setSelectedLessonId(following?.id ?? active.id);
  };
  const previous = allLessons[activeIndex - 1];
  const nextLesson = allLessons[activeIndex + 1];
  return <>
    <div className="lesson-reading-progress" role="progressbar" aria-label="تقدم القراءة" aria-valuemin={0} aria-valuemax={100} aria-valuenow={readingProgress} aria-valuetext={`${readingProgress}%`}><span style={{ width: `${readingProgress}%` }} /></div>
    <div className="page-wrap py-8 sm:py-11">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Link href="/chapters" className="hover:text-primary" data-testid="link-lesson-breadcrumb">الفصول</Link><ChevronLeft size={15} /><span className="font-semibold text-foreground">الفصل {chapter.order}</span></div><Link href={`/path/${path}`} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold" data-testid="link-back-to-path"><Compass size={16} />{pathInfo[path].title}</Link></div>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <article className="soft-card min-w-0 rounded-[28px] p-5 sm:p-9">
        <div className="border-b border-border pb-6"><p className="text-sm font-bold text-secondary">الفصل {chapter.order} · من المقرر الأصلي {chapter.id}</p><h1 className="mt-2 text-2xl font-extrabold leading-10 sm:text-3xl" data-testid="text-chapter-title">{chapter.title}</h1>{active && <><p className="mt-2 text-sm text-muted-foreground" data-testid="text-lesson-title">{active.title}</p><p className="mt-2 text-xs text-muted-foreground" data-testid="text-reading-time">زمن القراءة التقريبي: {estimateReadingMinutes(active.markdown)} دقائق</p></>}</div>
        <div className="lesson-reading-toolbar" role="group" aria-label="أدوات القراءة">
          <span>حجم الخط</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setFontSize(size => Math.max(16, size - 1))} disabled={fontSize <= 16} className="lesson-font-button" aria-label="تصغير الخط" data-testid="button-font-smaller">A−</button>
            <span className="min-w-12 text-center text-xs tabular-nums text-muted-foreground" aria-live="polite">{fontSize}px</span>
            <button type="button" onClick={() => setFontSize(size => Math.min(22, size + 1))} disabled={fontSize >= 22} className="lesson-font-button" aria-label="تكبير الخط" data-testid="button-font-larger">A+</button>
          </div>
        </div>
        {locked ? <div className="my-7 rounded-2xl border border-blue-400/25 bg-blue-500/5 p-6 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/10 text-blue-600"><Layers3 /></span><h2 className="mt-4 text-lg font-bold">هذا الدرس ينتظر خطوتك السابقة</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">في المسار المنظّم، نفتح الدروس بالتتابع حتى يبقى البناء واضحًا.</p><Link href={`/chapter/${Math.floor(activeIndex === 0 ? 0 : orderedChapters.find(c => c.lessons.some(l => l.id === allLessons[activeIndex - 1]?.id))?.order ?? 1)}?lesson=${encodeURIComponent(allLessons[activeIndex - 1]?.id ?? '')}`} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground" data-testid="link-previous-required">اذهب إلى الدرس السابق<ArrowLeft size={16} /></Link></div> : active ? <div ref={readingContentRef} data-testid="reading-content"><LessonMarkdown content={active.markdown} fontSize={fontSize} /></div> : <EmptyState title="لا توجد دروس في هذا الفصل بعد" detail="سيظهر محتوى الفصل عند توفره." />}
        {!locked && active && <PathLearningSupport key={active.id} path={path} lessonTitle={active.title} />}
        {!locked && active && <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-border pt-5"><button onClick={markComplete} disabled={complete} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 font-bold transition disabled:cursor-default w-full sm:w-auto ${complete ? 'border border-secondary/30 bg-secondary/10 text-secondary' : 'bg-secondary text-white hover:opacity-90'}`} data-testid="button-toggle-complete">{complete ? <><CheckCircle2 size={18} />أكملت هذا الدرس</> : <><Check size={18} />أنهيت الدرس</>}</button><div className="flex gap-2 justify-between sm:justify-start"><LessonNavLink lesson={previous} direction="previous" />{nextLesson && <LessonNavLink lesson={nextLesson} direction="next" />}</div></div>}
      </article>
      <aside className="soft-card rounded-[24px] p-5 lg:sticky lg:top-24">
        <p className="text-xs font-bold text-muted-foreground">محتويات الفصل {chapter.order}</p><h2 className="mt-1 font-extrabold">{chapter.title}</h2>
        <div className="mt-4 space-y-1.5">{chapter.lessons.map(lesson => {
          const selected = lesson.id === active?.id;
          return <button key={lesson.id} onClick={() => { setSelectedLessonId(lesson.id); setLocation(`/chapter/${chapter.order}?lesson=${encodeURIComponent(lesson.id)}`); }} className={`flex w-full items-start gap-2 rounded-xl p-3 text-start text-sm transition ${selected ? 'bg-primary/10 font-bold text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`} data-testid={`button-select-lesson-${lesson.id}`}><span className="mt-0.5">{done.includes(lesson.id) ? <CheckCircle2 size={16} className="text-secondary" /> : <BookOpen size={16} />}</span><span className="leading-6">{lesson.title}</span></button>;
        })}</div>
        <div className="mt-5 border-t border-border pt-4"><Link href="/progress" className="flex items-center justify-between rounded-xl bg-muted/60 p-3 text-sm font-semibold" data-testid="link-lesson-progress"><span>تقدّمك في المقرر</span><ChevronLeft size={16} /></Link></div>
      </aside>
    </div>
    </div>
  </>;
}

const designThinkingStages = [
  { title: 'التعاطف', task: 'من الطالب أو المعلم الذي يواجه تحديًا مرتبطًا بهذا الموضوع؟ تخيّل احتياجه من وجهة نظره.' },
  { title: 'التحديد', task: 'صغ التحدي في سؤال يبدأ بـ «كيف يمكننا…؟» ويركّز على احتياج تعليمي واضح.' },
  { title: 'توليد الأفكار', task: 'اقترح ثلاث طرق مختلفة لتطبيق فكرة الدرس، من دون تقييمها أثناء توليدها.' },
  { title: 'النموذج الأولي', task: 'ارسم أو صف نموذجًا مبسطًا لنشاط تعليمي يوظف الفكرة التي تعلمتها.' },
  { title: 'الاختبار', task: 'تخيّل عرض نموذجك على طالب آخر: ما الملاحظة التي ستطلبها، وما التعديل الذي ستجربه؟' },
];

function PathLearningSupport({ path, lessonTitle }: { path: LearningPath; lessonTitle: string }) {
  const [hintOpen, setHintOpen] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);

  if (path === 'structured') {
    return <section className="mt-7 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 sm:p-6" data-testid="support-structured">
      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300"><Layers3 size={18} /><h2 className="font-bold">خطوات ثابتة لهذا الدرس</h2></div>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">خذ وقتك مع «{lessonTitle}»، ثم تحقّق من فهمك قبل فتح الخطوة التالية.</p>
      <ul className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        {['حدّد الفكرة الأساسية في الدرس', 'راجع المصطلحات أو النقاط المهمة', 'لخّص ما تعلمته بكلماتك'].map((item, index) => <li key={item} className="flex items-start gap-2 rounded-xl bg-card/80 p-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-700 dark:text-blue-300">{index + 1}</span><label className="flex cursor-pointer items-start gap-2 leading-6"><input className="mt-1 accent-blue-600" type="checkbox" data-testid={`check-structured-${index + 1}`} /><span>{item}</span></label></li>)}
      </ul>
    </section>;
  }

  if (path === 'guided') {
    return <section className="mt-7 rounded-2xl border border-teal-500/20 bg-teal-500/5 p-5 sm:p-6" data-testid="support-guided">
      <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300"><CircleHelp size={18} /><h2 className="font-bold">توقّف لحظة وفكّر</h2></div>
      <p className="mt-3 leading-7">ما الفكرة في «{lessonTitle}» التي يمكنك ربطها بموقف تعليمي تعرفه؟</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setHintOpen(value => !value)} className="rounded-xl border border-teal-600/25 bg-card px-4 py-2.5 text-sm font-bold text-teal-700 transition hover:bg-teal-500/10 dark:text-teal-300" aria-expanded={hintOpen} data-testid="button-guided-hint">{hintOpen ? 'إخفاء التلميح' : 'أظهر تلميحًا'}</button>
        <span className="text-sm text-muted-foreground">مهمة قصيرة: اكتب مثالًا واحدًا من تخصصك يوضّح هذه الفكرة.</span>
      </div>
      {hintOpen && <p className="mt-4 rounded-xl bg-card/80 p-4 text-sm leading-7 text-muted-foreground" data-testid="text-guided-hint">ابدأ بتخيّل هدف تعلّم، ثم اسأل نفسك: كيف يساعد هذا المفهوم الطالب على تحقيقه؟</p>}
    </section>;
  }

  const stage = designThinkingStages[stageIndex];
  return <section className="mt-7 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 sm:p-6" data-testid="support-open">
    <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300"><Compass size={18} /><h2 className="font-bold">استكشف الفكرة بطريقتك</h2></div>
    <p className="mt-2 text-sm leading-7 text-muted-foreground">اختر مرحلة من التفكير التصميمي وابنِ تحديًا مفتوحًا حول «{lessonTitle}».</p>
    <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="مراحل التفكير التصميمي">
      {designThinkingStages.map((item, index) => <button type="button" key={item.title} onClick={() => setStageIndex(index)} aria-pressed={stageIndex === index} className={`rounded-xl px-3 py-2 text-sm font-bold transition ${stageIndex === index ? 'bg-orange-500 text-white' : 'bg-card text-muted-foreground hover:text-foreground'}`} data-testid={`button-design-stage-${index + 1}`}>{item.title}</button>)}
    </div>
    <div className="mt-4 rounded-xl bg-card/80 p-4"><p className="text-sm font-bold text-orange-700 dark:text-orange-300">{stage.title} · تحدٍّ مفتوح</p><p className="mt-2 text-sm leading-7" data-testid="text-open-stage-task">{stage.task}</p></div>
  </section>;
}

function LessonNavLink({ lesson, direction }: { lesson?: Lesson; direction: 'previous' | 'next' }) {
  if (!lesson) return <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-3 text-xs text-muted-foreground opacity-50">{direction === 'previous' ? <ArrowRight size={15} /> : null}{direction === 'previous' ? 'السابق' : 'التالي'}{direction === 'next' ? <ArrowLeft size={15} /> : null}</span>;
  const chapter = orderedChapters.find(c => c.lessons.some(l => l.id === lesson.id));
  return <Link href={`/chapter/${chapter?.order}?lesson=${encodeURIComponent(lesson.id)}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-3 text-xs font-bold transition hover:bg-muted" data-testid={`link-lesson-${direction}`}>{direction === 'previous' ? <ArrowRight size={15} /> : null}{direction === 'previous' ? 'السابق' : 'التالي'}{direction === 'next' ? <ArrowLeft size={15} /> : null}</Link>;
}

function MarkdownView({ content }: { content: string }) {
  const blocks = useMemo(() => content.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean), [content]);
  return <div className="markdown-content py-3" dir="rtl" data-testid="content-lesson-markdown">{blocks.map((block, i) => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.every(l => /^\|.*\|$/.test(l))) {
      const rows = lines.filter(l => !/^\|[\s:|-]+\|$/.test(l)).map(l => l.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
      if (rows.length) return <div className="my-5 overflow-x-auto" key={i}><table><thead><tr>{rows[0].map((cell, ci) => <th key={ci}><InlineMarkdown text={cell} /></th>)}</tr></thead><tbody>{rows.slice(1).map((row, ri) => <tr key={ri}>{row.map((cell, ci) => <td key={ci}><InlineMarkdown text={cell} /></td>)}</tr>)}</tbody></table></div>;
    }
    if (lines.every(l => /^>\s?/.test(l))) return <blockquote key={i}>{lines.map((l, li) => <p key={li}><InlineMarkdown text={l.replace(/^>\s?/, '')} /></p>)}</blockquote>;
    if (lines.every(l => /^[-*+]\s/.test(l))) return <ul key={i}>{lines.map((l, li) => <li key={li}><InlineMarkdown text={l.replace(/^[-*+]\s/, '')} /></li>)}</ul>;
    if (lines.every(l => /^\d+[.)]\s/.test(l))) return <ol key={i}>{lines.map((l, li) => <li key={li}><InlineMarkdown text={l.replace(/^\d+[.)]\s/, '')} /></li>)}</ol>;
    if (lines.length === 1 && /^#{1,6}\s/.test(lines[0])) {
      const level = lines[0].match(/^#+/)?.[0].length ?? 2;
      const text = lines[0].replace(/^#+\s/, '');
      if (level === 1) return <h1 key={i}><InlineMarkdown text={text} /></h1>;
      if (level === 2) return <h2 key={i}><InlineMarkdown text={text} /></h2>;
      return <h3 key={i}><InlineMarkdown text={text} /></h3>;
    }
    return <p key={i}>{lines.map((line, li) => <span key={li}>{li > 0 && <br />}<InlineMarkdown text={line} /></span>)}</p>;
  })}</div>;
}
function InlineMarkdown({ text }: { text: string }) {
  const segments = text.split(/(\*\*[^*]+\*\*)/g);
  return <>{segments.map((part, i) => part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part)}</>;
}

function ProgressPage() {
  const [, setLocation] = useLocation();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const result = readAssessmentResult();
  const skillsResult = readSkillsTestResult();
  const done = readStorage<string[]>(storageKeys.done, []);
  const lessons = orderedChapters.flatMap(c => c.lessons);
  const completedLessons = lessons.filter(l => done.includes(l.id));
  const percentage = lessons.length ? Math.round(completedLessons.length / lessons.length * 100) : 0;
  const reset = () => {
    for (const key of [
      storageKeys.result,
      storageKeys.answers,
      storageKeys.attempts,
      storageKeys.ambiguityStartedAt,
      storageKeys.skillsResult,
      storageKeys.skillsAnswers,
      storageKeys.skillsStartedAt,
      storageKeys.skillsAttempts,
      storageKeys.done,
      'masar-assessment-responses',
      'masar-assessment-attempts',
    ]) {
      removeStorage(key);
    }
    setLocation('/');
  };
  return <div className="page-wrap py-6 pb-24 sm:py-14 sm:pb-14">
    <div className="max-w-2xl"><p className="text-sm font-bold text-primary">مساحتك الخاصة</p><h1 className="mt-2 text-2xl sm:text-4xl font-extrabold">تقدّمك، خطوة بخطوة</h1><p className="mt-3 leading-7 text-muted-foreground">هنا ترى ما أنجزته على هذا الجهاز. ليس سباقًا؛ كل درس أكملته يستحق أن يُحتفى به.</p></div>
    {!result ? <div className="mt-8"><EmptyState title="رحلتك لم تبدأ بعد" detail="ابدأ بتقييم قصير لاختيار نقطة انطلاق تناسبك." action={<Link href="/assessment" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground" data-testid="link-progress-assessment">ابدأ التقييم<ArrowLeft size={16} /></Link>} /></div> :
    <div className="mt-8">
      <div className="grid gap-4 sm:grid-cols-[1.3fr_.7fr]">
        <div className="soft-card rounded-[26px] p-5 sm:p-8"><div className="flex items-center justify-between gap-4"><div><p className="text-sm text-muted-foreground">إنجاز المقرر</p><h2 className="mt-1 text-3xl font-extrabold" data-testid="text-progress-percent">{percentage}%</h2></div><div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary/10 text-secondary"><TrendingUp /></div></div><div className="mt-5 h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-secondary transition-all duration-500" style={{ width: `${percentage}%` }} /></div><p className="mt-3 text-sm text-muted-foreground">{completedLessons.length} من {lessons.length} درس مكتمل</p></div>
        <div className="soft-card rounded-[26px] p-5 sm:p-6"><p className="text-sm text-muted-foreground">مسارك الحالي</p><h2 className={`mt-2 text-xl font-extrabold ${pathInfo[result.path].color}`} data-testid="text-progress-path">{pathInfo[result.path].title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{pathInfo[result.path].subtitle}</p><Link href={`/path/${result.path}`} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary" data-testid="link-progress-path">عرض تفاصيل المسار<ChevronLeft size={16} /></Link></div>
      </div>
      <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5" data-testid="card-progress-skills-test">
        <div><p className="text-sm font-bold text-primary">اختبار مهارات التفكير التصميمي</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{skillsResult ? `نتيجتك الأخيرة: ${skillsResult.score} من 25` : 'اختبار مستقل من 25 سؤالًا، مدته 30 دقيقة.'}</p></div>
        <Link href="/skills-test" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:opacity-90 w-full sm:w-auto" data-testid="link-progress-skills-test">{skillsResult ? 'عرض النتيجة أو إعادة الاختبار' : 'ابدأ الاختبار'}<ArrowLeft size={16} /></Link>
      </div>
      <div className="mt-7 flex items-center justify-between gap-3"><h2 className="text-xl font-extrabold">إنجازات الفصول</h2><Link href="/chapters" className="text-sm font-bold text-primary" data-testid="link-progress-chapters">تصفّح المحتوى</Link></div>
      <div className="mt-4 space-y-3">{orderedChapters.map(c => {
        const count = c.lessons.filter(l => done.includes(l.id)).length;
        return <div key={c.id} className="soft-card flex items-center gap-4 rounded-2xl p-4" data-testid={`progress-chapter-${c.order}`}><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 font-bold text-primary">{String(c.order).padStart(2, '0')}</span><div className="min-w-0 flex-1"><p className="truncate font-bold">{c.title}</p><p className="mt-1 text-xs text-muted-foreground">{count} من {c.lessons.length} دروس</p></div><div className="hidden h-2 w-24 overflow-hidden rounded-full bg-muted sm:block"><div className="h-full rounded-full bg-secondary" style={{ width: `${c.lessons.length ? count / c.lessons.length * 100 : 0}%` }} /></div><Link href={`/chapter/${c.order}`} aria-label={`افتح الفصل ${c.order}`} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-muted" data-testid={`link-progress-chapter-${c.order}`}><ChevronLeft size={18} /></Link></div>;
      })}</div>
      <div className="mt-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-border p-4"><p className="text-sm text-muted-foreground">إجاباتك وإنجازك محفوظان في متصفح هذا الجهاز فقط.</p><AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogTrigger asChild><button type="button" className="rounded-xl px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10" data-testid="button-reset-progress">مسح التقدّم والبدء من جديد</button></AlertDialogTrigger>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader><AlertDialogTitle>هل تريد مسح التقدّم؟</AlertDialogTitle><AlertDialogDescription>سيُحذف التقييم واختبار المهارات وسجلا المحاولات وإنجاز الدروس من هذا الجهاز. لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={reset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">مسح التقدّم</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog></div>
    </div>}
  </div>;
}

function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="soft-card flex min-h-56 flex-col items-center justify-center rounded-[26px] px-6 py-9 text-center" data-testid="state-empty"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground"><BookOpen size={21} /></span><h2 className="mt-4 text-lg font-bold">{title}</h2><p className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">{detail}</p>{action}</div>;
}

export default App;
