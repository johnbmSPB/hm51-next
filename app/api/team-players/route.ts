function toArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  if (typeof value === "object") {
    if (Array.isArray(value.PLAYERS)) return value.PLAYERS;
    if (Array.isArray(value.players)) return value.players;
    if (Array.isArray(value.GAMERS)) return value.GAMERS;
    if (Array.isArray(value.gamers)) return value.gamers;
    if (Array.isArray(value.USERS)) return value.USERS;
    if (Array.isArray(value.users)) return value.users;
    if (Array.isArray(value.TEAM_PLAYERS)) return value.TEAM_PLAYERS;
    if (Array.isArray(value.team_players)) return value.team_players;
    if (Array.isArray(value.DATA)) return value.DATA;
    if (Array.isArray(value.data)) return value.data;
    if (Array.isArray(value.RESULT)) return value.RESULT;
    if (Array.isArray(value.result)) return value.result;
  }

  return [];
}

async function postToServer(url: string, params: Record<string, string>) {
  const body = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    body.append(key, value);
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
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
    data: json,
    url,
  };
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const token = data.token || "";
    const teamId = String(data.teamId || "");

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

    const params: Record<string, string> = {
      token,
      TOKEN: token,
      new_token: token,
      NEW_TOKEN: token,

      team_id: teamId,
      TEAM_ID: teamId,
      id: teamId,
      ID: teamId,
    };

    const endpoints = [
      "https://itandsports.ru/teams/get_team_players.php",
      "https://itandsports.ru/teams/get_players.php",
      "https://itandsports.ru/teams/get_team_gamers.php",
      "https://itandsports.ru/gamer-team/get.php",
      "https://itandsports.ru/gamer_team/get.php"
    ];

    const attempts = [];

    for (const endpoint of endpoints) {
      const result = await postToServer(endpoint, params);
      const players = toArray(result.data);

      attempts.push({
        url: endpoint,
        status: result.status,
        data: result.data,
      });

      if (result.ok && players.length > 0) {
        return Response.json({
          result: true,
          players,
          endpoint,
        });
      }
    }

    return Response.json({
      result: true,
      players: [],
      debug: attempts,
    });
  } catch (error: any) {
    return Response.json(
      {
        result: false,
        error: error?.message || "Ошибка загрузки игроков",
      },
      { status: 500 }
    );
  }
}
