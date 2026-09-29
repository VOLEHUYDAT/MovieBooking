import { CINEMAS, getCinemaById } from '../data/cinemas';
import { getMovieById, MOVIES } from '../data/movies';
import { parseDateKey } from '../lib/date';
import { createSeededRandom } from '../lib/random';
import type { Cinema, Movie, ScreenFormat, Showtime } from '../types/domain';

/** Online sales close this many minutes before a screening starts. */
export const BOOKING_CUTOFF_MINUTES = 15;
/** Number of days (including today) that have a published schedule. */
export const SCHEDULE_DAYS_AHEAD = 7;

const ID_SEPARATOR = '_';
const FIRST_SCREENING_MINUTE = 9 * 60;
const LAST_SCREENING_MINUTE = 23 * 60 + 15;
const CLEANING_BUFFER_MINUTES = 20;
const SLOT_GRANULARITY_MINUTES = 15;

interface ShowtimeIdParts {
  movieId: string;
  cinemaId: string;
  dateKey: string;
  startTime: string;
}

function buildShowtimeId({ movieId, cinemaId, dateKey, startTime }: ShowtimeIdParts): string {
  return [movieId, cinemaId, dateKey, startTime].join(ID_SEPARATOR);
}

export function parseShowtimeId(showtimeId: string): ShowtimeIdParts | null {
  const parts = showtimeId.split(ID_SEPARATOR);
  if (parts.length !== 4) return null;
  const [movieId, cinemaId, dateKey, startTime] = parts as [string, string, string, string];
  if (!/^\d{4}$/.test(startTime) || !parseDateKey(dateKey)) return null;
  return { movieId, cinemaId, dateKey, startTime };
}

function pickFormat(movie: Movie, cinema: Cinema, random: () => number): ScreenFormat {
  const roll = random();
  if (movie.formats.includes('IMAX') && cinema.hasImax && roll < 0.3) return 'IMAX';
  if (movie.formats.includes('3D') && roll > 0.65) return '3D';
  return '2D';
}

function isReleasedOn(movie: Movie, dateKey: string): boolean {
  return movie.status === 'now-showing' && movie.releaseDate <= dateKey;
}

/**
 * Deterministically generates a day's schedule for one movie at one cinema.
 * The same inputs always produce the same showtimes, so IDs stay stable across reloads.
 */
function generateShowtimes(movie: Movie, cinema: Cinema, dateKey: string): Showtime[] {
  const date = parseDateKey(dateKey);
  if (!date || !isReleasedOn(movie, dateKey)) return [];

  const random = createSeededRandom(`${movie.id}|${cinema.id}|${dateKey}`);
  if (random() < 0.15) return [];

  const showtimes: Showtime[] = [];
  const maxScreenings = 3 + Math.floor(random() * 3);
  let startMinute = FIRST_SCREENING_MINUTE + Math.floor(random() * 6) * SLOT_GRANULARITY_MINUTES;

  while (showtimes.length < maxScreenings && startMinute <= LAST_SCREENING_MINUTE) {
    const hours = Math.floor(startMinute / 60);
    const minutes = startMinute % 60;
    const startTime = `${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}`;
    const startsAt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
    const endsAt = new Date(startsAt.getTime() + movie.durationMinutes * 60_000);
    const format = pickFormat(movie, cinema, random);
    const auditorium =
      format === 'IMAX' ? 'Phòng IMAX' : `Phòng ${1 + Math.floor(random() * cinema.auditoriumCount)}`;

    showtimes.push({
      id: buildShowtimeId({ movieId: movie.id, cinemaId: cinema.id, dateKey, startTime }),
      movieId: movie.id,
      cinemaId: cinema.id,
      auditorium,
      format,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    });

    const gap =
      movie.durationMinutes + CLEANING_BUFFER_MINUTES + Math.floor(random() * 5) * SLOT_GRANULARITY_MINUTES;
    startMinute += Math.ceil(gap / SLOT_GRANULARITY_MINUTES) * SLOT_GRANULARITY_MINUTES;
  }

  return showtimes;
}

function byStartTime(a: Showtime, b: Showtime): number {
  return a.startsAt.localeCompare(b.startsAt);
}

export function getShowtimesForMovie(movieId: string, dateKey: string): Showtime[] {
  const movie = getMovieById(movieId);
  if (!movie) return [];
  return CINEMAS.flatMap((cinema) => generateShowtimes(movie, cinema, dateKey)).sort(byStartTime);
}

export function getShowtimesForCinema(cinemaId: string, dateKey: string): Showtime[] {
  const cinema = getCinemaById(cinemaId);
  if (!cinema) return [];
  return MOVIES.flatMap((movie) => generateShowtimes(movie, cinema, dateKey)).sort(byStartTime);
}

export function getShowtimeById(showtimeId: string): Showtime | undefined {
  const parts = parseShowtimeId(showtimeId);
  if (!parts) return undefined;
  const movie = getMovieById(parts.movieId);
  const cinema = getCinemaById(parts.cinemaId);
  if (!movie || !cinema) return undefined;
  return generateShowtimes(movie, cinema, parts.dateKey).find((showtime) => showtime.id === showtimeId);
}

export function isShowtimeBookable(showtime: Showtime, now: Date = new Date()): boolean {
  const cutoff = new Date(showtime.startsAt).getTime() - BOOKING_CUTOFF_MINUTES * 60_000;
  return now.getTime() < cutoff;
}
