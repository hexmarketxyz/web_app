/**
 * Format a probability (0.0–1.0) as a percentage string.
 * Values close to 0% display as "<1" instead of "0".
 * Values close to 100% display as ">99" instead of "100".
 */
export function formatProbability(probability: number): string {
  const pct = probability * 100;
  const rounded = Math.round(pct);

  if (rounded <= 0 && probability > 0) {
    return '<1';
  }
  if (rounded >= 100 && probability < 1) {
    return '>99';
  }
  return rounded.toString();
}

/**
 * Format a price (0.0–1.0) as cents string for buy buttons.
 * Values close to 0¢ display as "<1" instead of "0".
 * Values close to 99¢ display as ">99" instead of "100".
 */
export function formatPriceCents(price: number): string {
  const cents = price * 100;
  const rounded = Math.round(cents);

  if (rounded <= 0 && price > 0) {
    return '<1';
  }
  if (rounded >= 100 && price < 1) {
    return '>99';
  }
  return rounded.toString();
}
