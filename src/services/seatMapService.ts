import { createSeededRandom } from '@/lib/random';
import type { Seat, SeatMap, SeatRow, SeatType } from '@/types/domain';

/**
 * Auditorium layout: three seat blocks separated by two aisles.
 *   | block 0 (3) | aisle | block 1 (8) | aisle | block 2 (3) |
 */
const BLOCK_WIDTHS = [3, 8, 3] as const;
const AISLE_WIDTH = 1;
export const SEAT_GRID_COLUMN_COUNT =
  BLOCK_WIDTHS.reduce((sum, width) => sum + width, 0) + AISLE_WIDTH * (BLOCK_WIDTHS.length - 1);

const STANDARD_ROWS = ['A', 'B', 'C'];
const VIP_ROWS = ['D', 'E', 'F', 'G', 'H'];
const REAR_ROWS = ['I'];
const COUPLE_ROW = 'J';

function getBlockStartColumn(blockIndex: number): number {
  let column = 1;
  for (let index = 0; index < blockIndex; index += 1) {
    column += (BLOCK_WIDTHS[index] ?? 0) + AISLE_WIDTH;
  }
  return column;
}

function buildSingleSeatRow(label: string, centerType: SeatType): SeatRow {
  const seats: Seat[] = [];
  let seatNumber = 1;
  BLOCK_WIDTHS.forEach((width, blockIndex) => {
    const startColumn = getBlockStartColumn(blockIndex);
    const type: SeatType = blockIndex === 1 ? centerType : 'standard';
    for (let offset = 0; offset < width; offset += 1) {
      seats.push({
        id: `${label}${seatNumber}`,
        row: label,
        number: seatNumber,
        label: `${label}${seatNumber}`,
        type,
        gridColumn: startColumn + offset,
        gridSpan: 1,
        blockIndex,
      });
      seatNumber += 1;
    }
  });
  return { label, seats };
}

function buildCoupleRow(label: string): SeatRow {
  const seats: Seat[] = [];
  let seatNumber = 1;
  BLOCK_WIDTHS.forEach((width, blockIndex) => {
    const startColumn = getBlockStartColumn(blockIndex);
    const coupleCount = Math.floor(width / 2);
    // Side blocks have an odd width: align their couple seat toward the center aisle.
    const leadingOffset = width % 2 === 1 && blockIndex === 0 ? 1 : 0;
    for (let index = 0; index < coupleCount; index += 1) {
      seats.push({
        id: `${label}${seatNumber}`,
        row: label,
        number: seatNumber,
        label: `${label}${seatNumber}`,
        type: 'couple',
        gridColumn: startColumn + leadingOffset + index * 2,
        gridSpan: 2,
        blockIndex,
      });
      seatNumber += 1;
    }
  });
  return { label, seats };
}

const AUDITORIUM_ROWS: SeatRow[] = [
  ...STANDARD_ROWS.map((label) => buildSingleSeatRow(label, 'standard')),
  ...VIP_ROWS.map((label) => buildSingleSeatRow(label, 'vip')),
  ...REAR_ROWS.map((label) => buildSingleSeatRow(label, 'standard')),
  buildCoupleRow(COUPLE_ROW),
];

const seatsById = new Map(AUDITORIUM_ROWS.flatMap((row) => row.seats).map((seat) => [seat.id, seat]));

export function getSeatById(seatId: string): Seat | undefined {
  return seatsById.get(seatId);
}

/**
 * Builds the seat map for a showtime. Occupancy is simulated deterministically from the
 * showtime ID and merged with seats this user has already booked.
 */
export function buildSeatMap(showtimeId: string, userBookedSeatIds: Iterable<string> = []): SeatMap {
  const random = createSeededRandom(`occupancy|${showtimeId}`);
  const occupancyRate = 0.18 + random() * 0.32;
  const occupiedSeatIds = new Set<string>(userBookedSeatIds);

  for (const row of AUDITORIUM_ROWS) {
    for (const seat of row.seats) {
      if (random() < occupancyRate) occupiedSeatIds.add(seat.id);
    }
  }

  return { columnCount: SEAT_GRID_COLUMN_COUNT, rows: AUDITORIUM_ROWS, occupiedSeatIds };
}
