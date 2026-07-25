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
