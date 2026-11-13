import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
    new Date(date),
  );
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function formatDuration(hours: number): string {
  if (hours >= 24) {
    const days = hours / 24;
    return `± ${Number.isInteger(days) ? days : days.toFixed(1)} hari`;
  }
  return `± ${hours} jam`;
}

/**
 * Biaya yang ditampilkan untuk sebuah pesanan: `final_cost` diprioritaskan,
 * lalu estimasi, lalu "—" bila keduanya kosong.
 *
 * Dipisah ke sini karena tiap halaman sebelumnya menulis logikanya sendiri,
 * dan salah satunya salah menulis operator precedence sehingga
 * `final_cost ?? estimated_cost !== null` dibaca sebagai
 * `final_cost ?? (estimated_cost !== null)` oleh parser.
 */
export function formatOrderCost(
  finalCost: number | null,
  estimatedCost: number | null,
): string {
  const value = finalCost ?? estimatedCost;
  return value === null ? "—" : formatCurrency(value);
}