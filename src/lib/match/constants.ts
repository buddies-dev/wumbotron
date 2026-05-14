import type { TossValue } from "./state";

export const TOSS_LABELS: Record<TossValue, string> = {
  [-2]: "outside",
  0: "front wall",
  1: "in garden",
  2: "back wall",
  3: "stick",
};

export function formatTossValue(value: TossValue) {
  return value > 0 ? `+${value}` : `${value}`;
}
