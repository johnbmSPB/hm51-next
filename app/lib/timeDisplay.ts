export function formatTimeWithoutSeconds(value: unknown): string {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return "";
  }

  /*
   * Поддерживаем значения:
   * 20:15:00 -> 20:15
   * 01:30:00 -> 01:30
   * 9:05:00  -> 09:05
   * 20.15.00 -> 20:15
   *
   * Значения, в которых секунд уже нет, не изменяем.
   */
  const match = raw.match(/^(\d{1,3})[:.](\d{2})(?:[:.]\d{2})$/);

  if (!match) {
    return raw;
  }

  const hours = match[1].padStart(2, "0");
  const minutes = match[2];

  return `${hours}:${minutes}`;
}

type TimeParts = {
  hours: number;
  minutes: number;
};

function parseTimeParts(
  value: unknown,
  allowLargeHours: boolean
): TimeParts | null {
  const normalized = formatTimeWithoutSeconds(value);
  const match = normalized.match(/^(\d{1,3}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  if (!allowLargeHours && hours > 23) {
    return null;
  }

  return {
    hours,
    minutes,
  };
}

function padTimePart(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatEventTimeRange(
  startTime: unknown,
  duration: unknown
): string {
  const startText = formatTimeWithoutSeconds(startTime);

  if (!startText) {
    return "";
  }

  const start = parseTimeParts(startTime, false);

  if (!start) {
    return startText;
  }

  const normalizedStart =
    `${padTimePart(start.hours)}:${padTimePart(start.minutes)}`;

  const durationParts = parseTimeParts(duration, true);

  if (!durationParts) {
    return normalizedStart;
  }

  const durationMinutes =
    durationParts.hours * 60 + durationParts.minutes;

  if (durationMinutes <= 0) {
    return normalizedStart;
  }

  const minutesInDay = 24 * 60;
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = (startMinutes + durationMinutes) % minutesInDay;

  const endHours = Math.floor(endMinutes / 60);
  const endMinutePart = endMinutes % 60;

  const normalizedEnd =
    `${padTimePart(endHours)}:${padTimePart(endMinutePart)}`;

  return `${normalizedStart}–${normalizedEnd}`;
}
