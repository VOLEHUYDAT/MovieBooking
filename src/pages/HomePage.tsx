import { Check, Copy, Search, SearchX, TicketPercent, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { HeroCarousel } from '@/components/movie/HeroCarousel';
import { MovieCard } from '@/components/movie/MovieCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FEATURED_MOVIE_IDS, getMovieById, MOVIES } from '@/data/movies';
import { PROMOTIONS } from '@/data/promotions';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/lib/cn';
import type { Genre, Movie, MovieStatus } from '@/types/domain';

const STATUS_TABS: { value: MovieStatus; label: string }[] = [
  { value: 'now-showing', label: 'Đang chiếu' },
  { value: 'coming-soon', label: 'Sắp chiếu' },
];

const FEATURED_MOVIES = FEATURED_MOVIE_IDS.map(getMovieById).filter((movie): movie is Movie => Boolean(movie));

function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function PromotionStrip() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`Đã sao chép mã ${code}`);
      window.setTimeout(() => setCopiedCode((current) => (current === code ? null : current)), 2_000);
    } catch {
      toast.info(`Mã khuyến mãi: ${code}`);
    }
  };

  return (
    <section aria-labelledby="promotions-heading" className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
      <h2 id="promotions-heading" className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
        <TicketPercent className="size-6 text-brand" aria-hidden />
        Ưu đãi dành cho bạn
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PROMOTIONS.map((promotion) => (
          <article
            key={promotion.code}
            className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-surface-raised to-surface p-5"
          >
            <div className="absolute -top-10 -right-10 size-32 rounded-full bg-brand/10 blur-2xl" aria-hidden />
            <p className="font-bold">{promotion.title}</p>
            <p className="mt-1 text-sm text-ink-muted">{promotion.description}</p>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-dashed border-brand/40 bg-brand-soft px-3 py-2">
              <code className="font-mono text-sm font-bold tracking-wider text-brand">{promotion.code}</code>
              <Button size="sm" variant="ghost" onClick={() => copyCode(promotion.code)} aria-label={`Sao chép mã ${promotion.code}`}>
                {copiedCode === promotion.code ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                {copiedCode === promotion.code ? 'Đã chép' : 'Sao chép'}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function HomePage() {
  useDocumentTitle();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: MovieStatus = searchParams.get('tab') === 'coming-soon' ? 'coming-soon' : 'now-showing';
  const searchQuery = searchParams.get('q') ?? '';
  const activeGenre = searchParams.get('genre') as Genre | null;

  const updateParam = (key: string, value: string | null) => {
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  };

  const moviesInTab = useMemo(() => MOVIES.filter((movie) => movie.status === activeTab), [activeTab]);
  const availableGenres = useMemo(
    () => [...new Set(moviesInTab.flatMap((movie) => movie.genres))].sort((a, b) => a.localeCompare(b, 'vi')),
    [moviesInTab],
  );

  const visibleMovies = useMemo(() => {
    const normalizedQuery = normalizeForSearch(searchQuery);
    return moviesInTab.filter((movie) => {
      const matchesGenre = !activeGenre || movie.genres.includes(activeGenre);
      const matchesQuery =
        !normalizedQuery ||
        normalizeForSearch(`${movie.title} ${movie.englishTitle} ${movie.director} ${movie.cast.join(' ')}`).includes(
          normalizedQuery,
        );
      return matchesGenre && matchesQuery;
    });
  }, [moviesInTab, activeGenre, searchQuery]);

  const hasFilters = Boolean(searchQuery || activeGenre);

  return (
    <>
      <HeroCarousel movies={FEATURED_MOVIES} />

      <section aria-labelledby="movies-heading" className="mx-auto mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 id="movies-heading" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Chọn phim yêu thích
            </h2>
            <div role="tablist" aria-label="Trạng thái phim" className="mt-4 inline-flex rounded-xl bg-surface p-1 ring-1 ring-line">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.value}
                  onClick={() => {
                    setSearchParams(tab.value === 'now-showing' ? {} : { tab: tab.value }, {
                      replace: true,
                      preventScrollReset: true,
                    });
                  }}
                  className={cn(
                    'h-9 rounded-lg px-4 text-sm font-semibold transition-all',
                    activeTab === tab.value ? 'bg-gradient-brand text-white shadow-glow' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <label className="relative block w-full md:w-80">
            <span className="sr-only">Tìm kiếm phim</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-ink-subtle" aria-hidden />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => updateParam('q', event.target.value || null)}
              placeholder="Tìm theo tên phim, đạo diễn, diễn viên..."
              className="h-11 w-full rounded-xl border border-line-strong bg-surface pr-10 pl-10 text-sm placeholder:text-ink-subtle focus:border-brand focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => updateParam('q', null)}
                aria-label="Xóa tìm kiếm"
                className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-ink-subtle hover:bg-white/5 hover:text-ink"
              >
                <X className="size-4" />
              </button>
            )}
          </label>
        </div>

        <div className="scrollbar-none -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {[null, ...availableGenres].map((genre) => {
            const isActive = activeGenre === genre;
            return (
              <button
                key={genre ?? 'all'}
                type="button"
                aria-pressed={isActive}
                onClick={() => updateParam('genre', genre)}
                className={cn(
                  'h-9 shrink-0 rounded-full px-4 text-sm font-medium ring-1 transition-colors',
                  isActive
                    ? 'bg-ink text-canvas ring-ink'
                    : 'bg-surface text-ink-muted ring-line-strong hover:text-ink hover:ring-white/30',
                )}
              >
                {genre ?? 'Tất cả'}
              </button>
            );
          })}
        </div>

        {visibleMovies.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visibleMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : (
          <EmptyState
            className="mt-8"
            icon={SearchX}
            title="Không tìm thấy phim phù hợp"
            description="Thử từ khóa khác hoặc bỏ bớt bộ lọc thể loại nhé."
            action={
              hasFilters && (
                <Button variant="secondary" onClick={() => setSearchParams(activeTab === 'now-showing' ? {} : { tab: activeTab }, { replace: true })}>
                  Xóa bộ lọc
                </Button>
              )
            }
          />
        )}
      </section>

      <PromotionStrip />
    </>
  );
}
