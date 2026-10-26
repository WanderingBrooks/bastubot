// Dates are passed around as YYYY-MM-DD strings. The arithmetic runs in UTC
// so it never trips over the host's timezone or daylight saving.

const toDate = (date: string) => new Date(`${date}T00:00:00Z`);

const toString = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Today in Sweden, whatever timezone the container runs in
 */
export const today = () =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm' }).format(
    new Date(),
  );

export const addDays = (date: string, days: number) => {
  const result = toDate(date);
  result.setUTCDate(result.getUTCDate() + days);

  return toString(result);
};

export const mondayOf = (date: string) =>
  // getUTCDay() is 0 for Sunday, shift so Monday is 0
  addDays(date, -((toDate(date).getUTCDay() + 6) % 7));

/**
 * e.g. "Tuesday 28 Oct"
 */
export const formatDay = (date: string) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(toDate(date));
