import { memo, useId, useMemo, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { createSeededRandom } from '@shared/lib/random';
import type { Movie, PosterTheme } from '@shared/types/domain';

interface MoviePosterProps {
  movie: Movie;
  /** `full` shows the title typography; `art` renders artwork only (for thumbnails and backdrops). */
  variant?: 'full' | 'art';
  className?: string;
}

interface Star {
  x: number;
  y: number;
  r: number;
  opacity: number;
}

function createStars(seed: string, count: number): Star[] {
  const random = createSeededRandom(seed);
  return Array.from({ length: count }, () => ({
    x: random() * 200,
    y: random() * 170,
    r: 0.4 + random() * 1.2,
    opacity: 0.25 + random() * 0.65,
  }));
}

function renderMotif(theme: PosterTheme, gradientId: string): ReactNode {
  const { accent, colors } = theme;
  const [dark, mid] = colors;

  switch (theme.motif) {
    case 'sun':
      return (
        <>
          <circle cx="100" cy="135" r="62" fill={`url(#${gradientId})`} />
          {[0, 1, 2, 3, 4].map((index) => (
            <rect key={index} x="30" y={150 + index * 11} width="140" height={2 + index * 1.6} fill={mid} />
          ))}
          <path d="M0 210 L45 170 L80 195 L125 150 L165 190 L200 165 L200 300 L0 300 Z" fill={dark} opacity="0.92" />
        </>
      );
    case 'orbit':
      return (
        <>
          <circle cx="100" cy="125" r="42" fill={`url(#${gradientId})`} />
          <ellipse cx="100" cy="125" rx="82" ry="18" fill="none" stroke={accent} strokeWidth="1.6" opacity="0.8" transform="rotate(-18 100 125)" />
          <ellipse cx="100" cy="125" rx="98" ry="26" fill="none" stroke={accent} strokeWidth="0.8" opacity="0.4" transform="rotate(-18 100 125)" />
          <circle cx="170" cy="100" r="4" fill={accent} />
        </>
      );
    case 'waves':
      return (
        <>
          <circle cx="140" cy="80" r="26" fill={accent} opacity="0.85" />
          {[0, 1, 2, 3, 4].map((index) => (
            <path
              key={index}
              d={`M0 ${150 + index * 22} Q 50 ${130 + index * 22} 100 ${150 + index * 22} T 200 ${150 + index * 22} V 300 H 0 Z`}
              fill={index % 2 === 0 ? mid : dark}
              opacity={0.35 + index * 0.13}
            />
          ))}
        </>
      );
    case 'grid':
      return (
        <>
          <circle cx="100" cy="120" r="40" fill={`url(#${gradientId})`} opacity="0.9" />
          <rect x="0" y="150" width="200" height="150" fill={dark} opacity="0.85" />
          {Array.from({ length: 11 }, (_, index) => (
            <line key={`v${index}`} x1={100} y1={150} x2={-100 + index * 40} y2={300} stroke={accent} strokeWidth="0.7" opacity="0.55" />
          ))}
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <line key={`h${index}`} x1="0" x2="200" y1={152 + index * index * 4.2} y2={152 + index * index * 4.2} stroke={accent} strokeWidth="0.7" opacity="0.55" />
          ))}
        </>
      );
    case 'shards':
      return (
        <>
          {[
            'M20 40 L110 20 L70 140 Z',
            'M120 30 L190 70 L140 160 Z',
            'M30 160 L100 110 L90 230 Z',
            'M110 150 L180 120 L170 240 Z',
            'M60 60 L150 90 L100 200 Z',
          ].map((path, index) => (
            <path key={path} d={path} fill={index % 2 ? accent : mid} opacity={0.12 + index * 0.08} stroke={accent} strokeWidth="0.5" strokeOpacity="0.5" />
          ))}
        </>
      );
    case 'moon':
      return (
        <>
          <circle cx="140" cy="70" r="30" fill={accent} opacity="0.95" />
          <circle cx="152" cy="62" r="27" fill={dark} />
          <path d="M55 230 V175 L95 140 L135 175 V230 Z" fill="#050505" />
          <rect x="88" y="195" width="14" height="35" fill={accent} opacity="0.25" />
          <rect x="70" y="180" width="10" height="10" fill={accent} opacity="0.55" />
          <path d="M160 230 V150 M160 175 L178 160 M160 190 L145 172" stroke="#050505" strokeWidth="3" />
          <rect x="0" y="228" width="200" height="72" fill="#050505" />
        </>
      );
    case 'bubbles':
      return (
        <>
          {[
            [45, 90, 34],
            [85, 80, 40],
            [130, 92, 30],
            [150, 190, 26],
            [120, 200, 32],
            [55, 205, 24],
          ].map(([cx, cy, r]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#ffffff" opacity="0.55" />
          ))}
          <path d="M72 140 L80 124 L88 138 M104 138 L112 124 L120 140" stroke="#4c1d95" strokeWidth="3" fill="none" strokeLinejoin="round" />
          <ellipse cx="96" cy="152" rx="30" ry="22" fill="#ffffff" />
          <circle cx="86" cy="150" r="2.6" fill="#4c1d95" />
          <circle cx="106" cy="150" r="2.6" fill="#4c1d95" />
          <path d="M92 158 Q96 162 100 158" stroke="#4c1d95" strokeWidth="1.6" fill="none" />
        </>
      );
    case 'city':
      return (
        <>
          <circle cx="60" cy="70" r="18" fill={accent} opacity="0.8" />
          {[
            [0, 150, 30],
            [28, 120, 26],
            [52, 165, 22],
            [72, 95, 30],
            [100, 135, 24],
            [122, 110, 28],
            [148, 160, 22],
            [168, 130, 32],
          ].map(([x, y, width]) => (
            <g key={x}>
              <rect x={x} y={y} width={width} height={300 - (y ?? 0)} fill={dark} />
              {Array.from({ length: 5 }, (_, row) => (
                <rect key={row} x={(x ?? 0) + 5} y={(y ?? 0) + 8 + row * 14} width="4" height="5" fill={accent} opacity={(row + (x ?? 0)) % 3 === 0 ? 0.9 : 0.2} />
              ))}
            </g>
          ))}
        </>
      );
  }
}

