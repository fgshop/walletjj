/**
 * Convert SUN to TRX (1 TRX = 1,000,000 SUN).
 */
export function sunToTrx(sun: string | bigint): string {
  const value = typeof sun === 'string' ? BigInt(sun) : sun;
  const whole = value / BigInt(1_000_000);
  const fraction = value % BigInt(1_000_000);
  const fractionStr = fraction.toString().padStart(6, '0');
  return `${whole}.${fractionStr}`;
}

/**
 * Convert TRX to SUN.
 */
export function trxToSun(trx: string | number): string {
  const parts = trx.toString().split('.');
  const whole = BigInt(parts[0]) * BigInt(1_000_000);
  if (parts.length === 1) return whole.toString();
  const fractionStr = parts[1].padEnd(6, '0').slice(0, 6);
  const fraction = BigInt(fractionStr);
  return (whole + fraction).toString();
}

/**
 * Convert a raw token amount (bigint string) to a human-readable decimal string.
 */
export function fromSmallestUnit(amount: string, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const value = BigInt(amount);
  const whole = value / divisor;
  const fraction = (value % divisor).toString().padStart(decimals, '0');
  return `${whole}.${fraction}`;
}

/**
 * Convert a human-readable decimal string to the smallest unit.
 */
export function toSmallestUnit(amount: string, decimals: number): string {
  const parts = amount.split('.');
  const whole = BigInt(parts[0]) * BigInt(10 ** decimals);
  if (parts.length === 1) return whole.toString();
  const fractionStr = parts[1].padEnd(decimals, '0').slice(0, decimals);
  return (whole + BigInt(fractionStr)).toString();
}
