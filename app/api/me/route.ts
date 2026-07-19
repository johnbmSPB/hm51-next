const PROFILE_TIMEOUT_MS = 12_000;

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasProfileShape(json: JsonObject) {
  const nested = isObject(json.data) ? json.data : null;
  const gamer = json.GAMER || json.gamer || json.USER || json.user || nested?.GAMER || nested?.gamer || nested?.USER || nested?.user;
  if (!isObject(gamer)) return false;

  const teamCollections = [
    json.GAMER_TEAMS,
    json.gamer_teams,
    json.TEAMS,
    json.teams,
    nested?.GAMER_TEAMS,
    nested?.gamer_teams,
    nested?.TEAMS,
    nested?.teams,
  ];

  return teamCollections.some((value) => Array.isArray(value) || isObject(value));
}

function errorResponse(message: string, status = 502) {
  return Response.json({ result: false, error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const token = String(data.token || "").trim();

    if (!token) return errorResponse("Токен не передан", 400);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROFILE_TIMEOUT_MS);
    const body = new URLSearchParams({ token });

    let response: Response;
    let text: string;

    try {
      response = await fetch("https://itandsports.ru/start/about_me.php", {
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
      if (controller.signal.aborted) return errorResponse("Профиль не загрузился вовремя", 504);
      return errorResponse("Не удалось связаться с сервером профиля", 502);
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const status = response.status >= 400 && response.status < 500 ? response.status : 502;
      return errorResponse("Сервер не загрузил профиль", status);
    }

    if (!text.trim()) return errorResponse("Сервер вернул пустой профиль", 502);

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return errorResponse("Сервер вернул повреждённый профиль", 502);
    }

    if (!isObject(parsed) || !hasProfileShape(parsed)) {
      return errorResponse("Сервер вернул неполные данные профиля", 502);
    }

    return Response.json(parsed);
  } catch (error: unknown) {
    const message = error instanceof Error && error.message ? error.message : "Ошибка загрузки профиля";
    return errorResponse(message, 500);
  }
}
