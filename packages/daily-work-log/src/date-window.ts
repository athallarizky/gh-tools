export type DateWindow = {
  localDate: string;
  timezone: string;
  fromIso: string;
  toIso: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function getUtcDateWindow(localDate: string, timezone: string): DateWindow {
  if (!DATE_RE.test(localDate)) {
    throw new Error("Date must use YYYY-MM-DD format");
  }

  assertValidTimezone(timezone);

  const from = zonedLocalMidnightToUtc(localDate, timezone);
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);

  return {
    localDate,
    timezone,
    fromIso: from.toISOString(),
    toIso: to.toISOString()
  };
}

function assertValidTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
  } catch {
    throw new Error(`Invalid timezone: ${timezone}`);
  }
}

function zonedLocalMidnightToUtc(localDate: string, timezone: string): Date {
  const [year, month, day] = localDate.split("-").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const offsetMs = getTimezoneOffsetMs(utcGuess, timezone);
  return new Date(utcGuess.getTime() - offsetMs);
}

function getTimezoneOffsetMs(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );

  return asUtc - date.getTime();
}
