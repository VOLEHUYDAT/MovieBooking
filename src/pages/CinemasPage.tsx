import { Building2, CalendarClock, Clock, MapPin, Phone } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { DateSelector } from '@/components/booking/DateSelector';
import { ShowtimeButton } from '@/components/booking/ShowtimeButton';
import { MoviePoster } from '@/components/movie/MoviePoster';
import { AgeRatingBadge } from '@/components/ui/Badges';
import { EmptyState } from '@/components/ui/EmptyState';
import { CINEMAS, getCinemaById } from '@/data/cinemas';
import { getMovieById } from '@/data/movies';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNow } from '@/hooks/useNow';
import { cn } from '@/lib/cn';
import { getUpcomingDateKeys } from '@/lib/date';
import { formatDuration } from '@/lib/format';
import { getShowtimesForCinema, SCHEDULE_DAYS_AHEAD } from '@/services/showtimeService';
import type { Movie, Showtime } from '@/types/domain';

export function CinemasPage() {
  useDocumentTitle('Hệ thống rạp');
  const now = useNow();
  const [searchParams, setSearchParams] = useSearchParams();
  const dateKeys = useMemo(() => getUpcomingDateKeys(SCHEDULE_DAYS_AHEAD, now), [now]);

  const selectedCinema = getCinemaById(searchParams.get('cinema') ?? '') ?? CINEMAS[0];
  const requestedDate = searchParams.get('date');
  const selectedDateKey = requestedDate && dateKeys.includes(requestedDate) ? requestedDate : (dateKeys[0] ?? '');

  const updateParams = (updates: Record<string, string>) => {
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        Object.entries(updates).forEach(([key, value]) => next.set(key, value));
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  };

  const moviesWithShowtimes = useMemo(() => {
    if (!selectedCinema) return [];
    const grouped = new Map<string, Showtime[]>();
    for (const showtime of getShowtimesForCinema(selectedCinema.id, selectedDateKey)) {
      const list = grouped.get(showtime.movieId) ?? [];
      list.push(showtime);
      grouped.set(showtime.movieId, list);
    }
    return [...grouped.entries()].flatMap(([movieId, showtimes]) => {
      const movie = getMovieById(movieId);
      return movie ? [{ movie, showtimes }] : [];
    }) satisfies { movie: Movie; showtimes: Showtime[] }[];
  }, [selectedCinema, selectedDateKey]);

  if (!selectedCinema) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-black tracking-tight">Hệ thống rạp Lumina</h1>
      <p className="mt-2 text-ink-muted">Chọn rạp gần bạn để xem lịch chiếu và đặt vé.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[340px_1fr]">
        <div role="radiogroup" aria-label="Chọn rạp" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:self-start">
          {CINEMAS.map((cinema) => {
            const isSelected = cinema.id === selectedCinema.id;
            return (
              <button
                key={cinema.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => updateParams({ cinema: cinema.id })}
                className={cn(
                  'rounded-2xl border p-4 text-left transition-all',
                  isSelected
                    ? 'border-brand/60 bg-brand-soft shadow-glow'
                    : 'border-line bg-surface hover:border-line-strong hover:bg-surface-raised',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">{cinema.name}</span>
                  {cinema.hasImax && (
                    <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">IMAX</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-ink-muted">{cinema.city}</p>
              </button>
            );
          })}
        </div>

        <div className="min-w-0">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-start gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-brand">
                <Building2 className="size-6 text-white" aria-hidden />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-extrabold">{selectedCinema.name}</h2>
                <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-muted">
                  <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden /> {selectedCinema.address}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
                  <Phone className="size-4 shrink-0" aria-hidden /> Hotline {selectedCinema.hotline} ·{' '}
                  {selectedCinema.auditoriumCount} phòng chiếu
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <DateSelector dateKeys={dateKeys} selectedDateKey={selectedDateKey} onSelect={(date) => updateParams({ date })} />
          </div>

          {moviesWithShowtimes.length === 0 ? (
            <EmptyState
              className="mt-6"
              icon={CalendarClock}
              title="Chưa có lịch chiếu"
              description="Rạp chưa có suất chiếu cho ngày này. Vui lòng chọn ngày khác."
            />
          ) : (
            <div className="mt-6 space-y-4">
              {moviesWithShowtimes.map(({ movie, showtimes }) => (
                <article key={movie.id} className="flex animate-fade-in gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
                  <Link to={`/movies/${movie.id}`} className="shrink-0" aria-label={`Xem chi tiết ${movie.title}`}>
                    <MoviePoster movie={movie} variant="art" className="aspect-[2/3] w-20 rounded-xl sm:w-24" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <AgeRatingBadge rating={movie.ageRating} className="h-5 min-w-7 text-[10px]" />
                      <Link to={`/movies/${movie.id}`} className="font-bold hover:text-brand">
                        {movie.title}
                      </Link>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                      <Clock className="size-3.5" aria-hidden /> {formatDuration(movie.durationMinutes)} ·{' '}
                      {movie.genres.join(', ')}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {showtimes.map((showtime) => (
                        <ShowtimeButton key={showtime.id} showtime={showtime} now={now} />
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
