type AppRole = "PLAYER" | "COACH";

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

function parseRoles(payload: any): AppRole[] {
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.roles)
      ? payload.roles
      : Array.isArray(payload?.ROLES)
        ? payload.ROLES
        : [];

  const roles = source.flatMap((item: any) => {
    const raw = String(item?.ROLE || item?.role || item || "").toUpperCase();

    if (raw === "TRAINER_ROLE" || raw === "COACH") return ["COACH" as const];
    if (raw === "GAMER_ROLE" || raw === "PLAYER") return ["PLAYER" as const];
    return [];
  });

  return Array.from(new Set(roles));
}

function chooseRedirect(roles: AppRole[]) {
  const hasPlayer = roles.includes("PLAYER");
  const hasCoach = roles.includes("COACH");

  if (hasPlayer && hasCoach) return "/role-select";
  if (hasCoach) return "/coach";
  return "/calendar";
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

    const rolesResult = await postForm("https://itandsports.ru/users/get_roles.php", {
      token,
    });

    let roles = rolesResult.response.ok ? parseRoles(rolesResult.json) : [];
    let profile: any = null;
    let gamerTeamId = "";

    if (roles.includes("PLAYER") || roles.length === 0) {
      const profileResult = await postForm("https://itandsports.ru/start/about_me.php", {
        token,
      });

      if (profileResult.response.ok && profileResult.json?.result !== false) {
        profile = profileResult.json;

        const firstTeam = Array.isArray(profileResult.json?.GAMER_TEAMS)
          ? profileResult.json.GAMER_TEAMS[0]
          : null;

        gamerTeamId = String(firstTeam?.GAMER_TEAM_ID || "");

        if (profileResult.json?.GAMER && !roles.includes("PLAYER")) {
          roles = [...roles, "PLAYER"];
        }
      } else if (roles.length === 0) {
        return Response.json(
          {
            result: false,
            error:
              profileResult.json?.error ||
              "Для учётной записи не найден профиль игрока или тренера",
          },
          { status: 401 }
        );
      }
    }

    roles = Array.from(new Set(roles));

    return Response.json({
      result: true,
      new_token: token,
      token,
      roles,
      redirect: chooseRedirect(roles),
      gamerTeamId,
      profile,
    });
  } catch (error: any) {
    return Response.json(
      { result: false, error: error?.message || "Ошибка входа" },
      { status: 500 }
    );
  }
}
