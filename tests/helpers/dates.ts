/** Returns today's local calendar date as YYYY-MM-DD (en-CA), valid for validateFocusDate. */
export function todayLocalDate(): string {
  return new Date().toLocaleDateString("en-CA");
}

/** Returns a local calendar date offset by the given number of days (en-CA). */
export function offsetLocalDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("en-CA");
}
