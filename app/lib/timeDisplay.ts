export function formatHourMinute(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const match = raw.match(/^(\d{1,2})[:.](\d{2})(?:[:.]\d{2})?$/);
  if (!match) return raw;

  return `${match[1].padStart(2, "0")}:${match[2]}`;
}
