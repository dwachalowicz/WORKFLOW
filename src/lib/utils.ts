import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatWidows(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .replace(/(\s|^)([a-zA-Z0-9])\s+/g, '$1$2\u00A0')
    .replace(/(\s|^)([a-zA-Z0-9])\s+/g, '$1$2\u00A0');
}
