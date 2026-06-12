/** Lucky wheel — 8 USDT slices (must match backend PRIZES order). */
export const WHEEL_SLICE_COUNT = 8;
export const WHEEL_SLICE_DEG = 360 / WHEEL_SLICE_COUNT;

export const WHEEL_PRIZE_KEYS = [
  "h5WheelPrize0",
  "h5WheelPrize1",
  "h5WheelPrize2",
  "h5WheelPrize3",
  "h5WheelPrize4",
  "h5WheelPrize5",
  "h5WheelPrize6",
  "h5WheelPrize7",
] as const;

/** Premium segment fills — charcoal, silver, bronze, gold accents */
export const WHEEL_SEGMENT_FILLS = [
  "#121824",
  "#565d6b",
  "#6b5344",
  "#161b24",
  "#949aa3",
  "#7a6228",
  "#121824",
  "#1a1408",
] as const;

export const WHEEL_GRAND_SLICE_INDEX = 7;

export function rotationForPrizeIndex(prizeIndex: number, extraTurns = 10) {
  const segmentCenter = prizeIndex * WHEEL_SLICE_DEG + WHEEL_SLICE_DEG / 2;
  return extraTurns * 360 + (360 - segmentCenter);
}
