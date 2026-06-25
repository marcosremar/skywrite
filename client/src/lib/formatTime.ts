export function formatTime(date: Date, locale?: string): string {
  const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  try {
    return date.toLocaleTimeString(locale, opts);
  } catch {
    return date.toLocaleTimeString(undefined, opts);
  }
}
