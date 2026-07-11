async function postForm(url: string, params: Record<string, string>) {
  const body = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    body.append(key, value);
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      "User-Agent": "HM51-Web/1.0",
    },
    body,
    cache: "no-store",
  });

  const text = await response.text();

  let json: any = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    const clean = text.trim();
    const startObject = clean.indexOf("{");
    const startArray = clean.indexOf("[");
    const start =
      startObject >= 0 && startArray >= 0
        ? Math.min(startObject, startArray)
        : Math.max(startObject, startArray);
    const endObject = clean.lastIndexOf("}");
    const endArray = clean.lastIndexOf("]");
    const end = Math.max(endObject, endArray);

    if (start >= 0 && end >= start) {
      try {
        json = JSON.parse(clean.slice(start, end + 1));
      } catch {
        json = null;
      }
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    json,
    text,
  };
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const token = String(data.token || "").trim();
    const teamId = String(data.teamId || data.TEAM_ID || "").trim();
    const afterId = String(data.afterId || data.AFTER_ID || "").trim();

    if (!token) {
      return Response.json({ result: false, error: "Токен не передан" }, { status: 400 });
    }

    if (!teamId) {
      return Response.json({ result: false, error: "Команда не выбрана" }, { status: 400 });
    }

    const params: Record<string, string> = {
      token,
      TEAM_ID: teamId,
    };

    if (afterId) {
      params.AFTER_ID = afterId;
    }

    const candidates = [
      "https://itandsports.ru/chats/get_team_chat.php",
      "https://itandsports.ru/chats/get_team_messages.php",
      "https://itandsports.ru/chats/get_messages.php",
    ];

    const attempts = [];

    for (const url of candidates) {
      const result = await postForm(url, params);
      attempts.push({ url, status: result.status, ok: result.ok, raw: result.text.slice(0, 180) });

      if (result.ok && result.text && !result.text.toLowerCase().includes("not found")) {
        return Response.json({
          result: true,
          teamId,
          server: result.json,
          raw: result.text,
          source: url,
        });
      }
    }

    return Response.json({
      result: false,
      error: "Серверный endpoint истории сообщений пока не найден",
      attempts,
    });
  } catch (error: any) {
    return Response.json(
      {
        result: false,
        error: error?.message || "Ошибка загрузки сообщений",
      },
      { status: 500 }
    );
  }
}
