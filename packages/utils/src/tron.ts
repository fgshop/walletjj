/**
 * TRON-specific utility constants and helpers.
 */

export const TRON_CONSTANTS = {
  /** 1 TRX = 1,000,000 SUN */
  SUN_PER_TRX: 1_000_000,
  /** TRON address prefix byte */
  ADDRESS_PREFIX: 0x41,
  /** TRC-20 Transfer method signature */
  TRC20_TRANSFER_METHOD_ID: 'a9059cbb',
  /** USDT contract on TRON mainnet */
  USDT_CONTRACT: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  /** TRONScan base URL */
  TRONSCAN_URL: 'https://tronscan.org',
} as const;

/**
 * Build a TRONScan URL for a transaction.
 */
export function getTronscanTxUrl(txHash: string, testnet = false): string {
  const base = testnet ? 'https://shasta.tronscan.org' : TRON_CONSTANTS.TRONSCAN_URL;
  return `${base}/#/transaction/${txHash}`;
}

/**
 * Build a TRONScan URL for an address.
 */
export function getTronscanAddressUrl(address: string, testnet = false): string {
  const base = testnet ? 'https://shasta.tronscan.org' : TRON_CONSTANTS.TRONSCAN_URL;
  return `${base}/#/address/${address}`;
}

/**
 * BIP-44 derivation path for TRON.
 */
export function getTronDerivationPath(index: number): string {
  return `m/44'/195'/0'/0/${index}`;
}
