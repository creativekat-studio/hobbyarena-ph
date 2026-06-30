export const DEFAULT_DEPOSIT_PERCENT = 30;

export function isPreorderProduct(product) {
  return product?.tag === "Pre-order" || product?.type === "Pre-order";
}

export function getDepositPercent(product) {
  if (!isPreorderProduct(product)) return 0;
  const value = Number(product.depositPercent);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_DEPOSIT_PERCENT;
  return Math.min(99, Math.max(1, Math.round(value)));
}

export function calcPreorderPricing(fullPrice, depositPercent = DEFAULT_DEPOSIT_PERCENT) {
  const percent = Math.min(99, Math.max(1, Math.round(depositPercent)));
  const deposit = Math.round((fullPrice * percent) / 100);
  const balance = Math.max(0, fullPrice - deposit);
  return {
    fullPrice,
    depositPercent: percent,
    balancePercent: 100 - percent,
    deposit,
    balance,
  };
}

export function preorderDueNow(product, quantity = 1) {
  if (!isPreorderProduct(product)) {
    return (product?.price ?? 0) * quantity;
  }
  const { deposit } = calcPreorderPricing(product.price, getDepositPercent(product));
  return deposit * quantity;
}

export function preorderBalanceDue(product, quantity = 1) {
  if (!isPreorderProduct(product)) return 0;
  const { balance } = calcPreorderPricing(product.price, getDepositPercent(product));
  return balance * quantity;
}

export function getCountdownParts(endsAt) {
  if (!endsAt) return null;
  const target = new Date(endsAt).getTime();
  if (Number.isNaN(target)) return null;

  const remaining = target - Date.now();
  if (remaining <= 0) {
    return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { expired: false, days, hours, minutes, seconds, totalMs: remaining };
}

export function formatCountdownUnit(value) {
  return String(value).padStart(2, "0");
}

export function formatCountdownLabel(parts) {
  if (!parts) return null;
  if (parts.expired) return "Closed";
  return `${parts.days}d ${formatCountdownUnit(parts.hours)}h ${formatCountdownUnit(parts.minutes)}m ${formatCountdownUnit(parts.seconds)}s`;
}

/** Convert ISO string to value for `<input type="datetime-local" />`. */
export function toDatetimeLocalValue(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Parse datetime-local input to ISO string. */
export function fromDatetimeLocalValue(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
