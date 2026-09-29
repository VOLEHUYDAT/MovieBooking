import type { Seat, SeatMap } from '@/types/domain';

export const MAX_SEATS_PER_BOOKING = 8;

/**
 * Cinema rule: a selection must not leave a single empty seat stranded between taken seats
 * (or between a taken seat and the end of a block). Couple seats are exempt.
 * Only gaps adjacent to the user's own selection are reported.
 */
export function findStrandedSeats(seatMap: SeatMap, selectedSeatIds: ReadonlySet<string>): Seat[] {
  const stranded: Seat[] = [];
  const isSelected = (seat: Seat | undefined) => seat !== undefined && selectedSeatIds.has(seat.id);
  const isTaken = (seat: Seat | undefined) =>
    seat === undefined || seatMap.occupiedSeatIds.has(seat.id) || selectedSeatIds.has(seat.id);

  for (const row of seatMap.rows) {
    const blocks = new Map<number, Seat[]>();
    for (const seat of row.seats) {
      if (seat.type === 'couple') continue;
      const block = blocks.get(seat.blockIndex) ?? [];
      block.push(seat);
      blocks.set(seat.blockIndex, block);
    }

    for (const block of blocks.values()) {
      block.sort((a, b) => a.gridColumn - b.gridColumn);
      block.forEach((seat, index) => {
        if (isTaken(seat)) return;
        const left = block[index - 1];
        const right = block[index + 1];
        if (isTaken(left) && isTaken(right) && (isSelected(left) || isSelected(right))) {
          stranded.push(seat);
        }
      });
    }
  }

  return stranded;
}
