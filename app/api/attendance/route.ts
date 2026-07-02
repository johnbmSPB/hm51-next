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
    json = null;
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
    const eventId = String(data.eventId || "").trim();
    const memberId = String(data.memberId || "").trim();
    const type = String(data.type || "game").trim();

    const agree =
      data.agree === true ||
      data.agree === "true" ||
      data.agree === "1" ||
      data.agree === 1
        ? "true"
        : "false";

    if (!token) {
      return Response.json(
        { result: false, error: "Токен не передан" },
        { status: 400 }
      );
    }

    if (!eventId) {
      return Response.json(
        { result: false, error: "ID события не передан" },
        { status: 400 }
      );
    }

    const isTraining = type === "training";

    const url = isTraining
      ? "https://itandsports.ru/trainings/set_agree.php"
      : "https://itandsports.ru/games/set_game_agree.php";

    const paramName = isTraining ? "training_id" : "game_member";
    const idForServer = isTraining ? eventId : memberId;

    if (!isTraining && !idForServer) {
      return Response.json(
        {
          result: false,
          error: "Для игры не передан game_member",
          debug: {
            eventId,
            memberId,
            type,
          },
        },
        { status: 400 }
      );
    }

    const params: Record<string, string> = {
      token,
      agree,
      [paramName]: idForServer,
    };

    const result = await postForm(url, params);

    if (!result.ok || result.json?.result !== true) {
      return Response.json(
        {
          result: false,
          error: "Сервер не сохранил статус",
          server: result.json,
          raw: result.text,
          params,
        },
        { status: 500 }
      );
    }

    return Response.json({
      result: true,
      agree,
      server: result.json,
      params,
    });
  } catch (error: any) {
    return Response.json(
      {
        result: false,
        error: error?.message || "Ошибка отправки участия",
      },
      { status: 500 }
    );
  }
}
