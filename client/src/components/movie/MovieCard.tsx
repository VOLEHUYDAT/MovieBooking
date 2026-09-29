import { CalendarDays, Clock, Ticket } from 'lucide-react';
import { Link } from 'react-router';
import { formatDuration, formatShortDate } from '@/lib/format';
import type { Movie } from '@shared/types/domain';
import { AgeRatingBadge, ScoreBadge } from '../ui/Badges';
import { MoviePoster } from './MoviePoster';

export function MovieCard({ movie }: { movie: Movie }) {
  const isComingSoon = movie.status === 'coming-soon';

  return (
    <Link
      to={`/movies/${movie.id}`}
      className="group block animate-slide-up rounded-2xl focus-visible:outline-offset-4"
      aria-label={`${movie.title} - ${isComingSoon ? 'Sắp chiếu' : 'Đặt vé'}`}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl ring-1 ring-line transition duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-brand/20 group-hover:ring-brand/40">
        <MoviePoster movie={movie} className="size-full transition-transform duration-500 group-hover:scale-105" />
        <AgeRatingBadge rating={movie.ageRating} className="absolute top-3 left-3 shadow-lg" />
        {isComingSoon && (
          <span className="absolute top-3 right-3 rounded-md bg-black/60 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
            {formatShortDate(movie.releaseDate)}
          </span>
        )}
        <div className="absolute inset-0 flex items-end justify-center bg-black/55 p-4 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand text-sm font-semibold text-white shadow-glow">
            {isComingSoon ? <CalendarDays className="size-4" /> : <Ticket className="size-4" />}
            {isComingSoon ? 'Xem thông tin' : 'Đặt vé ngay'}
          </span>
        </div>
      </div>

      <div className="mt-3 space-y-1 px-0.5">
        <h3 className="line-clamp-1 font-bold transition-colors group-hover:text-brand">{movie.title}</h3>
        <p className="line-clamp-1 text-xs text-ink-muted">{movie.genres.join(' · ')}</p>
        <div className="flex items-center gap-3 pt-0.5 text-xs text-ink-subtle">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden />
            {formatDuration(movie.durationMinutes)}
          </span>
          {isComingSoon ? (
            <span className="font-medium text-sky-300">Sắp chiếu</span>
          ) : (
            <ScoreBadge score={movie.score} className="text-xs" />
          )}
        </div>
      </div>
    </Link>
  );
}
