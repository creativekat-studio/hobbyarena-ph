/** Display pesos with two fraction digits (₱1,234.00). */
export const MONEY_UI_DECIMALS = 2;
/** Persist / compute money with four fraction digits. */
export const MONEY_BACKEND_DECIMALS = 4;

/**
 * Round a money amount to a fixed number of decimal places.
 * Defaults to backend precision (4).
 */
export function roundMoney(value, decimals = MONEY_BACKEND_DECIMALS) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const factor = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * factor) / factor;
}

export const PESO = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: MONEY_UI_DECIMALS,
  maximumFractionDigits: MONEY_UI_DECIMALS,
});

export function formatPeso(amount) {
  return PESO.format(Number(amount) || 0);
}
