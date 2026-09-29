import type { ReactNode } from 'react';
import { MOVIES } from '@shared/data/movies';
import { MoviePoster } from '../movie/MoviePoster';

const COLLAGE_MOVIES = MOVIES.filter((movie) => movie.status === 'now-showing').slice(0, 6);

interface AuthLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Split layout for authentication pages: poster collage on large screens, form card on the right. */
export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-7xl items-center gap-12 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div className="relative hidden h-[560px] overflow-hidden rounded-3xl border border-line lg:block" aria-hidden>
        <div className="absolute inset-0 grid -rotate-6 scale-125 grid-cols-3 gap-4 p-6 opacity-80">
          {COLLAGE_MOVIES.map((movie, index) => (
            <MoviePoster
              key={movie.id}
              movie={movie}
              className={`aspect-[2/3] rounded-2xl shadow-2xl ${index % 2 === 1 ? 'translate-y-10' : ''}`}
            />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10">
          <p className="text-3xl leading-tight font-black">
            Mỗi suất chiếu là
            <br />
            <span className="text-gradient-brand">một trải nghiệm.</span>
          </p>
          <p className="mt-3 max-w-sm text-sm text-ink-muted">
            Đặt vé trong 1 phút, chọn ghế yêu thích và nhận vé điện tử ngay trên điện thoại.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md animate-slide-up">
        <h1 className="text-3xl font-black tracking-tight">{title}</h1>
        <p className="mt-2 text-ink-muted">{description}</p>
        <div className="mt-8 rounded-2xl border border-line bg-surface p-6 shadow-xl sm:p-8">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-ink-muted">{footer}</div>}
      </div>
    </div>
  );
}
