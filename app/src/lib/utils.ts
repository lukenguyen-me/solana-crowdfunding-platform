import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateWalletAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function isUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch (e) {
    return false;
  }
}

export function formatMoney(balance: number) {
  return balance.toLocaleString();
}
