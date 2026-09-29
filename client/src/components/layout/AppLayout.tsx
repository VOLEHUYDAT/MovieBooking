import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { AppFooter } from './AppFooter';
import { AppHeader } from './AppHeader';

/** Scrolls to the top on navigation, or to the element referenced by the URL hash. */
function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: 'smooth' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, hash]);

  return null;
}

export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollManager />
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-brand px-4 py-2 font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Bỏ qua điều hướng
      </a>
      <AppHeader />
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      <AppFooter />
    </div>
  );
}
