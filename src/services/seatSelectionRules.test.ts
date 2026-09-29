import { describe, expect, it } from 'vitest';
import type { SeatMap } from '@/types/domain';
import { buildSeatMap } from './seatMapService';
import { findStrandedSeats } from './seatSelectionRules';

function seatMapWithOccupied(occupiedSeatIds: string[]): SeatMap {
  return { ...buildSeatMap('test-showtime'), occupiedSeatIds: new Set(occupiedSeatIds) };
}

const labels = (seatMap: SeatMap, selected: string[]) =>
  findStrandedSeats(seatMap, new Set(selected)).map((seat) => seat.label);

describe('findStrandedSeats', () => {
  it('accepts a contiguous selection in an empty row', () => {
    expect(labels(seatMapWithOccupied([]), ['B6', 'B7'])).toEqual([]);
  });

  it('flags a single gap between the selection and an occupied seat', () => {
    // Center block of row B is B4..B11; B8 would be stranded between B7 (selected) and B9 (taken).
    expect(labels(seatMapWithOccupied(['B9']), ['B6', 'B7'])).toEqual(['B8']);
  });

  it('flags a single seat stranded at the edge of a block', () => {
    // B4 is the first seat of the center block: selecting B5 strands it against the aisle.
    expect(labels(seatMapWithOccupied([]), ['B5'])).toEqual(['B4']);
  });

  it('ignores gaps that the user did not create', () => {
    expect(labels(seatMapWithOccupied(['B4', 'B6']), ['B10', 'B11'])).toEqual([]);
  });

  it('treats blocks separated by an aisle independently', () => {
    // B3 is the last seat of the left block; B4 starts the center block across the aisle.
    expect(labels(seatMapWithOccupied([]), ['B3', 'B4', 'B5'])).toEqual([]);
  });

  it('never applies the rule to couple seats', () => {
    expect(labels(seatMapWithOccupied(['J2']), ['J4'])).toEqual([]);
  });
});
