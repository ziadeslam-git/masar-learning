import type { ElementType } from 'react';
import { Link } from 'wouter';
import { Home, BookOpen, TrendingUp, Target, Compass } from 'lucide-react';

export interface NavItemConfig {
  id: string;
  href: string;
  label: string;
  mobileLabel: string;
  icon: ElementType;
  isActive: (location: string) => boolean;
  testId: string;
  showWhen?: (hasResult: boolean) => boolean;
  getHref?: (activePath?: string) => string;
}

export const MAIN_NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'home',
    href: '/',
    label: 'الرئيسية',
    mobileLabel: 'الرئيسية',
    icon: Home,
    isActive: loc => loc === '/',
    testId: 'nav-home',
  },
  {
    id: 'chapters',
    href: '/chapters',
    label: 'المحتوى',
    mobileLabel: 'المحتوى',
    icon: BookOpen,
    isActive: loc => loc.startsWith('/chapters') || loc.startsWith('/chapter'),
    testId: 'nav-chapters',
  },
  {
    id: 'progress',
    href: '/progress',
    label: 'تقدّمي',
    mobileLabel: 'تقدّمي',
    icon: TrendingUp,
    isActive: loc => loc === '/progress',
    testId: 'nav-progress',
  },
  {
    id: 'skills-test',
    href: '/skills-test',
    label: 'اختبار مهارات التفكير التصميمي',
    mobileLabel: 'الاختبار',
    icon: Target,
    isActive: loc => loc === '/skills-test',
    testId: 'nav-skills-test',
  },
  {
    id: 'my-path',
    href: '/path',
    label: 'مساري',
    mobileLabel: 'مساري',
    icon: Compass,
    isActive: loc => loc.startsWith('/path'),
    testId: 'nav-my-path',
    showWhen: hasResult => hasResult,
    getHref: activePath => `/path/${activePath || 'structured'}`,
  },
];

interface MobileBottomNavProps {
  items?: NavItemConfig[];
  location: string;
  activePath?: string;
  hasResult: boolean;
}

export function MobileBottomNav({
  items = MAIN_NAV_ITEMS,
  location,
  activePath,
  hasResult,
}: MobileBottomNavProps) {
  const visibleItems = items.filter(item => !item.showWhen || item.showWhen(hasResult));

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border/80 bg-card/90 dark:bg-card/90 backdrop-blur-md transition-colors md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="التنقل السفلي للموبايل"
      data-testid="mobile-bottom-nav"
    >
      <div className="flex h-16 w-full items-stretch justify-around px-1">
        {visibleItems.map(item => {
          const active = item.isActive(location);
          const href = item.getHref ? item.getHref(activePath) : item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={href}
              className={`group flex min-h-[44px] min-w-[48px] flex-1 flex-col items-center justify-center gap-1 py-1.5 text-center transition-colors ${
                active
                  ? 'font-bold text-primary'
                  : 'font-medium text-muted-foreground hover:text-foreground'
              }`}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              data-testid={`mobile-${item.testId}`}
            >
              <span
                className={`grid h-8 w-11 place-items-center rounded-xl transition-all ${
                  active
                    ? 'bg-primary/10 text-primary scale-105'
                    : 'group-hover:bg-muted/60 text-muted-foreground'
                }`}
              >
                <Icon size={19} strokeWidth={active ? 2.4 : 2} />
              </span>
              <span className="text-[11px] leading-none tracking-tight">
                {item.mobileLabel}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
