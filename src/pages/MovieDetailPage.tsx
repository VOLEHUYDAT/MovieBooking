import { ArrowLeft, CalendarClock, CalendarDays, Clapperboard, Clock, Globe, MapPin, Users } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { DateSelector } from '@/components/booking/DateSelector';
import { ShowtimeButton } from '@/components/booking/ShowtimeButton';
import { MoviePoster } from '@/components/movie/MoviePoster';
import { AgeRatingBadge, FormatBadge, ScoreBadge } from '@/components/ui/Badges';
import { EmptyState } from '@/components/ui/EmptyState';
import { CINEMAS, CITIES } from '@/data/cinemas';
import { AGE_RATING_DESCRIPTIONS } from '@/data/ageRatings';
import { getMovieById } from '@/data/movies';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNow } from '@/hooks/useNow';
import { cn } from '@/lib/cn';
import { getUpcomingDateKeys } from '@/lib/date';
import { formatDuration, formatShortDate } from '@/lib/format';
import { getShowtimesForMovie, SCHEDULE_DAYS_AHEAD } from '@/services/showtimeService';
import type { Showtime } from '@/types/domain';
import { NotFoundPage } from './NotFoundPage';

export function MovieDetailPage() {
  const { movieId = '' } = useParams();
  const movie = getMovieById(movieId);
  useDocumentTitle(movie?.title ?? 'Không tìm thấy phim');

  if (!movie) {
    return <NotFoundPage title="Không tìm thấy phim" description="Phim bạn tìm không tồn tại hoặc đã ngừng chiếu." />;
  }

  const details = [
    { icon: Clapperboard, label: 'Đạo diễn', value: movie.director },
    { icon: Users, label: 'Diễn viên', value: movie.cast.join(', ') },
    { icon: CalendarDays, label: 'Khởi chiếu', value: formatShortDate(movie.releaseDate) },
    { icon: Globe, label: 'Ngôn ngữ', value: movie.language },
  ];

  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-line">
        <div className="absolute inset-0 -z-10">
          <MoviePoster movie={movie} variant="art" className="size-full scale-110 opacity-50 blur-2xl" />
          <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/80 to-canvas/40" />
        </div>

        <div className="mx-auto max-w-7xl px-4 pt-6 pb-12 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden /> Tất cả phim
          </Link>

          <div className="mt-6 grid gap-8 md:grid-cols-[260px_1fr] lg:grid-cols-[300px_1fr] lg:gap-12">
            <MoviePoster
              movie={movie}
              className="mx-auto aspect-[2/3] w-52 animate-slide-up rounded-2xl shadow-2xl ring-1 ring-white/10 md:w-full"
            />

            <div className="animate-slide-up">
              <div className="flex flex-wrap items-center gap-2">
                <AgeRatingBadge rating={movie.ageRating} />
                {movie.formats.map((format) => (
                  <FormatBadge key={format} format={format} />
                ))}
              </div>
              <h1 className="mt-4 text-3xl leading-tight font-black tracking-tight text-balance sm:text-5xl">{movie.title}</h1>
              <p className="mt-1 text-sm font-medium tracking-[0.2em] text-ink-muted uppercase">{movie.englishTitle}</p>
              <p className="mt-4 text-lg text-ink/90 italic">“{movie.tagline}”</p>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted">
                {movie.status === 'now-showing' && <ScoreBadge score={movie.score} />}
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-4" aria-hidden />
                  {formatDuration(movie.durationMinutes)}
                </span>
                <span>{movie.genres.join(' · ')}</span>
              </div>

              <p className="mt-6 max-w-3xl leading-relaxed text-ink-muted">{movie.synopsis}</p>

              <dl className="mt-6 grid max-w-3xl gap-4 sm:grid-cols-2">
                {details.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex gap-3">
                    <Icon className="mt-0.5 size-4.5 shrink-0 text-brand" aria-hidden />
                    <div>
                      <dt className="text-xs font-semibold tracking-wide text-ink-subtle uppercase">{label}</dt>
                      <dd className="mt-0.5 text-sm">{value}</dd>
                    </div>
                  </div>
                ))}
              </dl>

              <p className="mt-6 inline-flex items-start gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-ink-muted ring-1 ring-line">
                <AgeRatingBadge rating={movie.ageRating} className="h-5 min-w-7 text-[10px]" />
                <span className="pt-0.5">{AGE_RATING_DESCRIPTIONS[movie.ageRating]}.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="showtimes" aria-labelledby="showtimes-heading" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-10 sm:px-6 lg:px-8">
        <h2 id="showtimes-heading" className="text-2xl font-extrabold tracking-tight">
          Lịch chiếu
        </h2>
        {movie.status === 'coming-soon' ? (
          <EmptyState
            className="mt-6"
            icon={CalendarClock}
            title={`Khởi chiếu ngày ${formatShortDate(movie.releaseDate)}`}
            description="Vé sẽ được mở bán trước ngày khởi chiếu. Hãy quay lại sau để chọn suất chiếu phù hợp nhé!"
          />
        ) : (
          <ShowtimeSchedule movieId={movie.id} />
        )}
      </section>
    </>
  );
}

