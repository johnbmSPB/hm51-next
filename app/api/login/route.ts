function findToken(data: any) {
  return (
    data?.new_token ||
    data?.NEW_TOKEN ||
    data?.token ||
    data?.TOKEN ||
    data?.access_token ||
    data?.ACCESS_TOKEN ||
    ""
  );
}

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

  return { response, json, text };
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const username = String(data.login || data.username || "").trim();
    const password = String(data.password || "").trim();

    if (!username) {
      return Response.json({ result: false, error: "Введите логин" }, { status: 400 });
    }

    if (!password) {
      return Response.json({ result: false, error: "Введите пароль" }, { status: 400 });
    }

    const loginResult = await postForm("https://itandsports.ru/users/new_token.php", {
      username,
      password,
    });

    if (!loginResult.response.ok) {
      return Response.json(
        { result: false, error: "Ошибка сервера входа", raw: loginResult.text },
        { status: loginResult.response.status }
      );
    }

    const token = findToken(loginResult.json);

    if (!loginResult.json?.result || !token) {
      const rawError = String(loginResult.json?.error || "").trim();

      let message = "Неверный логин или пароль";

      if (rawError.toLowerCase().includes("пользователь не найден")) {
        message = "Пользователь не найден";
      } else if (rawError) {
        message = rawError;
      }

      return Response.json({ result: false, error: message }, { status: 401 });
    }

    const profileResult = await postForm("https://itandsports.ru/start/about_me.php", {
      token,
    });

    if (!profileResult.response.ok) {
      return Response.json(
        { result: false, error: "Ошибка загрузки профиля" },
        { status: profileResult.response.status }
      );
    }

    if (profileResult.json?.result === false) {
      return Response.json(
        { result: false, error: profileResult.json?.error || "Профиль пользователя не найден" },
        { status: 401 }
      );
    }

    const firstTeam = Array.isArray(profileResult.json?.GAMER_TEAMS)
      ? profileResult.json.GAMER_TEAMS[0]
      : null;

    return Response.json({
      result: true,
      new_token: token,
      gamerTeamId: firstTeam?.GAMER_TEAM_ID || "",
      profile: profileResult.json,
    });
  } catch (error: any) {
    return Response.json(
      { result: false, error: error?.message || "Ошибка входа" },
      { status: 500 }
    );
  }
}
