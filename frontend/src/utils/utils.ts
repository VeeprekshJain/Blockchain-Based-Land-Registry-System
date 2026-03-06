/**
 * utils.ts — General-purpose utility helpers.
 */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes safely (clsx + tailwind-merge). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Shorten an Ethereum address: "0x1234...abcd" */
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/** Format Wei to a human-readable ETH string. */
export function formatEther(weiValue: bigint, decimals = 4): string {
  const eth = Number(weiValue) / 1e18;
  return eth.toFixed(decimals);
}

/** Convert bytes32 hex to a UTF-8 string (for on-chain string fields). */
export function bytes32ToString(bytes32: string): string {
  return Buffer.from(bytes32.slice(2), 'hex').toString('utf8').replace(/\0/g, '');
}

/** Truncate long strings for display purposes. */
export function truncate(str: string, maxLength = 40): string {
  return str.length > maxLength ? `${str.slice(0, maxLength)}…` : str;
}

/** Format a Unix timestamp (seconds) to a locale date string. */
export function formatTimestamp(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
