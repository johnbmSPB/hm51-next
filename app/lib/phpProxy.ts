export type PhpJson = Record<string, any>;

const DEFAULT_TIMEOUT_MS = 12_000;

export class PhpProxyError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PhpProxyError";
    this.status = status;
  }
}

function clean(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function booleanSignal(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  const normalized = clean(value).toLowerCase();
  if (["1", "true", "success", "ok", "done", "yes"].includes(normalized)) return true;
  if (["0", "false", "error", "failed", "failure", "no"].includes(normalized)) return false;
  return null;
}

function explicitSuccess(json: PhpJson): boolean | null {
  for (const key of ["result", "RESULT", "success", "SUCCESS", "ok", "OK"]) {
    if (Object.prototype.hasOwnProperty.call(json, key)) return booleanSignal(json[key]);
  }

  for (const key of ["status", "STATUS"]) {
    if (!Object.prototype.hasOwnProperty.call(json, key)) continue;
    const normalized = clean(json[key]).toLowerCase();
    if (["success", "ok", "done"].includes(normalized)) return true;
    if (["error", "failed", "failure"].includes(normalized)) return false;
    return null;
  }

  return null;
}

function upstreamError(json: PhpJson, fallback: string) {
  return clean(json.error || json.ERROR || json.message || json.MESSAGE) || fallback;
}

export function parsePhpJsonText(text: string, recoverEmbeddedJson = false): unknown {
  const source = String(text || "").replace(/^\uFEFF/, "").trim();
  if (!source) return null;

  try {
    return JSON.parse(source);
  } catch {
    if (!recoverEmbeddedJson) return null;
  }

  // Некоторые legacy PHP endpoint'ы печатают warning/notice перед JSON.
  // Для них пробуем восстановить только сам JSON, не выдавая сырой ответ клиенту.
  for (const [open, close] of [
    ["{", "}"],
    ["[", "]"],
  ] as const) {
    const start = source.indexOf(open);
    const end = source.lastIndexOf(close);
    if (start < 0 || end < start) continue;

    try {
      return JSON.parse(source.slice(start, end + 1));
    } catch {
      // Попробуем следующий допустимый контейнер.
    }
  }

  return null;
}

type PhpProxyOptions = {
  timeoutMs?: number;
  allowEmptySuccess?: boolean;
  recoverEmbeddedJson?: boolean;
  acceptImplicitSuccess?: (json: PhpJson) => boolean;
};

export async function postPhpForm(
  url: string,
  params: Record<string, string>,
  fallbackError: string,
  options: PhpProxyOptions = {}
): Promise<PhpJson> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || DEFAULT_TIMEOUT_MS);
  const body = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => body.append(key, value));

  let response: Response;
  let text: string;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        "User-Agent": "HM51-Web/2.0",
      },
      body,
      cache: "no-store",
      signal: controller.signal,
    });
    text = await response.text();
  } catch {
    if (controller.signal.aborted) throw new PhpProxyError("Сервер не ответил вовремя", 504);
    throw new PhpProxyError(fallbackError, 502);
  } finally {
    clearTimeout(timeout);
  }

  if (!text.trim()) {
    if (!response.ok) throw new PhpProxyError(fallbackError, 502);
    if (options.allowEmptySuccess) return {};
    throw new PhpProxyError("Сервер вернул пустой ответ", 502);
  }

  const parsed = parsePhpJsonText(text, options.recoverEmbeddedJson === true);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new PhpProxyError("Сервер вернул некорректный ответ", 502);
  }

  const json = parsed as PhpJson;
  if (!response.ok) throw new PhpProxyError(upstreamError(json, fallbackError), 502);

  const success = explicitSuccess(json);
  if (success === false) throw new PhpProxyError(upstreamError(json, fallbackError), 400);
  if (success !== true && !options.acceptImplicitSuccess?.(json)) {
    throw new PhpProxyError("Сервер вернул неподтверждённый ответ", 502);
  }

  return json;
}

export function phpProxyErrorResponse(error: unknown, fallback: string) {
  const status = error instanceof PhpProxyError ? error.status : 500;
  const message = error instanceof Error && error.message ? error.message : fallback;
  return Response.json({ result: false, error: message }, { status });
}
