const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfBangkokDate(value?: string) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) return undefined;

  return new Date(calendarDate.getTime() - BANGKOK_OFFSET_MS);
}

export function bangkokDateRange(from?: string, to?: string) {
  const start = startOfBangkokDate(from);
  const finalDay = startOfBangkokDate(to);
  if (!start && !finalDay) return undefined;

  return {
    ...(start ? { gte: start } : {}),
    ...(finalDay ? { lt: new Date(finalDay.getTime() + DAY_MS) } : {})
  };
}

export function bangkokMonthRange(value?: string) {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return undefined;

  return {
    gte: new Date(Date.UTC(year, month - 1, 1) - BANGKOK_OFFSET_MS),
    lt: new Date(Date.UTC(year, month, 1) - BANGKOK_OFFSET_MS)
  };
}

export function startOfCurrentBangkokDay(now = new Date()) {
  const bangkokNow = new Date(now.getTime() + BANGKOK_OFFSET_MS);
  return new Date(
    Date.UTC(
      bangkokNow.getUTCFullYear(),
      bangkokNow.getUTCMonth(),
      bangkokNow.getUTCDate()
    ) - BANGKOK_OFFSET_MS
  );
}

export function getBangkokHour(now = new Date()) {
  return new Date(now.getTime() + BANGKOK_OFFSET_MS).getUTCHours();
}
