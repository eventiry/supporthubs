/**
 * Pure utility helpers. No side effects; safe to use in client and server.
 */

/**
 * Get a safe, user-facing message from an unknown error.
 */
export function getErrorMessage(error: unknown): string {
  if (error == null) return "An error occurred";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return "An error occurred";
}

/**
 * Format a date as DD/MM/YYYY (UK style).
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format a date with time as DD/MM/YYYY, HH:MM.
 */
export function formatDateWithTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const datePart = formatDate(d);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${datePart}, ${hours}:${minutes}`;
}

/**
 * UK postcode: 1–4 letters/digits, optional space, 1 digit, 2 letters.
 * Relaxed to allow common formats (e.g. NE6 3XH, SW1A 1AA).
 */
const UK_POSTCODE_REGEX = /^[A-Za-z]{1,2}[0-9][0-9A-Za-z]?\s?[0-9][A-Za-z]{2}$/;

/**
 * Validate UK postcode format. Returns true if valid or empty (optional field).
 */
export function validatePostcode(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") return true;
  return UK_POSTCODE_REGEX.test(trimmed.replace(/\s+/g, " "));
}

/**
 * Check that an object has all required string keys present and non-empty (or allow empty for optional).
 * Returns the first missing key name, or null if all present.
 */
export function missingRequiredFields(
  obj: Record<string, unknown>,
  requiredKeys: string[],
  options?: { allowEmpty?: boolean }
): string | null {
  const allowEmpty = options?.allowEmpty ?? false;
  for (const key of requiredKeys) {
    const value = obj[key];
    if (value === undefined || value === null) return key;
    if (!allowEmpty && typeof value === "string" && value.trim() === "") return key;
  }
  return null;
}

/**
 * Merge Tailwind (or other) class names, filtering out falsy values.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ").trim() || "";
}

/**
 * Convert hex color to Tailwind HSL string: "H S% L%" (no "hsl()" wrapper).
 * Accepts #RGB, #RRGGBB. Returns null if invalid.
 */
export function hexToHslString(hex: string): string | null {
  const trimmed = hex.trim();
  if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(trimmed)) return null;
  let r: number, g: number, b: number;
  if (trimmed.length === 4) {
    r = parseInt(trimmed[1] + trimmed[1], 16);
    g = parseInt(trimmed[2] + trimmed[2], 16);
    b = parseInt(trimmed[3] + trimmed[3], 16);
  } else {
    r = parseInt(trimmed.slice(1, 3), 16);
    g = parseInt(trimmed.slice(3, 5), 16);
    b = parseInt(trimmed.slice(5, 7), 16);
  }
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }
  const s = l === 0 || l === 1 ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  const H = Math.round(h * 360);
  const S = Math.round(s * 100);
  const L = Math.round(l * 100);
  return `${H} ${S}% ${L}%`;
}
