import { describe, expect, it } from 'vitest';
import { getUpcomingDateKeys } from '../lib/date';
import { BOOKING_CUTOFF_MINUTES, getShowtimeById, getShowtimesForMovie, isShowtimeBookable, parseShowtimeId } from './showtimeService';

const [today = '', tomorrow = ''] = getUpcomingDateKeys(2);

describe('showtime generation', () => {
  it('is deterministic for the same movie and date', () => {
    expect(getShowtimesForMovie('quy-dao-cuoi', tomorrow)).toEqual(getShowtimesForMovie('quy-dao-cuoi', tomorrow));
  });

  it('returns showtimes sorted by start time', () => {
    const starts = getShowtimesForMovie('chan-troi-lua', today).map((showtime) => showtime.startsAt);
    expect(starts).toEqual([...starts].sort());
  });

  it('has no showtimes for coming-soon movies', () => {
    expect(getShowtimesForMovie('thanh-pho-guong', tomorrow)).toEqual([]);
  });

  it('resolves every generated showtime by its ID', () => {
    for (const showtime of getShowtimesForMovie('tieng-vong-dai-duong', tomorrow)) {
      expect(getShowtimeById(showtime.id)).toEqual(showtime);
      expect(parseShowtimeId(showtime.id)?.movieId).toBe('tieng-vong-dai-duong');
    }
  });

  it('rejects malformed IDs', () => {
    expect(getShowtimeById('not-a-showtime')).toBeUndefined();
    expect(parseShowtimeId('a_b_2026-02-30_1200')).toBeNull();
  });
});

describe('isShowtimeBookable', () => {
  const startsAt = new Date(2026, 9, 6, 19, 0);
  const showtime = { id: 'x', movieId: 'm', cinemaId: 'c', auditorium: 'Phòng 1', format: '2D' as const, startsAt: startsAt.toISOString(), endsAt: startsAt.toISOString() };

  it('closes online sales at the cutoff', () => {
    const justBefore = new Date(startsAt.getTime() - (BOOKING_CUTOFF_MINUTES * 60_000 + 1));
    const atCutoff = new Date(startsAt.getTime() - BOOKING_CUTOFF_MINUTES * 60_000);
    expect(isShowtimeBookable(showtime, justBefore)).toBe(true);
    expect(isShowtimeBookable(showtime, atCutoff)).toBe(false);
  });
});
