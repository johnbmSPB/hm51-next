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

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    json,
    text,
    url,
  };
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const token = String(data.token || "").trim();
    const eventId = String(data.eventId || "").trim();
    const memberId = String(data.memberId || "").trim();
    const type = String(data.type || "game").trim();
    const agree = data.agree === "1" || data.agree === true ? "1" : "0";

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

    const params: Record<string, string> = {
      token,
      TOKEN: token,

      id: eventId,
      ID: eventId,
      event_id: eventId,
      EVENT_ID: eventId,

      game_id: eventId,
      GAME_ID: eventId,
      training_id: eventId,
      TRAINING_ID: eventId,

      member_id: memberId,
      MEMBER_ID: memberId,
      game_member_id: memberId,
      GAME_MEMBER_ID: memberId,
      training_member_id: memberId,
      TRAINING_MEMBER_ID: memberId,

      agree,
      AGREE: agree,
      will_go: agree,
      WILL_GO: agree,
      status: agree,
      STATUS: agree,
    };

    const endpoints =
      type === "training"
        ? [
            "https://itandsports.ru/trainings/set_training_agree.php",
            "https://itandsports.ru/trainings/set_agree.php",
          ]
        : [
            "https://itandsports.ru/games/set_game_agree.php",
            "https://itandsports.ru/games/set_agree.php",
          ];

    const attempts = [];

    for (const endpoint of endpoints) {
      const result = await postForm(endpoint, params);

      attempts.push({
        url: result.url,
        status: result.status,
        json: result.json,
      });

      if (result.ok && result.json?.result !== false) {
        return Response.json({
          result: true,
          agree,
          endpoint,
          server: result.json,
        });
      }
    }

    return Response.json(
      {
        result: false,
        error: "Сервер не принял отметку участия",
        attempts,
      },
      { status: 500 }
    );
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