function ShowtimeSchedule({ movieId }: { movieId: string }) {
  const now = useNow();
  const [searchParams, setSearchParams] = useSearchParams();
  const dateKeys = useMemo(() => getUpcomingDateKeys(SCHEDULE_DAYS_AHEAD, now), [now]);
  const requestedDate = searchParams.get('date');
  const selectedDateKey = requestedDate && dateKeys.includes(requestedDate) ? requestedDate : (dateKeys[0] ?? '');
  const requestedCity = searchParams.get('city');
  const selectedCity = CITIES.find((city) => city === requestedCity) ?? null;

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

  const showtimesByCinema = useMemo(() => {
    const grouped = new Map<string, Showtime[]>();
    for (const showtime of getShowtimesForMovie(movieId, selectedDateKey)) {
      const list = grouped.get(showtime.cinemaId) ?? [];
      list.push(showtime);
      grouped.set(showtime.cinemaId, list);
    }
    return CINEMAS.filter((cinema) => grouped.has(cinema.id) && (!selectedCity || cinema.city === selectedCity)).map(
      (cinema) => ({ cinema, showtimes: grouped.get(cinema.id) ?? [] }),
    );
  }, [movieId, selectedDateKey, selectedCity]);

  return (
    <div className="mt-6 space-y-6">
      <DateSelector dateKeys={dateKeys} selectedDateKey={selectedDateKey} onSelect={(dateKey) => updateParam('date', dateKey)} />

      <div className="flex flex-wrap items-center gap-2">
        <MapPin className="size-4 text-ink-subtle" aria-hidden />
        {[null, ...CITIES].map((city) => (
          <button
            key={city ?? 'all'}
            type="button"
            aria-pressed={selectedCity === city}
            onClick={() => updateParam('city', city)}
            className={cn(
              'h-8 rounded-full px-3.5 text-xs font-semibold ring-1 transition-colors',
              selectedCity === city ? 'bg-ink text-canvas ring-ink' : 'text-ink-muted ring-line-strong hover:text-ink',
            )}
          >
            {city ?? 'Tất cả khu vực'}
          </button>
        ))}
      </div>

      {showtimesByCinema.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Chưa có suất chiếu"
          description="Không có suất chiếu nào cho ngày và khu vực đã chọn. Vui lòng chọn ngày hoặc khu vực khác."
        />
      ) : (
        <div className="space-y-4">
          {showtimesByCinema.map(({ cinema, showtimes }) => (
            <article key={cinema.id} className="animate-fade-in rounded-2xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold">{cinema.name}</h3>
                  <p className="mt-0.5 text-sm text-ink-muted">{cinema.address}</p>
                </div>
                <span className="text-xs font-medium text-ink-subtle">{showtimes.length} suất chiếu</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {showtimes.map((showtime) => (
                  <ShowtimeButton key={showtime.id} showtime={showtime} now={now} />
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
