export async function POST(request: Request) {
  try {
    const data = await request.json();

    const token = String(data.token || "").trim();
    const teamId = String(data.teamId || data.team_id || "").trim();
    const gameLevel = String(data.gameLevel || data.game_level || "").trim();

    if (!token) {
      return Response.json(
        { result: false, error: "Токен не передан" },
        { status: 400 }
      );
    }

    if (!teamId) {
      return Response.json(
        { result: false, error: "ID команды не передан" },
        { status: 400 }
      );
    }

    const body = new URLSearchParams();
    body.append("token", token);
    body.append("TEAM_ID", teamId);
    body.append("team_id", teamId);
    body.append("GAME_LEVEL", gameLevel);
    body.append("game_level", gameLevel);

    const response = await fetch("https://itandsports.ru/gamer-team/ask_join_to_team.php", {
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

    if (!response.ok || json?.RESULT === false || json?.result === false) {
      return Response.json(
        {
          result: false,
          error: json?.error || json?.TEXT_RESULT || "Не удалось подать заявку",
          raw: json,
        },
        { status: response.status || 400 }
      );
    }

    return Response.json({
      result: true,
      message: json?.TEXT_RESULT || json?.textResult || "Заявка отправлена",
      raw: json,
    });
  } catch (error: any) {
    return Response.json(
      {
        result: false,
        error: error?.message || "Ошибка подачи заявки",
      },
      { status: 500 }
    );
  }
}
