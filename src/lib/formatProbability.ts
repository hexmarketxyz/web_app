/**
 * Format a probability (0.0–1.0) as a percentage string.
 * Values close to 0% display as "<1" instead of "0".
 */
export function formatProbability(probability: number): string {
  const rounded = Math.round(probability * 100);
  if (rounded <= 0 && probability > 0) return '<1';
  return rounded.toString();
}

/**
 * Format a price (0.0–1.0) as cents string for buy buttons.
 * Values close to 0¢ display as "<1" instead of "0".
 */
export function formatPriceCents(price: number): string {
  const rounded = Math.round(price * 100);
  if (rounded <= 0 && price > 0) return '<1';
  return rounded.toString();
}
