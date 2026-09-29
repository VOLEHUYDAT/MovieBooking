import { ChevronLeft, ChevronRight, Clock, Info, Ticket } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { formatDuration } from '@/lib/format';
import type { Movie } from '@shared/types/domain';
import { AgeRatingBadge, ScoreBadge } from '../ui/Badges';
import { ButtonLink } from '../ui/Button';
import { MoviePoster } from './MoviePoster';

const AUTOPLAY_INTERVAL_MS = 7_000;

export function HeroCarousel({ movies }: { movies: Movie[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const activeMovie = movies[activeIndex];

  useEffect(() => {
    if (isPaused || movies.length < 2) return;
    const timer = window.setTimeout(
      () => setActiveIndex((index) => (index + 1) % movies.length),
      AUTOPLAY_INTERVAL_MS,
    );
    return () => window.clearTimeout(timer);
  }, [activeIndex, isPaused, movies.length]);

  if (!activeMovie) return null;

  const goTo = (offset: number) => setActiveIndex((index) => (index + offset + movies.length) % movies.length);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Phim nổi bật"
      className="relative isolate overflow-hidden border-b border-line"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div key={activeMovie.id} className="absolute inset-0 -z-10 animate-fade-in">
        <MoviePoster movie={activeMovie} variant="art" className="size-full scale-110 opacity-60 blur-2xl" />
        <div className="absolute inset-0 bg-gradient-to-r from-canvas via-canvas/85 to-canvas/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-canvas via-transparent to-canvas/40" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-10 pb-14 sm:px-6 md:grid-cols-[1fr_auto] md:pt-16 md:pb-20 lg:px-8">
        <div key={`copy-${activeMovie.id}`} className="max-w-2xl animate-slide-up">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand ring-1 ring-brand/30">
            <span className="size-1.5 animate-pulse rounded-full bg-brand" />
            Đang hot tại Lumina
          </span>
          <h1 className="mt-4 text-4xl leading-[1.05] font-black tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {activeMovie.title}
          </h1>
          <p className="mt-2 text-sm font-medium tracking-[0.2em] text-ink-muted uppercase">{activeMovie.englishTitle}</p>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-muted">
            <AgeRatingBadge rating={activeMovie.ageRating} />
            <ScoreBadge score={activeMovie.score} />
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden />
              {formatDuration(activeMovie.durationMinutes)}
            </span>
            <span>{activeMovie.genres.join(' · ')}</span>
          </div>

          <p className="mt-5 line-clamp-3 max-w-xl leading-relaxed text-ink-muted">{activeMovie.synopsis}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to={`/movies/${activeMovie.id}#showtimes`} size="lg">
              <Ticket className="size-5" aria-hidden />
              Đặt vé ngay
            </ButtonLink>
            <ButtonLink to={`/movies/${activeMovie.id}`} size="lg" variant="secondary">
              <Info className="size-5" aria-hidden />
              Chi tiết phim
            </ButtonLink>
          </div>
        </div>

        <div key={`poster-${activeMovie.id}`} className="hidden animate-slide-up md:block">
          <MoviePoster
            movie={activeMovie}
            className="aspect-[2/3] w-60 rounded-2xl shadow-2xl ring-1 ring-white/10 lg:w-72"
          />
        </div>
      </div>

      {movies.length > 1 && (
        <div className="absolute inset-x-0 bottom-5 mx-auto flex max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2" role="tablist" aria-label="Chọn phim nổi bật">
            {movies.map((movie, index) => (
              <button
                key={movie.id}
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                aria-label={movie.title}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  index === activeIndex ? 'w-8 bg-brand' : 'w-3 bg-white/25 hover:bg-white/50',
                )}
              />
            ))}
          </div>
          <div className="ml-auto hidden gap-2 sm:flex">
            <button
              type="button"
              onClick={() => goTo(-1)}
              aria-label="Phim trước"
              className="grid size-9 place-items-center rounded-full bg-white/5 ring-1 ring-line-strong transition hover:bg-white/10"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => goTo(1)}
              aria-label="Phim tiếp theo"
              className="grid size-9 place-items-center rounded-full bg-white/5 ring-1 ring-line-strong transition hover:bg-white/10"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