function MoviePosterComponent({ movie, variant = 'full', className }: MoviePosterProps) {
  const uid = useId().replace(/:/g, '');
  const gradientId = `motif-${uid}`;
  const grainId = `grain-${uid}`;
  const { colors, accent } = movie.poster;
  const stars = useMemo(() => createStars(movie.id, 26), [movie.id]);

  return (
    <div
      className={cn('@container relative isolate overflow-hidden bg-surface', className)}
      style={{ backgroundImage: `linear-gradient(165deg, ${colors[0]} 0%, ${colors[1]} 55%, ${colors[2]} 100%)` }}
      role="img"
      aria-label={`Poster phim ${movie.title}`}
    >
      <svg viewBox="0 0 200 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <radialGradient id={gradientId}>
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="45%" stopColor={accent} />
            <stop offset="100%" stopColor={colors[2]} />
          </radialGradient>
          <filter id={grainId}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
        {stars.map((star, index) => (
          <circle key={index} cx={star.x} cy={star.y} r={star.r} fill="#fff" opacity={star.opacity * 0.6} />
        ))}
        {renderMotif(movie.poster, gradientId)}
        <rect width="200" height="300" filter={`url(#${grainId})`} opacity="0.1" />
      </svg>

      {variant === 'full' && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-[8%] pt-[30%] pb-[7%]">
          <p className="text-[clamp(0.5rem,3.2cqw,0.7rem)] font-semibold tracking-[0.25em] text-white/70 uppercase">
            {movie.englishTitle}
          </p>
          <p className="mt-1 text-[clamp(1rem,10cqw,1.9rem)] leading-[1.05] font-black tracking-tight text-white text-balance uppercase">
            {movie.title}
          </p>
        </div>
      )}
    </div>
  );
}

export const MoviePoster = memo(MoviePosterComponent);
